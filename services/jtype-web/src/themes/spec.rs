//! Theme specification: the data model that drives the theme engine.
//!
//! A `ThemeSpec` is both a compile-time preset (see `presets.rs`) and the shape
//! of a user-supplied custom theme deserialized from `sites.custom_theme`. All
//! fields are owned and `#[serde(default)]` so partial custom input still
//! produces a valid spec. Untrusted input is run through [`ThemeSpec::sanitize`]
//! which clamps numbers and rejects unsafe strings by falling back to defaults —
//! rendering must never fail on bad input.

use serde::{Deserialize, Serialize};

use super::escape_html;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Layout {
    #[default]
    Sidebar,
    Header,
    Minimal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Appearance {
    #[default]
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Density {
    Compact,
    #[default]
    Cozy,
    Comfortable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Palette {
    pub bg: String,
    pub surface: String,
    pub fg: String,
    pub muted: String,
    pub accent: String,
    pub accent_contrast: String,
    pub border: String,
    pub code_bg: String,
    pub code_fg: String,
    #[serde(default)]
    pub appearance: Appearance,
}

impl Default for Palette {
    fn default() -> Self {
        Palette {
            bg: "#fbfdfb".into(),
            surface: "#f7faf8".into(),
            fg: "#18181b".into(),
            muted: "#6f817a".into(),
            accent: "#008884".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(13,13,12,.08)".into(),
            code_bg: "#101816".into(),
            code_fg: "#f8fafc".into(),
            appearance: Appearance::Light,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Typography {
    pub body_font: String,
    pub heading_font: String,
    pub mono_font: String,
    pub base_size: u8,
    pub content_width: u16,
    pub line_height: f32,
    pub heading_weight: u16,
    pub letter_spacing: f32,
}

pub const SANS_STACK: &str =
    "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
pub const SERIF_STACK: &str = "Georgia,'Iowan Old Style','Times New Roman',Times,serif";
pub const MONO_STACK: &str = "ui-monospace,SFMono-Regular,'JetBrains Mono',Consolas,monospace";

impl Default for Typography {
    fn default() -> Self {
        Typography {
            body_font: SANS_STACK.into(),
            heading_font: SANS_STACK.into(),
            mono_font: MONO_STACK.into(),
            base_size: 16,
            content_width: 840,
            line_height: 1.75,
            heading_weight: 700,
            letter_spacing: -0.02,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Shape {
    pub radius: u8,
    pub border_width: u8,
    pub density: Density,
    pub sidebar_width: u16,
}

impl Default for Shape {
    fn default() -> Self {
        Shape {
            radius: 14,
            border_width: 1,
            density: Density::Cozy,
            sidebar_width: 272,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ThemeSpec {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub layout: Layout,
    #[serde(default)]
    pub palette: Palette,
    #[serde(default)]
    pub typography: Typography,
    #[serde(default)]
    pub shape: Shape,
    #[serde(default)]
    pub custom_css: String,
}

impl Default for ThemeSpec {
    fn default() -> Self {
        ThemeSpec {
            id: "custom".into(),
            name: "Custom".into(),
            description: String::new(),
            layout: Layout::default(),
            palette: Palette::default(),
            typography: Typography::default(),
            shape: Shape::default(),
            custom_css: String::new(),
        }
    }
}

impl ThemeSpec {
    /// Parse a user-supplied custom theme JSON and sanitize it. The resulting
    /// spec always has `id = "custom"` and only safe values.
    pub fn from_custom_json(json: &str) -> Result<ThemeSpec, serde_json::Error> {
        let mut spec: ThemeSpec = serde_json::from_str(json)?;
        spec.id = "custom".into();
        spec.sanitize();
        Ok(spec)
    }

    /// Clamp every numeric field and reject unsafe strings (falling back to the
    /// default value for that field). Idempotent.
    pub fn sanitize(&mut self) {
        let d = Palette::default();
        let p = &mut self.palette;
        p.bg = sane_color(&p.bg, &d.bg);
        p.surface = sane_color(&p.surface, &d.surface);
        p.fg = sane_color(&p.fg, &d.fg);
        p.muted = sane_color(&p.muted, &d.muted);
        p.accent = sane_color(&p.accent, &d.accent);
        p.accent_contrast = sane_color(&p.accent_contrast, &d.accent_contrast);
        p.border = sane_color(&p.border, &d.border);
        p.code_bg = sane_color(&p.code_bg, &d.code_bg);
        p.code_fg = sane_color(&p.code_fg, &d.code_fg);

        let t = &mut self.typography;
        let td = Typography::default();
        t.body_font = sane_font(&t.body_font, &td.body_font);
        t.heading_font = sane_font(&t.heading_font, &td.heading_font);
        t.mono_font = sane_font(&t.mono_font, &td.mono_font);
        t.base_size = t.base_size.clamp(13, 22);
        t.content_width = t.content_width.clamp(520, 1100);
        t.line_height = clamp_f32(t.line_height, 1.3, 2.2, td.line_height);
        t.heading_weight = (t.heading_weight / 100 * 100).clamp(400, 900);
        t.letter_spacing = clamp_f32(t.letter_spacing, -0.06, 0.12, td.letter_spacing);

        let s = &mut self.shape;
        s.radius = s.radius.min(28);
        s.border_width = s.border_width.min(3);
        s.sidebar_width = s.sidebar_width.clamp(200, 360);

        self.name = truncate(&self.name, 80);
        if self.name.trim().is_empty() {
            self.name = "Custom".into();
        }
        self.description = truncate(&self.description, 200);
        self.custom_css = sane_css(&self.custom_css);
    }

    /// Emit the `:root` CSS-variable block for this theme's tokens.
    pub fn css_vars(&self) -> String {
        let p = &self.palette;
        let t = &self.typography;
        let s = &self.shape;
        let (pad_y, gap): (f32, f32) = match s.density {
            Density::Compact => (4.0, 2.0),
            Density::Cozy => (6.0, 3.0),
            Density::Comfortable => (9.0, 5.0),
        };
        format!(
            "--bg:{bg};--surface:{surface};--fg:{fg};--muted:{muted};--accent:{accent};\
--accent-contrast:{ac};--border:{border};--code-bg:{cbg};--code-fg:{cfg};\
--body-font:{body};--heading-font:{heading};--mono-font:{mono};\
--base-size:{base}px;--content-width:{cw}px;--line-height:{lh};\
--heading-weight:{hw};--letter-spacing:{ls}em;\
--radius:{radius}px;--border-width:{bw}px;--sidebar-width:{sw}px;\
--nav-pad-y:{pad}px;--nav-gap:{gap}px",
            bg = p.bg,
            surface = p.surface,
            fg = p.fg,
            muted = p.muted,
            accent = p.accent,
            ac = p.accent_contrast,
            border = p.border,
            cbg = p.code_bg,
            cfg = p.code_fg,
            body = t.body_font,
            heading = t.heading_font,
            mono = t.mono_font,
            base = t.base_size,
            cw = t.content_width,
            lh = t.line_height,
            hw = t.heading_weight,
            ls = t.letter_spacing,
            radius = s.radius,
            bw = s.border_width,
            sw = s.sidebar_width,
            pad = pad_y,
            gap = gap,
        )
    }

    pub fn color_scheme(&self) -> &'static str {
        match self.palette.appearance {
            Appearance::Light => "light",
            Appearance::Dark => "dark",
        }
    }

    pub fn mermaid_theme(&self) -> &'static str {
        match self.palette.appearance {
            Appearance::Light => "neutral",
            Appearance::Dark => "dark",
        }
    }

    /// Escaped display name, safe for HTML text nodes.
    pub fn name_escaped(&self) -> String {
        escape_html(&self.name)
    }
}

// ── String / number sanitizers ────────────────────────────────────────────────

fn clamp_f32(v: f32, lo: f32, hi: f32, fallback: f32) -> f32 {
    if v.is_finite() {
        v.clamp(lo, hi)
    } else {
        fallback
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        s.chars().take(max).collect()
    }
}

/// Accept CSS colors we recognise: hex (#rgb/#rgba/#rrggbb/#rrggbbaa),
/// rgb()/rgba()/hsl()/hsla() functions, or a plain CSS named color. Anything
/// else (or content with CSS-breaking chars) falls back to `default`.
pub fn sane_color(value: &str, default: &str) -> String {
    let v = value.trim();
    if v.is_empty() || v.len() > 64 {
        return default.to_string();
    }
    // No characters that could break out of a `var()` / declaration context.
    if v.contains([';', '{', '}', '<', '>', '@', '\\', '/', '*']) {
        return default.to_string();
    }
    let lower = v.to_ascii_lowercase();
    let is_hex = lower.starts_with('#')
        && lower.len() >= 4
        && lower.len() <= 9
        && lower[1..].chars().all(|c| c.is_ascii_hexdigit());
    let is_fn = (lower.starts_with("rgb(")
        || lower.starts_with("rgba(")
        || lower.starts_with("hsl(")
        || lower.starts_with("hsla("))
        && lower.ends_with(')')
        && lower[..lower.len() - 1]
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '(' | ',' | '.' | '%' | ' ' | '-'));
    let is_named = lower.chars().all(|c| c.is_ascii_alphabetic()) && lower.len() <= 24;
    if is_hex || is_fn || is_named {
        v.to_string()
    } else {
        default.to_string()
    }
}

/// A font stack may contain letters, digits, spaces, quotes, commas, hyphens.
/// Anything else falls back to `default`.
pub fn sane_font(value: &str, default: &str) -> String {
    let v = value.trim();
    if v.is_empty()
        || v.len() > 200
        || !v
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | ',' | '\'' | '"' | '-' | '_'))
    {
        return default.to_string();
    }
    v.to_string()
}

/// Strip everything that could escape a `<style>` block or fetch external
/// resources. CSS cannot execute JS in modern browsers, but `</style>` could
/// inject markup and `@import` could leak/track — so we remove both.
pub fn sane_css(raw: &str) -> String {
    if raw.trim().is_empty() {
        return String::new();
    }
    let mut out = raw.to_string();
    // Remove dangerous at-rules / legacy expressions / closing tags first,
    // case-insensitively, while the markup is still intact.
    for needle in ["@import", "expression(", "javascript:", "</style", "<style"] {
        loop {
            let lower = out.to_ascii_lowercase();
            if let Some(pos) = lower.find(needle) {
                out.replace_range(pos..pos + needle.len(), "");
            } else {
                break;
            }
        }
    }
    // Then drop any stray angle brackets / backslashes so nothing can escape the
    // surrounding <style> element, and cap the length.
    out.chars()
        .filter(|c| !matches!(c, '<' | '>' | '\\'))
        .take(20_000)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn colors_validated() {
        assert_eq!(sane_color("#fff", "#000"), "#fff");
        assert_eq!(sane_color("#1a1b26", "#000"), "#1a1b26");
        assert_eq!(sane_color("rgba(13,13,12,.08)", "#000"), "rgba(13,13,12,.08)");
        assert_eq!(sane_color("rebeccapurple", "#000"), "rebeccapurple");
        // Injection attempts fall back.
        assert_eq!(sane_color("red;}body{x", "#000"), "#000");
        assert_eq!(sane_color("url(x)", "#000"), "#000");
        assert_eq!(sane_color("", "#000"), "#000");
    }

    #[test]
    fn fonts_validated() {
        assert_eq!(sane_font("Inter, sans-serif", "X"), "Inter, sans-serif");
        assert_eq!(sane_font("a{}b", "X"), "X");
        assert_eq!(sane_font("a;background:url(/x)", "X"), "X");
    }

    #[test]
    fn css_strips_breakouts() {
        let dirty = "body{color:red}</style><script>alert(1)</script>";
        let clean = sane_css(dirty);
        assert!(!clean.contains('<'));
        assert!(!clean.contains('>'));
        assert!(!clean.to_ascii_lowercase().contains("/style"));
        assert!(clean.contains("color:red"));
    }

    #[test]
    fn css_strips_import() {
        let clean = sane_css("@import url(evil); body{}");
        assert!(!clean.to_ascii_lowercase().contains("@import"));
    }

    #[test]
    fn numbers_clamped() {
        let mut spec = ThemeSpec {
            typography: Typography {
                base_size: 99,
                content_width: 9000,
                line_height: 50.0,
                heading_weight: 12345,
                letter_spacing: 99.0,
                ..Typography::default()
            },
            shape: Shape {
                radius: 200,
                border_width: 50,
                sidebar_width: 9000,
                ..Shape::default()
            },
            ..ThemeSpec::default()
        };
        spec.sanitize();
        assert_eq!(spec.typography.base_size, 22);
        assert_eq!(spec.typography.content_width, 1100);
        assert!((spec.typography.line_height - 2.2).abs() < 1e-6);
        assert_eq!(spec.typography.heading_weight, 900);
        assert_eq!(spec.shape.radius, 28);
        assert_eq!(spec.shape.border_width, 3);
        assert_eq!(spec.shape.sidebar_width, 360);
    }

    #[test]
    fn from_custom_json_forces_id() {
        let spec = ThemeSpec::from_custom_json(r#"{"id":"hacker","name":"My Theme"}"#).unwrap();
        assert_eq!(spec.id, "custom");
        assert_eq!(spec.name, "My Theme");
    }

    #[test]
    fn partial_json_uses_defaults() {
        let spec =
            ThemeSpec::from_custom_json(r##"{"palette":{"accent":"#ff0000"},"layout":"header"}"##)
                .unwrap();
        assert_eq!(spec.palette.accent, "#ff0000");
        assert_eq!(spec.palette.bg, Palette::default().bg);
        assert_eq!(spec.layout, Layout::Header);
    }
}
