//! The 12 built-in theme presets, expressed as [`ThemeSpec`] data.
//!
//! Adding a theme = add one `ThemeSpec` here and register it in [`BUILTINS`].
//! No DB, route, or renderer change required.

use super::spec::{
    Appearance, Density, Layout, Palette, Shape, ThemeSpec, Typography, MONO_STACK, SERIF_STACK,
};

/// Ordered list of built-in theme ids (also the order shown in the picker).
pub const BUILTIN_IDS: &[&str] = &[
    "default",
    "academic",
    "terminal",
    "paper",
    "tokyo",
    "dracula",
    "nord",
    "solarized",
    "forest",
    "sepia",
    "newsprint",
    "midnight",
];

pub fn is_builtin(id: &str) -> bool {
    BUILTIN_IDS.contains(&id)
}

/// Return a freshly-constructed spec for a built-in id, or `None`.
pub fn builtin(id: &str) -> Option<ThemeSpec> {
    let spec = match id {
        "default" => default_spec(),
        "academic" => academic(),
        "terminal" => terminal(),
        "paper" => paper(),
        "tokyo" => tokyo(),
        "dracula" => dracula(),
        "nord" => nord(),
        "solarized" => solarized(),
        "forest" => forest(),
        "sepia" => sepia(),
        "newsprint" => newsprint(),
        "midnight" => midnight(),
        _ => return None,
    };
    Some(spec)
}

/// All built-in specs in display order.
pub fn all() -> Vec<ThemeSpec> {
    BUILTIN_IDS.iter().filter_map(|id| builtin(id)).collect()
}

// ── Construction helpers ──────────────────────────────────────────────────────

fn spec(id: &str, name: &str, description: &str, layout: Layout, palette: Palette) -> ThemeSpec {
    ThemeSpec {
        id: id.into(),
        name: name.into(),
        description: description.into(),
        layout,
        palette,
        typography: Typography::default(),
        shape: Shape::default(),
        custom_css: String::new(),
    }
}

// ── Presets ───────────────────────────────────────────────────────────────────

pub fn default_spec() -> ThemeSpec {
    spec(
        "default",
        "JType Default",
        "Clean green-tinted tech theme with sidebar navigation.",
        Layout::Sidebar,
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
        },
    )
}

fn academic() -> ThemeSpec {
    let mut s = spec(
        "academic",
        "Academic",
        "Serif body, narrow column, top navigation — a journal-paper feel.",
        Layout::Header,
        Palette {
            bg: "#ffffff".into(),
            surface: "#fbfbfa".into(),
            fg: "#1a1a1a".into(),
            muted: "#6b6b6b".into(),
            accent: "#8b0000".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(0,0,0,.12)".into(),
            code_bg: "#f4f4f2".into(),
            code_fg: "#1a1a1a".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography = Typography {
        body_font: SERIF_STACK.into(),
        heading_font: SERIF_STACK.into(),
        mono_font: MONO_STACK.into(),
        base_size: 18,
        content_width: 720,
        line_height: 1.7,
        heading_weight: 700,
        letter_spacing: 0.0,
    };
    s
}

fn terminal() -> ThemeSpec {
    let mut s = spec(
        "terminal",
        "Terminal",
        "Monospace, dark, green-on-black hacker aesthetic with scanlines.",
        Layout::Sidebar,
        Palette {
            bg: "#0d1117".into(),
            surface: "#0a0e13".into(),
            fg: "#3ddc84".into(),
            muted: "#2f9c5c".into(),
            accent: "#39ff14".into(),
            accent_contrast: "#0d1117".into(),
            border: "rgba(57,255,20,.18)".into(),
            code_bg: "#05080b".into(),
            code_fg: "#3ddc84".into(),
            appearance: Appearance::Dark,
        },
    );
    s.typography = Typography {
        body_font: MONO_STACK.into(),
        heading_font: MONO_STACK.into(),
        mono_font: MONO_STACK.into(),
        base_size: 15,
        content_width: 820,
        line_height: 1.6,
        heading_weight: 700,
        letter_spacing: 0.0,
    };
    s.shape = Shape {
        radius: 0,
        border_width: 1,
        density: Density::Compact,
        sidebar_width: 260,
    };
    s.custom_css = "body{background-image:repeating-linear-gradient(0deg,rgba(57,255,20,.03) 0,rgba(57,255,20,.03) 1px,transparent 1px,transparent 3px)}.brand-type{color:var(--accent)}.prose h1,.prose h2,.prose h3{text-shadow:0 0 6px color-mix(in srgb,var(--accent) 40%,transparent)}".into();
    s
}

fn paper() -> ThemeSpec {
    let mut s = spec(
        "paper",
        "Paper",
        "Minimal white page, serif headings, wide margins — print-friendly.",
        Layout::Minimal,
        Palette {
            bg: "#ffffff".into(),
            surface: "#ffffff".into(),
            fg: "#222222".into(),
            muted: "#999999".into(),
            accent: "#111111".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(0,0,0,.1)".into(),
            code_bg: "#f6f6f6".into(),
            code_fg: "#222222".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography = Typography {
        body_font: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif".into(),
        heading_font: SERIF_STACK.into(),
        mono_font: MONO_STACK.into(),
        base_size: 18,
        content_width: 640,
        line_height: 1.8,
        heading_weight: 700,
        letter_spacing: -0.01,
    };
    s.shape = Shape {
        radius: 4,
        border_width: 1,
        density: Density::Comfortable,
        sidebar_width: 260,
    };
    s
}

fn tokyo() -> ThemeSpec {
    spec(
        "tokyo",
        "Tokyo Night",
        "Deep indigo background with soft violet-blue accents.",
        Layout::Sidebar,
        Palette {
            bg: "#1a1b26".into(),
            surface: "#16161e".into(),
            fg: "#c0caf5".into(),
            muted: "#787c99".into(),
            accent: "#7aa2f7".into(),
            accent_contrast: "#1a1b26".into(),
            border: "rgba(122,162,247,.18)".into(),
            code_bg: "#11121a".into(),
            code_fg: "#c0caf5".into(),
            appearance: Appearance::Dark,
        },
    )
}

fn dracula() -> ThemeSpec {
    spec(
        "dracula",
        "Dracula",
        "The classic dark palette with pink and purple highlights.",
        Layout::Sidebar,
        Palette {
            bg: "#282a36".into(),
            surface: "#21222c".into(),
            fg: "#f8f8f2".into(),
            muted: "#9aa0b5".into(),
            accent: "#bd93f9".into(),
            accent_contrast: "#282a36".into(),
            border: "rgba(189,147,249,.20)".into(),
            code_bg: "#1d1e26".into(),
            code_fg: "#f8f8f2".into(),
            appearance: Appearance::Dark,
        },
    )
}

fn nord() -> ThemeSpec {
    spec(
        "nord",
        "Nord",
        "Arctic, north-bluish palette — calm and low-contrast.",
        Layout::Sidebar,
        Palette {
            bg: "#2e3440".into(),
            surface: "#2b303b".into(),
            fg: "#e5e9f0".into(),
            muted: "#9099ab".into(),
            accent: "#88c0d0".into(),
            accent_contrast: "#2e3440".into(),
            border: "rgba(136,192,208,.20)".into(),
            code_bg: "#272c36".into(),
            code_fg: "#e5e9f0".into(),
            appearance: Appearance::Dark,
        },
    )
}

fn solarized() -> ThemeSpec {
    let mut s = spec(
        "solarized",
        "Solarized",
        "The famous warm beige Solarized Light with cyan accents.",
        Layout::Header,
        Palette {
            bg: "#fdf6e3".into(),
            surface: "#eee8d5".into(),
            fg: "#073642".into(),
            muted: "#93a1a1".into(),
            accent: "#268bd2".into(),
            accent_contrast: "#fdf6e3".into(),
            border: "rgba(7,54,66,.14)".into(),
            code_bg: "#eee8d5".into(),
            code_fg: "#073642".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography.base_size = 17;
    s.typography.content_width = 760;
    s
}

fn forest() -> ThemeSpec {
    let mut s = spec(
        "forest",
        "Forest",
        "Warm earthy greens with serif headings — organic and grounded.",
        Layout::Sidebar,
        Palette {
            bg: "#f5f3ec".into(),
            surface: "#ebe7da".into(),
            fg: "#2b2f26".into(),
            muted: "#6f7560".into(),
            accent: "#3d7a4e".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(43,47,38,.12)".into(),
            code_bg: "#23271f".into(),
            code_fg: "#e7ead9".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography.heading_font = SERIF_STACK.into();
    s.shape.radius = 10;
    s
}

fn sepia() -> ThemeSpec {
    let mut s = spec(
        "sepia",
        "Sepia",
        "Warm sepia reading theme, easy on the eyes for long-form prose.",
        Layout::Minimal,
        Palette {
            bg: "#f4ecd8".into(),
            surface: "#efe6cf".into(),
            fg: "#433422".into(),
            muted: "#9a8767".into(),
            accent: "#a6612b".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(67,52,34,.14)".into(),
            code_bg: "#e8dcc0".into(),
            code_fg: "#433422".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography = Typography {
        body_font: SERIF_STACK.into(),
        heading_font: SERIF_STACK.into(),
        mono_font: MONO_STACK.into(),
        base_size: 19,
        content_width: 680,
        line_height: 1.85,
        heading_weight: 700,
        letter_spacing: 0.0,
    };
    s.shape.density = Density::Comfortable;
    s
}

fn newsprint() -> ThemeSpec {
    let mut s = spec(
        "newsprint",
        "Newsprint",
        "High-contrast black-and-white editorial with a column rule.",
        Layout::Header,
        Palette {
            bg: "#ffffff".into(),
            surface: "#f2f2f2".into(),
            fg: "#0a0a0a".into(),
            muted: "#555555".into(),
            accent: "#0a0a0a".into(),
            accent_contrast: "#ffffff".into(),
            border: "rgba(0,0,0,.85)".into(),
            code_bg: "#f2f2f2".into(),
            code_fg: "#0a0a0a".into(),
            appearance: Appearance::Light,
        },
    );
    s.typography = Typography {
        body_font: SERIF_STACK.into(),
        heading_font: "'Times New Roman',Times,Georgia,serif".into(),
        mono_font: MONO_STACK.into(),
        base_size: 18,
        content_width: 760,
        line_height: 1.65,
        heading_weight: 900,
        letter_spacing: -0.01,
    };
    s.shape = Shape {
        radius: 0,
        border_width: 2,
        density: Density::Cozy,
        sidebar_width: 260,
    };
    s.custom_css = ".prose h1{border-bottom:3px double var(--fg);padding-bottom:.2em}.site-header{border-bottom-width:3px}.prose img{border-radius:0;filter:grayscale(.2)}".into();
    s
}

fn midnight() -> ThemeSpec {
    spec(
        "midnight",
        "Midnight",
        "Pure black-grey surfaces with a cool blue accent — modern dark.",
        Layout::Sidebar,
        Palette {
            bg: "#0b0c0e".into(),
            surface: "#131519".into(),
            fg: "#e6e7ea".into(),
            muted: "#878a92".into(),
            accent: "#4f8cff".into(),
            accent_contrast: "#0b0c0e".into(),
            border: "rgba(255,255,255,.08)".into(),
            code_bg: "#16181d".into(),
            code_fg: "#e6e7ea".into(),
            appearance: Appearance::Dark,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn twelve_builtins() {
        assert_eq!(BUILTIN_IDS.len(), 12);
        assert_eq!(all().len(), 12);
    }

    #[test]
    fn every_id_resolves_and_matches() {
        for id in BUILTIN_IDS {
            let s = builtin(id).expect("builtin must resolve");
            assert_eq!(&s.id, id);
            assert!(!s.name.is_empty());
        }
        assert!(builtin("nope").is_none());
    }

    #[test]
    fn known_legacy_ids_preserved() {
        for id in ["default", "academic", "terminal", "paper", "tokyo"] {
            assert!(is_builtin(id), "legacy id {id} must remain a builtin");
        }
    }
}
