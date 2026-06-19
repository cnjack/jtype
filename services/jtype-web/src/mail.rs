//! Outbound email via SMTP, behind `lettre`.
//!
//! Mirrors the object-storage module's shape (`storage.rs`): a resolved
//! [`SmtpConfig`] is built by the `settings` layer (DB → env → default); a
//! [`Mailer`] wraps a lettre transport; a [`SharedMailer`] is a hot-swappable
//! handle held in `AppState` so an admin save replaces the live transport with
//! no restart. When SMTP is unconfigured the shared handle is `None` and sends
//! fail with a clear error rather than panicking.
//!
//! Emails are rendered from the inline [`render_email`] helper — a compact,
//! brand-styled HTML template (no template engine dependency). The plain-text
//! alternative is always provided alongside.

use std::str::FromStr;
use std::sync::{Arc, RwLock};

use lettre::message::header::ContentType;
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::error::AppError;

/// How to speak TLS to the SMTP server.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Encryption {
    /// Upgrade to TLS via STARTTLS after connecting (port 587). The default.
    StartTls,
    /// Connect over an implicit TLS tunnel (port 465).
    Tls,
    /// No encryption (port 25, dev/local only).
    None,
}

impl Encryption {
    /// Parse `"starttls" | "tls" | "none"` (case-insensitive); defaults to
    /// StartTls for anything else.
    pub fn parse(s: &str) -> Self {
        match s.trim().to_ascii_lowercase().as_str() {
            "tls" | "ssl" | "implicit" => Encryption::Tls,
            "none" | "plain" | "off" => Encryption::None,
            _ => Encryption::StartTls,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Encryption::StartTls => "starttls",
            Encryption::Tls => "tls",
            Encryption::None => "none",
        }
    }
}

/// Resolved SMTP configuration. Built by the `settings` layer; this module
/// only consumes it. `host` empty means "SMTP not configured".
#[derive(Debug, Clone, Default)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    /// `From:` address for every outbound message.
    pub from: String,
    pub encryption: Encryption,
}

impl Default for Encryption {
    fn default() -> Self {
        Encryption::StartTls
    }
}

/// A configured, ready-to-send mailer. Cloneable so a handler can snapshot it
/// out of the [`SharedMailer`] under a brief read lock and send without holding
/// the lock across `.await`.
#[derive(Clone)]
pub struct Mailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

/// Shared, cloneable handle to the active mailer (or `None` when unconfigured).
/// Hot-swappable: an admin save replaces the inner transport at runtime.
pub type SharedMailer = Arc<RwLock<Option<Mailer>>>;

/// Wrap a mailer in a shared handle.
pub fn shared(mailer: Option<Mailer>) -> SharedMailer {
    Arc::new(RwLock::new(mailer))
}

fn parse_mailbox(addr: &str) -> Result<Mailbox, String> {
    let addr = addr.trim();
    if addr.is_empty() {
        return Err("from address is empty".into());
    }
    // Accept "Name <addr@host>" or bare "addr@host".
    Mailbox::from_str(addr).map_err(|e| format!("invalid address {addr:?}: {e}"))
}

/// Build a mailer from an explicit config, returning an error instead of
/// falling back. Used when applying admin settings so a broken config is
/// surfaced rather than silently disabling mail.
pub fn try_build(cfg: &SmtpConfig) -> Result<Mailer, String> {
    if cfg.host.trim().is_empty() {
        return Err("SMTP host is empty".into());
    }
    let from = parse_mailbox(&cfg.from)?;

    // All three constructors return an `AsyncSmtpTransportBuilder`; apply port
    // + TLS + credentials uniformly, then build once.
    use lettre::transport::smtp::client::Tls;
    let mut builder = match cfg.encryption {
        Encryption::Tls => AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)
            .map_err(|e| format!("SMTP relay build failed: {e}"))?,
        Encryption::StartTls => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.host)
            .map_err(|e| format!("SMTP starttls build failed: {e}"))?,
        Encryption::None => AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&cfg.host)
            .tls(Tls::None),
    };
    let port = if cfg.port == 0 { port_for(cfg.encryption) } else { cfg.port };
    builder = builder.port(port);

    if !cfg.username.trim().is_empty() {
        builder = builder.credentials(Credentials::new(
            cfg.username.clone(),
            cfg.password.clone(),
        ));
    }

    Ok(Mailer {
        transport: builder.build(),
        from,
    })
}

fn port_for(enc: Encryption) -> u16 {
    match enc {
        Encryption::Tls => 465,
        Encryption::StartTls => 587,
        Encryption::None => 25,
    }
}

/// Build a mailer from a config, returning `None` on failure. Used at startup,
/// where the server must come up even if SMTP is unreachable.
pub fn from_config(cfg: &SmtpConfig) -> Option<Mailer> {
    if cfg.host.trim().is_empty() {
        return None;
    }
    match try_build(cfg) {
        Ok(m) => {
            eprintln!("mail: SMTP configured for {} ({})", cfg.host, cfg.encryption.as_str());
            Some(m)
        }
        Err(e) => {
            eprintln!("mail: SMTP disabled — {e}");
            None
        }
    }
}

/// Verify the candidate mailer can reach the server before persisting it.
/// lettre's `test_connection` opens a TCP + TLS + auth handshake without
/// sending a message.
pub async fn probe(mailer: &Mailer) -> Result<(), String> {
    mailer
        .transport
        .test_connection()
        .await
        .map_err(|e| format!("SMTP connection check failed: {e}"))
        .and_then(|ok| {
            if ok {
                Ok(())
            } else {
                Err("SMTP connection check returned false".into())
            }
        })
}

/// An outbound email: a subject plus HTML and plain-text bodies.
pub struct OutboundEmail {
    pub subject: String,
    pub html: String,
    pub text: String,
}

impl Mailer {
    /// Send a pre-rendered email to `to`.
    pub async fn send(&self, to: &str, email: OutboundEmail) -> Result<(), AppError> {
        let to_mailbox = Mailbox::from_str(to)
            .map_err(|e| AppError::Server(format!("invalid recipient {to:?}: {e}")))?;
        let message = Message::builder()
            .from(self.from.clone())
            .to(to_mailbox)
            .subject(&email.subject)
            .multipart(
                lettre::message::MultiPart::alternative()
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(email.text),
                    )
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(email.html),
                    ),
            )
            .map_err(|e| AppError::Server(format!("email build failed: {e}")))?;
        self.transport
            .send(message)
            .await
            .map_err(|e| AppError::Server(format!("email send failed: {e}")))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Brand-styled HTML email templates (no template engine; inline render fn).
// ---------------------------------------------------------------------------

/// Brand palette — matches the app's design tokens (`shared/styles/tokens.css`).
const BRAND: &str = "#008884";
const BRAND_DARK: &str = "#006f6b";
const BRAND_LIGHT: &str = "#22b8ad";
const INK: &str = "#1c1917";
const INK_SOFT: &str = "#5f6d68";
const LINE: &str = "#e7eae8";
const BG: &str = "#f5f8f6";

/// Render a brand-styled email with a title, a body paragraph, an optional
/// primary button linking to `action_url`, and an optional large one-time code
/// (for OTP login). Produces both HTML and plain text.
pub fn render_email(
    title: &str,
    body_paragraphs: &[&str],
    action_label: Option<&str>,
    action_url: Option<&str>,
    code: Option<&str>,
) -> OutboundEmail {
    let paras_html = body_paragraphs
        .iter()
        .map(|p| format!("<p style=\"margin:0 0 14px;line-height:1.6\">{p}</p>"))
        .collect::<Vec<_>>()
        .join("\n          ");

    let button = match (action_label, action_url) {
        (Some(label), Some(url)) => format!(
            "<a href=\"{url}\" style=\"display:inline-block;background:{BRAND};color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px\">{label}</a>"
        ),
        _ => String::new(),
    };

    // Large monospace code block (OTP login). Rendered between the copy and the
    // button so it reads: greeting → "use this code" → THE CODE → (optional button).
    let code_html = match code {
        Some(c) => format!(
            "<p style=\"margin:18px 0 4px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:{INK};background:{BG};border:1px solid {LINE};border-radius:12px;padding:18px 12px;text-align:center\">{c}</p>"
        ),
        None => String::new(),
    };

    let html = format!(
        r#"<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:{BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:{INK}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG}">
      <tr>
        <td align="center" style="padding:40px 16px">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid {LINE};max-width:480px;width:100%">
            <tr>
              <td style="padding:32px 36px 8px">
                <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:18px;font-weight:700;letter-spacing:-0.3px">
                  <span style="color:{INK_SOFT}">[</span><span style="color:{BRAND_LIGHT}">J</span><span style="color:{INK}">TYPE</span><span style="color:{INK_SOFT}">]</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 36px 36px">
                <h1 style="margin:0 0 18px;font-size:20px;font-weight:700;color:{INK};line-height:1.3">{title}</h1>
                {paras_html}
                {code_html}
                {button}
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 28px">
                <hr style="border:none;border-top:1px solid {LINE};margin:0 0 16px" />
                <p style="margin:0;font-size:12px;color:{INK_SOFT};line-height:1.5"><span style="color:{BRAND_DARK};font-weight:600">JType</span> &middot; local-first Markdown</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"#
    );

    // Plain-text alternative: title, paragraphs, the bare code, then the action
    // URL (plain text can't render a button, so show the link).
    let mut text_lines = vec![title.to_string(), String::new()];
    text_lines.extend(body_paragraphs.iter().map(|s| s.to_string()));
    if let Some(c) = code {
        text_lines.push(String::new());
        text_lines.push(format!("Your code: {c}"));
    }
    if let Some(url) = action_url {
        text_lines.push(String::new());
        text_lines.push(url.to_string());
    }
    let text = text_lines.join("\n");

    OutboundEmail { subject: format!("JType — {title}"), html, text }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encryption_parse_roundtrip() {
        assert_eq!(Encryption::parse("starttls"), Encryption::StartTls);
        assert_eq!(Encryption::parse("TLS"), Encryption::Tls);
        assert_eq!(Encryption::parse("ssl"), Encryption::Tls);
        assert_eq!(Encryption::parse("none"), Encryption::None);
        // default fallback
        assert_eq!(Encryption::parse(""), Encryption::StartTls);
        assert_eq!(Encryption::parse("garbage"), Encryption::StartTls);
    }

    #[test]
    fn try_build_rejects_empty_host() {
        let cfg = SmtpConfig {
            host: String::new(),
            port: 587,
            username: String::new(),
            password: String::new(),
            from: "a@b.com".into(),
            encryption: Encryption::StartTls,
        };
        assert!(try_build(&cfg).is_err());
    }

    #[test]
    fn try_build_rejects_bad_from() {
        let cfg = SmtpConfig {
            host: "smtp.example.com".into(),
            port: 587,
            username: String::new(),
            password: String::new(),
            from: "not-an-address".into(),
            encryption: Encryption::StartTls,
        };
        assert!(try_build(&cfg).is_err());
    }

    #[test]
    fn try_build_ok_minimal() {
        let cfg = SmtpConfig {
            host: "smtp.example.com".into(),
            port: 0,
            username: String::new(),
            password: String::new(),
            from: "JType <noreply@example.com>".into(),
            encryption: Encryption::StartTls,
        };
        assert!(try_build(&cfg).is_ok());
    }

    #[test]
    fn render_email_includes_button_and_text_link() {
        let email = render_email(
            "Reset your password",
            &["We received a request to reset your password."],
            Some("Reset password"),
            Some("https://app.example.com/reset-password?token=abc"),
            None,
        );
        assert!(email.html.contains("Reset password"));
        assert!(email.html.contains("https://app.example.com/reset-password?token=abc"));
        assert!(email.html.contains(BRAND)); // brand color present
        // plain-text alternative carries the link
        assert!(email.text.contains("https://app.example.com/reset-password?token=abc"));
        assert!(email.subject == "JType — Reset your password");
    }

    #[test]
    fn render_email_without_action_has_no_button() {
        let email = render_email("Welcome", &["hi"], None, None, None);
        assert!(!email.html.contains("display:inline-block;background:"));
    }

    #[test]
    fn render_email_with_code_places_code_after_greeting() {
        let email = render_email(
            "Your JType login code",
            &["Hi jack,", "Use this 6-digit code to sign in."],
            None,
            None,
            Some("482915"),
        );
        // The code block is present and styled as the big monospace code.
        assert!(email.html.contains(">482915<"));
        assert!(email.html.contains("letter-spacing:8px"));
        // Code comes AFTER the greeting copy, not before it.
        let greeting_pos = email.html.find("Hi jack,").unwrap();
        let code_pos = email.html.find("482915").unwrap();
        assert!(code_pos > greeting_pos, "code must render after greeting");
        // Plain-text alternative carries the code too.
        assert!(email.text.contains("Your code: 482915"));
    }
}
