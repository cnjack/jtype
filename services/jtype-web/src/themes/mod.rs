use crate::handlers::site::PageMeta;

/// Metadata about a workspace shown on the user index page.
pub struct WorkspaceMeta {
    pub slug: String,
    pub title: String,
    pub page_count: i64,
    pub href: String,
}

/// Data passed to a theme to render a single document page.
pub struct RenderContext<'a> {
    pub site_name: &'a str,
    pub footer_html: &'a str,
    pub workspace_title: &'a str,
    pub workspace_slug: &'a str,
    pub username: &'a str,
    pub pages: &'a [PageMeta],
    pub current_page: &'a PageMeta,
    pub content_html: &'a str,
}

/// Static info about a theme, returned by the themes API.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
}

/// A site theme: produces complete HTML strings for each page type.
pub trait SiteTheme: Send + Sync {
    fn info(&self) -> ThemeInfo;
    /// Render a document page.
    fn render_page(&self, ctx: &RenderContext<'_>) -> String;
    /// Render the workspace-level index (list of pages).
    fn render_workspace_index(
        &self,
        site_name: &str,
        footer_html: &str,
        username: &str,
        workspace_slug: &str,
        workspace_title: &str,
        pages: &[PageMeta],
    ) -> String;
    /// Render the user-level index (list of workspaces).
    fn render_user_index(
        &self,
        username: &str,
        workspaces: &[WorkspaceMeta],
    ) -> String;
}

// ── Registry ────────────────────────────────────────────────────────────────

mod default;
mod academic;
mod terminal;
mod paper;
mod tokyo;

static DEFAULT_THEME: default::DefaultTheme = default::DefaultTheme;
static ACADEMIC_THEME: academic::AcademicTheme = academic::AcademicTheme;
static TERMINAL_THEME: terminal::TerminalTheme = terminal::TerminalTheme;
static PAPER_THEME: paper::PaperTheme = paper::PaperTheme;
static TOKYO_THEME: tokyo::TokyoTheme = tokyo::TokyoTheme;

/// Return the theme for the given id, falling back to `default`.
pub fn get_theme(id: &str) -> &'static dyn SiteTheme {
    match id {
        "academic" => &ACADEMIC_THEME,
        "terminal" => &TERMINAL_THEME,
        "paper" => &PAPER_THEME,
        "tokyo" => &TOKYO_THEME,
        _ => &DEFAULT_THEME,
    }
}

/// Return info for all available themes.
pub fn list_themes() -> Vec<ThemeInfo> {
    vec![
        DEFAULT_THEME.info(),
        ACADEMIC_THEME.info(),
        TERMINAL_THEME.info(),
        PAPER_THEME.info(),
        TOKYO_THEME.info(),
    ]
}

/// Return true if `id` matches a registered theme.
pub fn is_valid_theme(id: &str) -> bool {
    matches!(id, "default" | "academic" | "terminal" | "paper" | "tokyo")
}

// ── Shared HTML helpers ──────────────────────────────────────────────────────

pub fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Sanitise footer_html: allow only a small allowlist of inline tags.
/// Anything not in the allowlist is stripped (tags removed, text kept).
pub fn sanitize_footer(raw: &str) -> String {
    if raw.trim().is_empty() {
        return String::new();
    }
    // Strip disallowed tags while keeping their text content.
    // This is a simple implementation sufficient for footer use.
    let allowed = ["p", "a", "span", "br", "strong", "em", "small", "b", "i"];
    let mut out = String::with_capacity(raw.len());
    let mut chars = raw.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch != '<' {
            out.push(ch);
            continue;
        }
        // Collect tag
        let mut tag = String::new();
        let mut is_close = false;
        if chars.peek() == Some(&'/') {
            is_close = true;
            chars.next();
        }
        for c in chars.by_ref() {
            if c == '>' {
                break;
            }
            tag.push(c);
        }
        let tag_name = tag.split_whitespace().next().unwrap_or("").to_ascii_lowercase();
        if allowed.contains(&tag_name.as_str()) {
            out.push('<');
            if is_close { out.push('/'); }
            out.push_str(&tag);
            out.push('>');
        }
    }
    out
}
