---
version: alpha
name: JType
description: JType is a local-first Markdown vault with a calm, nature-inspired teal-and-stone interface. The app opens in three distinct modes — empty (welcome screen), workspace (sidebar + editor), or single-file (pure editor) — each with purpose-built surfaces. The design uses layered transparency (white/N% backgrounds), a signature teal primary accent (#008884), and green-tinted off-whites to create a serene, focused writing environment. The editor supports Write/Split/Preview modes with a live-rendered preview using morphdom incremental updates.

colors:
  primary: "#008884"
  primary-hover: "#006f6b"
  primary-soft: "#e8f6f2"
  primary-light: "#d9f2ed"
  on-primary: "#ffffff"
  app-bg: "#f5f8f6"
  surface: "#fbfdfb"
  surface-welcome: "#fbfaf7"
  surface-sidebar: "#f7faf8"
  surface-preview: "#f8fbf9"
  surface-panel: "#f6faf7"
  canvas: "#ffffff"
  ink-deep: "#0d0d0c"
  ink: "#111827"
  charcoal: "#4b5753"
  slate: "#5f6d68"
  steel: "#6b7773"
  stone: "#8a9691"
  muted: "#9aa6a1"
  on-dark: "#ffffff"
  hairline: "rgb(13 13 12 / 0.06)"
  hairline-soft: "rgb(13 13 12 / 0.04)"
  hairline-strong: "rgb(13 13 12 / 0.08)"
  brand-bracket: "#8d939d"
  brand-j: "#008884"
  brand-type: "#0d0d0c"
  amber-warning: "#fbbf24"
  amber-warning-deep: "#451a03"
  amber-bg: "#fffbeb"
  red-error: "#fca5a5"
  red-error-deep: "#450a0a"
  red-destructive: "#b91c1c"
  code-bg: "#101816"
  code-fg: "#f8fafc"
  code-inline-bg: "#e8f6f2"
  link: "#008884"

typography:
  hero-display:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.5px
  heading-1:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.035em
  heading-2:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-3:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  heading-4:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  subtitle:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-md-medium:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.6
  body-sm:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  body-sm-medium:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  caption-bold:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.04em
    textTransform: uppercase
  micro:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
  logo-header:
    fontFamily: "Arial Black, Segoe UI, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 900
    lineHeight: 1
  editor-mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.75
  preview-h1:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
  preview-h2:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.15
  preview-h3:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 19px
    fontWeight: 700
    lineHeight: 1.15
  preview-body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  full: 9999px

spacing:
  xxs: 4px
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  xxxl: 32px
  header: 64px
  sidebar: 272px
  panel: 340px
  editor-pad: 32px
  preview-pad: 40px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    border: "1px solid {colors.primary}"
    shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    borderColor: "{colors.primary-hover}"
  button-toolbar:
    backgroundColor: "rgba(255,255,255,0.8)"
    textColor: "{colors.ink-deep}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    border: "1px solid rgb(13 13 12 / 0.06)"
    shadow: "0 1px 2px 0 rgb(2 44 34 / 0.05)"
  button-toolbar-hover:
    backgroundColor: "{colors.canvas}"
    borderColor: "rgb(4 120 87 / 0.2)"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.slate}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  button-ghost-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    rounded: "{rounded.md}"
    padding: "6px"
  button-icon-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  button-account:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
    border: "1px solid rgb(13 13 12 / 0.06)"
    shadow: "0 1px 2px 0 rgb(2 44 34 / 0.05)"
  button-account-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
    borderColor: "rgb(0 136 132 / 0.3)"
  view-mode-pill:
    backgroundColor: "transparent"
    textColor: "{colors.slate}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  view-mode-pill-active:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary-hover}"
    shadow: "0 1px 2px 0 rgb(2 44 34 / 0.05)"
  input-field:
    backgroundColor: "rgba(255,255,255,0.8)"
    textColor: "{colors.ink-deep}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    border: "1px solid rgb(13 13 12 / 0.06)"
    height: 36px
  input-field-focus:
    backgroundColor: "{colors.canvas}"
    borderColor: "rgb(0 136 132 / 0.45)"
    ring: "4px solid rgb(0 136 132 / 0.1)"
  panel-card:
    backgroundColor: "rgba(255,255,255,0.8)"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    border: "1px solid rgba(255,255,255,0.8)"
    shadow: "0 1px 2px 0 rgb(2 44 34 / 0.05)"
    ring: "1px solid rgb(13 13 12 / 0.03)"
  document-info-card:
    backgroundColor: "rgba(255,255,255,0.8)"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    border: "1px solid rgba(255,255,255,0.8)"
    shadow: "0 1px 2px 0 rgb(2 44 34 / 0.05)"
    ring: "1px solid rgb(13 13 12 / 0.03)"
  tree-item:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  tree-item-hover:
    backgroundColor: "rgba(255,255,255,0.8)"
    textColor: "{colors.ink}"
  tree-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
    fontWeight: 600
    ring: "1px solid rgb(0 136 132 / 0.15)"
  status-chip-neutral:
    backgroundColor: "#edf1ef"
    textColor: "{colors.slate}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  status-chip-warning:
    backgroundColor: "{colors.amber-warning}"
    textColor: "{colors.amber-warning-deep}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  status-chip-success:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  status-chip-error:
    backgroundColor: "{colors.red-error}"
    textColor: "{colors.red-error-deep}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  modal-overlay:
    backgroundColor: "rgba(12, 10, 9, 0.25)"
    backdropFilter: "blur(4px)"
  modal-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0"
    border: "1px solid rgba(255,255,255,0.7)"
    shadow: "0 25px 50px -12px rgb(28 25 23 / 0.2)"
  context-menu:
    backgroundColor: "#fafaf9"
    rounded: "{rounded.md}"
    padding: "4px"
    border: "1px solid #e7e5e4"
    shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)"
  user-avatar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 36px
    shadow: "0 1px 2px 0 rgb(0 136 132 / 0.2)"
  editor-workspace:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-deep}"
  preview-workspace:
    backgroundColor: "{colors.surface-preview}"
    textColor: "{colors.ink-deep}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.code-fg}"
    rounded: "{rounded.lg}"
    padding: "16px"
  inline-code:
    backgroundColor: "{colors.code-inline-bg}"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  blockquote:
    borderLeft: "4px solid {colors.primary}"
    textColor: "{colors.slate}"
    paddingLeft: "18px"
  link:
    textColor: "{colors.primary}"
    textDecoration: underline
  table-cell:
    border: "1px solid rgb(13 13 12 / 0.08)"
    padding: "10px 12px"
    textAlign: left
  welcome-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid #e7e5e4"
  conflict-card:
    backgroundColor: "{colors.amber-bg}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid #fde68a"
  workspace-row:
    backgroundColor: "rgba(255,255,255,0.8)"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    border: "1px solid rgb(13 13 12 / 0.06)"
  workspace-row-hover:
    backgroundColor: "{colors.primary-soft}"
    borderColor: "rgb(0 136 132 / 0.3)"
  workspace-row-bound:
    backgroundColor: "{colors.primary-soft}"
    borderColor: "rgb(0 136 132 / 0.3)"
    ring: "1px solid rgb(0 136 132 / 0.1)"
---

## Overview

JType presents itself as a calm, focused Markdown writing environment through a nature-inspired teal-and-stone visual identity. The app opens into one of three distinct modes: **empty mode** showing a centered welcome screen with bracketed `[J]TYPE` branding, **workspace mode** with a 272px sidebar file explorer and editor/workbench area, or **single-file mode** as a pure distraction-free editor. The entire interface avoids pure white in favor of layered green-tinted off-whites (`#fbfdfb`, `#f7faf8`, `#f8fbf9`) that create an organic, comfortable atmosphere for long-form writing.

The signature visual element is the bracketed `[J]TYPE` logotype: gray brackets (`{colors.brand-bracket}`) framing a teal "J" (`{colors.brand-j}`) and near-black "TYPE" (`{colors.brand-type}`). This appears in two contexts — a compact Arial Black version in the header (18px, weight 900) and a larger JetBrains Mono version on the welcome screen (28px, weight 700, -0.5px tracking).

The editor/workbench is the heart of the app, supporting **Write**, **Split**, and **Preview** view modes toggled via a pill-shaped segmented control. The editor uses a system monospace font at 13px with 1.75 line height, while the preview renders rich Markdown with syntax-highlighted code blocks, math (KaTeX), diagrams (Mermaid), and a warm `#008884` left-border on blockquotes. A 340px document info panel slides in from the right for frontmatter editing, outline navigation, and publish status.

**Key Characteristics:**
- Calm teal primary (`{colors.primary}`) on layered green-tinted off-white backgrounds
- Bracketed `[J]TYPE` monospace logotype as the brand anchor
- Three-mode layout system (empty / workspace / single-file) with distinct surfaces
- Frosted-glass header (`backdrop-blur-xl`, 85% opacity white)
- Live Markdown preview with morphdom incremental updates
- Pill-shaped view-mode toggle (Write/Split/Preview) in the editor toolbar
- Document info panel with frontmatter fields, outline, publish status, and links
- Cloud workspace binding with sync status chips (neutral/warning/success/error)
- Right-click context menus for file operations
- Command palette and quick switcher modal overlays

## Colors

### Primary & Brand
- **Teal** (`{colors.primary}`): Signature primary accent — CTAs, active states, links, status indicators. The app's recognizable signal color.
- **Teal Hover** (`{colors.primary-hover}`): Darker teal for hover/pressed states
- **Teal Soft** (`{colors.primary-soft}`): Light mint background for hover states, active tree items, bound workspaces
- **Teal Light** (`{colors.primary-light}`): Even lighter mint for success status chips
- **Brand Bracket** (`{colors.brand-bracket}`): Gray brackets in `[J]TYPE` logo
- **Brand J** (`{colors.brand-j}`): Teal "J" in logo
- **Brand TYPE** (`{colors.brand-type}`): Near-black "TYPE" in logo

### Surfaces
- **App Background** (`{colors.app-bg}`): Global app background (`#f5f8f6`) — light green-tinted white
- **Surface** (`{colors.surface}`): Editor/workbench background (`#fbfdfb`)
- **Surface Welcome** (`{colors.surface-welcome}`): Welcome screen background (`#fbfaf7`)
- **Surface Sidebar** (`{colors.surface-sidebar}`): Sidebar panel (`#f7faf8`)
- **Surface Preview** (`{colors.surface-preview}`): Preview panel (`#f8fbf9`)
- **Surface Panel** (`{colors.surface-panel}`): Document info panel (`#f6faf7`)
- **Canvas** (`{colors.canvas}`): Pure white for cards, inputs, dialogs

### Text
- **Ink Deep** (`{colors.ink-deep}`): Pure near-black for primary text (`#0d0d0c`)
- **Ink** (`{colors.ink}`): Standard headings (`#111827`)
- **Charcoal** (`{colors.charcoal}`): Secondary text, tree items (`#4b5753`)
- **Slate** (`{colors.slate}`): Tertiary text, status descriptions (`#5f6d68`)
- **Steel** (`{colors.steel}`): Muted labels, placeholders (`#6b7773`)
- **Stone** (`{colors.stone}`): Very muted text, icons (`#8a9691`)
- **Muted** (`{colors.muted}`): Disabled placeholders (`#9aa6a1`)
- **On Dark** (`{colors.on-dark}`): White text on dark surfaces

### Borders & Dividers
- **Hairline** (`{colors.hairline}`): Primary 1px borders (`rgb(13 13 12 / 0.06)`)
- **Hairline Soft** (`{colors.hairline-soft}`): Subtle dividers (`rgb(13 13 12 / 0.04)`)
- **Hairline Strong** (`{colors.hairline-strong}`): Input borders (`rgb(13 13 12 / 0.08)`)

### Semantic
- **Amber Warning** (`{colors.amber-warning}`): Dirty/unsaved indicator, conflicts
- **Amber Deep** (`{colors.amber-warning-deep}`): Warning text color
- **Red Error** (`{colors.red-error}`): Error states, destructive actions
- **Red Deep** (`{colors.red-error-deep}`): Error text color
- **Red Destructive** (`{colors.red-destructive}`): Trash/delete actions

### Code & Content
- **Code Background** (`{colors.code-bg}`): Dark `#101816` for code blocks
- **Code Foreground** (`{colors.code-fg}`): Light `#f8fafc` for code text
- **Inline Code Background** (`{colors.code-inline-bg}`): Mint `#e8f6f2` for inline code
- **Link** (`{colors.link}`): Teal `#008884` for all links

## Typography

### Font Families
- **System UI** (primary): `system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif` — used across all UI surfaces
- **JetBrains Mono** (logo): `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace` — welcome screen logo only
- **Arial Black** (header logo): `Arial Black, Segoe UI, Arial, sans-serif` — header logo only
- **Monospace** (editor): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` — editor textarea and code blocks

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 28px | 700 | 1.2 | -0.5px | Welcome screen `[J]TYPE` logo |
| `{typography.heading-1}` | 48px | 600 | 1.1 | -0.035em | Vault home title |
| `{typography.heading-2}` | 36px | 600 | 1.2 | -0.02em | Welcome screen heading |
| `{typography.heading-3}` | 24px | 600 | 1.3 | 0 | Section titles |
| `{typography.heading-4}` | 18px | 600 | 1.4 | 0 | Document filename, card titles |
| `{typography.subtitle}` | 14px | 400 | 1.6 | 0 | Descriptions, body text |
| `{typography.body-md}` | 14px | 400 | 1.6 | 0 | Primary UI body text |
| `{typography.body-md-medium}` | 14px | 500 | 1.6 | 0 | Button labels, emphasis |
| `{typography.body-sm}` | 13px | 400 | 1.5 | 0 | Secondary text, tree items |
| `{typography.body-sm-medium}` | 13px | 500 | 1.5 | 0 | Toolbar buttons, breadcrumbs |
| `{typography.caption}` | 12px | 400 | 1.4 | 0 | Labels, metadata |
| `{typography.caption-bold}` | 12px | 600 | 1.4 | 0.04em | Status chips (uppercase) |
| `{typography.micro}` | 11px | 500 | 1.3 | 0 | View mode buttons |
| `{typography.logo-header}` | 18px | 900 | 1 | 0 | Header `[J]TYPE` |
| `{typography.editor-mono}` | 13px | 400 | 1.75 | 0 | Editor textarea |
| `{typography.preview-h1}` | 32px | 700 | 1.15 | 0 | Preview H1 |
| `{typography.preview-h2}` | 24px | 700 | 1.15 | 0 | Preview H2 |
| `{typography.preview-h3}` | 19px | 700 | 1.15 | 0 | Preview H3 |
| `{typography.preview-body}` | 16px | 400 | 1.6 | 0 | Preview body text |

### Principles
- System font stack for all UI text; monospace reserved for editor and code
- Five-level text hierarchy using gray-green tints (not pure grays)
- 600 weight for headlines, 500 for buttons and emphasis, 400 for body
- Uppercase + letter-spacing for status chips and section labels
- Negative tracking on large headings for tighter, more refined appearance

## Layout

### App Architecture
The app uses a three-mode layout system controlled by CSS classes on the root `<div>`:

1. **Empty mode** (`app-empty`): Shows `WelcomeScreen` only, hides sidebar and sync panel
2. **Workspace mode** (`workspace-mode`): Sidebar (272px) + editor/workbench area
3. **Single-file mode** (`single-file-mode`): Editor only, no sidebar, no document panel
4. **Focus mode** (`focus-mode`): Hides sidebar and document panel, maximizes editor

### Root Grid Structure
```
<div> [mode classes] h-screen overflow-hidden bg-[#f5f8f6]
  <main> grid h-screen grid-rows-[auto_1fr]
    <Header />                    (64px fixed)
    <section> grid
      <Sidebar />                 (272px, workspace only)
      <WelcomeScreen />           (empty mode)
      <VaultHome />               (workspace, no file open)
      <EditorShell />             (file open)
    </section>
  </main>
  [Modals: CommandPalette, QuickSwitcher, CreateNoteDialog, AccountDialog]
</div>
```

### Spacing System
- **Base unit**: 4px
- **Header height**: 64px (`h-16`)
- **Sidebar width**: 272px
- **Document panel width**: 340px
- **Editor padding**: 32px (`p-8`)
- **Preview padding**: 40px (`p-10`)
- **Toolbar height**: 48px (`min-h-12`)
- **Document header**: 68px (`min-h-[68px]`)
- **Status bar**: ~40px
- **Modal max-width**: 672px (`max-w-2xl`) for command palette, 512px (`max-w-lg`) for account dialog

### Grid & Panel System
- Editor/workbench uses CSS Grid: `grid-cols-[minmax(0,1fr)_340px]` when document panel is open
- Editor/preview split: `grid-cols: minmax(0, 1fr) minmax(320px, 46%)`
- Welcome screen: centered column, `max-w-4xl`
- Vault home: `max-w-6xl`, two-column grid with documents and recent panels

### Z-Index Layers
- Context menus: z-50
- Modals/backdrop: z-50
- Header: default (sticky via grid layout)
- Document panel overlay (mobile): z-20
- Editor textarea: z-2
- Preview article: z-1

## Elevation & Depth

JType uses minimal, subtle elevation appropriate for a focused writing tool:

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow, hairline border | Default panels, tree items |
| 1 (subtle) | `0 1px 2px 0 rgb(2 44 34 / 0.05)` | Buttons, cards, panels |
| 2 (medium) | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Context menus |
| 3 (modal) | `0 25px 50px -12px rgb(28 25 23 / 0.2)` | Modal dialogs |
| 4 (overlay) | `-18px 0 40px rgb(28 25 23 / 0.12)` | Mobile document panel slide-over |

### Depth Principles
- No heavy shadows — the design relies on layered transparency for depth
- Multiple semi-transparent white layers (`bg-white/80`, `bg-white/70`, `bg-white/40`) create subtle visual separation
- `backdrop-blur-xl` on header and `backdrop-blur-sm` on modal overlays add atmospheric depth
- Status bar and header use `border-black/[0.04]` for hairline separation

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Tag chips, inline code |
| `{rounded.sm}` | 6px | Ghost buttons, context menu items |
| `{rounded.md}` | 8px | Buttons, inputs, tree items, cards |
| `{rounded.lg}` | 12px | Welcome card, code blocks |
| `{rounded.xl}` | 16px | Modal dialogs, panel cards, document info sections |
| `{rounded.xxl}` | 20px | — |
| `{rounded.full}` | 9999px | User avatar, account button, view-mode pills, status chips |

### Shape Philosophy
- Rectangular geometry with moderate rounding (8px–16px)
- Pills used only for view-mode toggles, avatars, and status chips
- No sharp corners — everything has at least 4px radius
- Document info cards use the largest radius (16px) to feel like distinct floating panels

## Components

### Buttons

**`button-primary`** — Teal primary action button.
- Background `{colors.primary}`, text `{colors.on-primary}`, border `{colors.primary}`
- Typography `{typography.body-md-medium}`, padding `8px 14px`, rounded `{rounded.md}`
- Shadow `0 1px 2px 0 rgb(2 44 34 / 0.05)`
- Hover: background `{colors.primary-hover}`, border `{colors.primary-hover}`

**`button-toolbar`** — Standard toolbar/sidebar action button.
- Background `rgba(255,255,255,0.8)`, text `{colors.ink-deep}`, border `1px solid rgb(13 13 12 / 0.06)`
- Typography `{typography.body-sm-medium}`, padding `8px 14px`, rounded `{rounded.md}`
- Hover: background `{colors.canvas}`, border `rgb(4 120 87 / 0.2)`, text `{colors.ink}`
- Disabled: opacity 50%, cursor not-allowed

**`button-ghost`** — Minimal ghost button for subtle actions.
- Background transparent, text `{colors.slate}`, rounded `{rounded.sm}`, padding `4px 8px`
- Hover: background `{colors.primary-soft}`, text `{colors.primary-hover}`

**`button-icon`** — Icon-only button (star, trash, info, focus).
- Background transparent, text `{colors.steel}`, rounded `{rounded.md}`, padding `6px`
- Hover: background `{colors.primary-soft}`, text `{colors.primary-hover}`

**`button-account`** — Pill-shaped user account button in header.
- Background `{colors.canvas}`, text `{colors.charcoal}`, rounded `{rounded.full}`
- Hover: background `{colors.primary-soft}`, text `{colors.primary-hover}`, border `rgb(0 136 132 / 0.3)`

**`view-mode-pill`** + **`view-mode-pill-active`** — View mode segmented control.
- Container: `rounded-full bg-[#eef5f1] p-1`
- Inactive: transparent background, text `{colors.slate}`, typography `{typography.micro}`
- Active: `{colors.canvas}` background, `{colors.primary-hover}` text, subtle shadow

### Inputs & Forms

**`input-field`** — Standard text input.
- Background `rgba(255,255,255,0.8)`, text `{colors.ink-deep}`, border `1px solid rgb(13 13 12 / 0.06)`
- Rounded `{rounded.md}`, padding `8px 12px`, height 36px
- Focus: background `{colors.canvas}`, border `rgb(0 136 132 / 0.45)`, ring `4px solid rgb(0 136 132 / 0.1)`
- Placeholder: `{colors.muted}` (`#9aa6a1`)

**`field-textarea`** — Multi-line text area for descriptions.
- Same styling as `input-field` but `min-h-20` (80px) and `p-3`

### Cards & Panels

**`panel-card`** — Generic content card with layered glass effect.
- Background `rgba(255,255,255,0.8)`, rounded `{rounded.xl}` (16px), padding `{spacing.md}` (12px)
- Border `1px solid rgba(255,255,255,0.8)`, shadow `0 1px 2px 0 rgb(2 44 34 / 0.05)`
- Ring `1px solid rgb(13 13 12 / 0.03)`

**`document-info-card`** — Document info panel section card.
- Same as `panel-card` but padding `{spacing.lg}` (16px) and `mb-4`
- Used for Properties, Outline, Publish, and Links sections

**`welcome-card`** — White card on welcome screen.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.lg}`
- Border `1px solid #e7e5e4`

**`conflict-card`** — Cloud sync conflict indicator.
- Background `{colors.amber-bg}`, rounded `{rounded.lg}`, padding `{spacing.lg}`
- Border `1px solid #fde68a`

### Navigation

**`tree-item`** + **`tree-item-hover`** + **`tree-item-active`** — Sidebar file tree node.
- Full-width flex row, rounded `{rounded.md}`, padding `8px 10px`
- Text `{colors.charcoal}`, typography `{typography.body-sm}`
- Hover: background `rgba(255,255,255,0.8)`, text `{colors.ink}`
- Active: background `{colors.primary-soft}`, text `{colors.primary-hover}`, weight 600, ring `1px solid rgb(0 136 132 / 0.15)`

**`workspace-row`** + **`workspace-row-hover`** + **`workspace-row-bound`** — Cloud workspace list item.
- Background `rgba(255,255,255,0.8)`, rounded `{rounded.md}`, padding `8px 12px`
- Hover: background `{colors.primary-soft}`, border `rgb(0 136 132 / 0.3)`
- Bound: background `{colors.primary-soft}`, border `rgb(0 136 132 / 0.3)`, ring `1px solid rgb(0 136 132 / 0.1)`

### Status Indicators

**`status-chip-neutral`** — Default/indeterminate state.
- Background `#edf1ef`, text `{colors.slate}`, rounded `{rounded.full}`, padding `4px 10px`
- Typography `{typography.caption-bold}` (11px uppercase)

**`status-chip-warning`** — Dirty/unsaved or conflict state.
- Background `{colors.amber-warning}`, text `{colors.amber-warning-deep}`

**`status-chip-success`** — Saved/synced state.
- Background `{colors.primary-light}`, text `{colors.primary-hover}`

**`status-chip-error`** — Error state.
- Background `{colors.red-error}`, text `{colors.red-error-deep}`

### Modals & Overlays

**`modal-overlay`** — Backdrop for all modals.
- Fixed full-screen, `bg-stone-950/25`, `backdrop-blur-sm`
- Content positioned with `pt-24` (96px top padding)

**`modal-card`** — Modal dialog container.
- Background `{colors.surface}`, rounded `{rounded.xl}` (16px)
- Border `1px solid rgba(255,255,255,0.7)`, shadow `0 25px 50px -12px rgb(28 25 23 / 0.2)`
- Max-width: 672px (command palette), 512px (account dialog)

**`context-menu`** — Right-click context menu.
- Fixed position, z-50, `min-w-52`
- Background `#fafaf9`, rounded `{rounded.md}`, padding `4px`
- Border `1px solid #e7e5e4`, shadow `0 20px 25px -5px rgb(0 0 0 / 0.1)`

### User Identity

**`user-avatar`** — Circular user avatar in header.
- Size 36px, rounded `{rounded.full}`
- Background `{colors.primary}`, text `{colors.on-primary}`, weight 600
- Shows uppercase first letter of username or "A"
- Shadow `0 1px 2px 0 rgb(0 136 132 / 0.2)`
- Hover: background `{colors.primary-hover}`

### Editor & Preview

**`editor-workspace`** — Editor textarea container.
- Background `{colors.surface}` (`#fbfdfb`)
- Textarea: `bg-white/40`, `p-8`, monospace 13px, leading-7, text `{colors.ink-deep}`
- No outline, no resize, `z-index: 2`

**`preview-workspace`** — Markdown preview panel.
- Background `{colors.surface-preview}` (`#f8fbf9`)
- Border-left `1px solid rgb(13 13 12 / 0.04)`
- Padding `40px`, `overflow-y-auto`
- H1: 32px/700, H2: 24px/700, H3: 19px/700
- Body: 16px/400, max-width 78ch
- Links: `{colors.link}` with underline
- Blockquotes: left border 4px `{colors.primary}`, text `{colors.slate}`

**`code-block`** — Fenced code block in preview.
- Background `{colors.code-bg}` (`#101816`), text `{colors.code-fg}`
- Rounded `{rounded.lg}` (14px), padding 16px
- Inline code: background `{colors.code-inline-bg}`, rounded `{rounded.sm}`

## Surfaces & Screens

### Welcome Screen (Empty Mode)
- Full-height scrollable, background `{colors.surface-welcome}`
- Centered content column (`max-w-4xl`)
- `[J]TYPE` logo in JetBrains Mono 28px
- Heading: "Create a vault or edit one Markdown file." (`text-3xl font-semibold`)
- Description text (`text-sm text-stone-600`)
- CTA row: "Use default vault" (primary), "Open vault", "Open Markdown file" (toolbar buttons)
- Recent files card: `welcome-card` with white background

### Vault Home (Workspace, No Document)
- Two-column grid (`lg:grid-cols-[minmax(0,1fr)_300px]`)
- Hero section: "VAULT READY" label (teal, uppercase, tracked), vault name (`text-4xl`), description with mono path
- Documents panel: `panel-card` listing up to 12 files as command rows
- Recent sidebar: `panel-card` with recent files list
- Status bar: `border-t border-black/[0.04] bg-white/70`

### Editor Shell (Document Open)
- **Document header** (68px): breadcrumbs + filename + star/trash icons + status chips
- **Toolbar** (48px): editor tools (B, I, Link, Code, Table, Math, Mermaid, Task) + view-mode pills + Info/Focus toggles
- **Workbench**: editor/preview split or single view
- **Document info panel** (340px): Properties, Outline, Publish, Links
- **Status bar**: file count, word count, vault path

### Sidebar (Workspace Mode)
- Fixed 272px width, background `{colors.surface-sidebar}`
- Header: vault name + path + "New note" button
- Search input: `input-field` with green focus ring
- File tree: `tree-item` components with indentation
- Favorites section with toggle
- Recent section (below divider)
- Trash section (below divider) with restore/empty actions

### Header
- 64px height, frosted glass (`bg-white/85 backdrop-blur-xl`)
- Border-bottom `1px solid rgb(13 13 12 / 0.04)`
- Left: `[J]TYPE` logo (Arial Black 18px) + breadcrumb (single-file mode)
- Right: action buttons (quick open, save, account avatar)
- Save button appears only when document is dirty

### Workspace Switcher And Settings
- Web and desktop app use a Notion-inspired workspace switcher as the first visible control in the workspace sidebar or workspace chrome.
- The switcher shows a square initial, current vault/cloud workspace name, secondary account/path text, and a small disclosure marker.
- Opening the switcher shows account actions, settings, workspace rows, and create/open workspace actions in one compact popover.
- Workspace settings use a large modal with a left navigation rail and right content pane rather than full-page tabs.
- Settings sections should group related surfaces:
  - Account/Profile: sign-in, service URL, sync actions
  - General: workspace name, publish title, storage, current vault binding
  - Domains: custom domain binding and SSL certificate controls
  - Trash/Conflicts: document recovery and merge-resolution flows
- The document editor header should stay compact and consistent across web and app: document title, relative path/public URL, dirty/saved status, publish status, and save/publish actions.

## Do's and Don'ts

### Do
- Use `{colors.primary}` (teal) as the primary CTA and active state color
- Apply layered transparency (`bg-white/80`, `bg-white/70`) for depth without hard edges
- Use `{colors.primary-soft}` for hover states on tree items and workspace rows
- Maintain the green-tinted off-white palette (`#fbfdfb`, `#f7faf8`, `#f8fbf9`) for organic feel
- Use `{rounded.md}` (8px) for buttons, `{rounded.xl}` (16px) for cards and modals
- Keep the `[J]TYPE` logotype consistent (gray brackets, teal J, dark TYPE)
- Use status chips for document state (neutral/warning/success/error)
- Apply `backdrop-blur` on header and modal overlays
- Use the monospace editor font (13px, 1.75 line height) for the writing surface

### Don't
- Don't use pure white (`#ffffff`) as a background — always tint with green
- Don't use heavy shadows or elevated cards — keep elevation minimal
- Don't use colors other than teal for primary actions (no blue, purple, or green buttons)
- Don't show sidebar or document panel in single-file or focus mode
- Don't use bright saturated colors for status indicators — keep amber, red, and teal muted
- Don't change the logo font (Arial Black in header, JetBrains Mono on welcome)

## Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | Single column, sidebar hidden, modal full-width |
| Tablet | 480 – 979px | Sidebar collapsible, document panel overlays |
| Desktop | ≥ 980px | Full layout with sidebar and document panel side-by-side |

### Touch Targets
- Buttons: 36px height minimum
- Tree items: full row clickable
- Status chips: 24px height
- View mode pills: 28px height

### Collapsing Strategy
- **Below 980px**: Document panel becomes absolute-positioned overlay (360px max, 92vw) with left shadow
- **Single-file mode**: Always hides sidebar and document panel regardless of breakpoint
- **Focus mode**: Always maximizes editor, hides all panels
- **Editor/Preview**: Stack vertically on very narrow viewports

## Animation & Motion

- **No keyframe animations** — all motion is via Tailwind `transition` (150ms ease)
- **Preview debounce**: 120ms (`setTimeout`) before re-rendering Markdown preview
- **File watcher debounce**: 300ms
- **Sync scroll**: `requestAnimationFrame` for smooth editor↔preview scroll synchronization
- **DOM updates**: `morphdom` for incremental preview patching (preserves scroll position)
- **Modals**: No entrance/exit animations — instant render/unrender
- **All interactive elements**: `transition` utility (150ms, cubic-bezier(0.4, 0, 0.2, 1))

## Iteration Guide

1. Focus on ONE mode at a time (empty / workspace / single-file)
2. Reference component names and tokens directly from the YAML frontmatter
3. Preserve the teal/stone color relationship — teal is the only accent
4. Use `{rounded.md}` for buttons, `{rounded.xl}` for cards and modals
5. Default to `{typography.body-md}` for UI text, `{typography.editor-mono}` for editor
6. Keep transparency layers consistent (`bg-white/80` for cards, `bg-white/40` for editor)
7. Maintain the three-mode layout system — don't mix surfaces across modes
8. Test in all three modes (empty, workspace with file, workspace without file, single-file, focus)

## Known Gaps

- Dark mode tokens not yet defined (the app currently has no dark mode)
- Animation/transition timings are all 150ms — no custom easing curves
- No loading/skeleton states documented for async operations
- Editor context menu (right-click) items are inline-SVG based, not icon-library based
- Mobile-specific interactions (swipe gestures) not implemented
- The app uses no icon library — all icons are Unicode characters or inline SVG
