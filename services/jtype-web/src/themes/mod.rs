//! Theme engine: data-driven site themes.
//!
//! A theme is a [`ThemeSpec`] (design tokens + a [`Layout`] archetype). The
//! generic renderer in [`render`] turns any spec into HTML. Built-in themes are
//! presets ([`presets`]); custom themes are user JSON stored on the site and
//! validated through [`ThemeSpec::from_custom_json`].

use crate::handlers::site::PageMeta;

mod presets;
mod render;
pub mod spec;

pub use spec::{Appearance, Layout, ThemeSpec};

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

/// A small color sample so the frontend can draw a theme thumbnail without an
/// iframe round-trip.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Swatch {
    pub bg: String,
    pub fg: String,
    pub accent: String,
    pub surface: String,
}

/// Static info about a theme, returned by the themes API. Carries the legacy
/// `id`/`name`/`description` plus presentation hints for the picker.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub layout: Layout,
    pub appearance: Appearance,
    pub swatch: Swatch,
}

impl From<&ThemeSpec> for ThemeInfo {
    fn from(s: &ThemeSpec) -> Self {
        ThemeInfo {
            id: s.id.clone(),
            name: s.name.clone(),
            description: s.description.clone(),
            layout: s.layout,
            appearance: s.palette.appearance,
            swatch: Swatch {
                bg: s.palette.bg.clone(),
                fg: s.palette.fg.clone(),
                accent: s.palette.accent.clone(),
                surface: s.palette.surface.clone(),
            },
        }
    }
}

// ── Public engine API ─────────────────────────────────────────────────────────

/// Resolve the spec to render with. `theme_id == "custom"` uses `custom_theme`
/// JSON (falling back to the default if absent/invalid); a built-in id returns
/// its preset; anything unknown falls back to the default.
pub fn resolve(theme_id: &str, custom_theme: Option<&str>) -> ThemeSpec {
    if theme_id == "custom" {
        if let Some(json) = custom_theme {
            if let Ok(spec) = ThemeSpec::from_custom_json(json) {
                return spec;
            }
        }
        return presets::default_spec();
    }
    presets::builtin(theme_id).unwrap_or_else(presets::default_spec)
}

/// Full spec for a built-in id (used by `GET /api/themes/:id`).
pub fn builtin_spec(id: &str) -> Option<ThemeSpec> {
    presets::builtin(id)
}

pub fn render_page(spec: &ThemeSpec, ctx: &RenderContext<'_>) -> String {
    render::render_page(spec, ctx)
}

#[allow(clippy::too_many_arguments)]
pub fn render_workspace_index(
    spec: &ThemeSpec,
    site_name: &str,
    footer_html: &str,
    username: &str,
    workspace_slug: &str,
    workspace_title: &str,
    pages: &[PageMeta],
) -> String {
    render::render_workspace_index(
        spec,
        site_name,
        footer_html,
        username,
        workspace_slug,
        workspace_title,
        pages,
    )
}

pub fn render_user_index(spec: &ThemeSpec, username: &str, workspaces: &[WorkspaceMeta]) -> String {
    render::render_user_index(spec, username, workspaces)
}

/// Info for all built-in themes, in display order.
pub fn list_themes() -> Vec<ThemeInfo> {
    presets::all().iter().map(ThemeInfo::from).collect()
}

/// True if `id` is a registered built-in or the special `custom` sentinel.
pub fn is_valid_theme(id: &str) -> bool {
    id == "custom" || presets::is_builtin(id)
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
    let allowed = ["p", "a", "span", "br", "strong", "em", "small", "b", "i"];
    let mut out = String::with_capacity(raw.len());
    let mut chars = raw.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch != '<' {
            out.push(ch);
            continue;
        }
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
        let tag_name = tag
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();
        if allowed.contains(&tag_name.as_str()) {
            out.push('<');
            if is_close {
                out.push('/');
            }
            out.push_str(&tag);
            out.push('>');
        }
    }
    out
}
