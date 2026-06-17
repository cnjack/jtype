//! Generic theme renderer: turns any [`ThemeSpec`] + render context into HTML.
//!
//! One renderer serves every theme. Per-theme differences come entirely from
//! the spec's tokens (injected as `:root` CSS variables) plus the chosen
//! [`Layout`] archetype, which selects the page skeleton and structural CSS.

use super::spec::{Layout, ThemeSpec};
use super::{escape_html, sanitize_footer, PageMeta, RenderContext, WorkspaceMeta};

const SVG_CHEVRON_RIGHT: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>"#;
const SVG_CHEVRON_DOWN: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>"#;

const BRAND: &str = r#"<div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div>"#;

// ── Public entry points ───────────────────────────────────────────────────────

pub fn render_page(spec: &ThemeSpec, ctx: &RenderContext<'_>) -> String {
    let body = prepare_mermaid(ctx.content_html);
    let footer = render_footer(ctx.footer_html);
    let head = head(spec, ctx.site_name);
    let inner = match spec.layout {
        Layout::Sidebar => {
            let nav = build_nav(
                ctx.pages,
                ctx.username,
                ctx.workspace_slug,
                &ctx.current_page.relative_path,
            );
            format!(
                "<aside>{sidebar_head}<nav class=\"sidebar-nav\">{nav}</nav></aside><main><article class=\"prose\">{body}</article></main>{footer}",
                sidebar_head = sidebar_header(ctx.site_name, ctx.pages.len()),
                nav = nav,
                body = body,
                footer = footer,
            )
        }
        Layout::Header => {
            let nav = build_top_nav(ctx.pages, &ctx.current_page.relative_path);
            format!(
                "<header class=\"site-header\">{BRAND}<div class=\"site-title\">{site}</div><nav class=\"top-nav\">{nav}</nav></header><main><article class=\"prose\">{body}</article></main>{footer}",
                site = escape_html(ctx.site_name),
                nav = nav,
                body = body,
                footer = footer,
            )
        }
        Layout::Minimal => {
            let home = format!("/u/{}/{}", ctx.username, ctx.workspace_slug);
            format!(
                "<header class=\"minimal-header\"><a class=\"minimal-home\" href=\"{home}\">{site}</a></header><main><article class=\"prose\">{body}</article></main>{footer}",
                home = escape_html(&home),
                site = escape_html(ctx.site_name),
                body = body,
                footer = footer,
            )
        }
    };
    wrap(spec, &head, &inner)
}

pub fn render_workspace_index(
    spec: &ThemeSpec,
    site_name: &str,
    footer_html: &str,
    username: &str,
    workspace_slug: &str,
    _workspace_title: &str,
    pages: &[PageMeta],
) -> String {
    let footer = render_footer(footer_html);
    let head = head(spec, site_name);
    let intro = format!(
        "<h1>{}</h1><p>Select a page to begin.</p>",
        escape_html(site_name)
    );
    let inner = match spec.layout {
        Layout::Sidebar => {
            let nav = build_nav(pages, username, workspace_slug, "");
            format!(
                "<aside>{sidebar_head}<nav class=\"sidebar-nav\">{nav}</nav></aside><main><article class=\"prose\">{intro}</article></main>{footer}",
                sidebar_head = sidebar_header(site_name, pages.len()),
            )
        }
        Layout::Header => {
            let nav = build_top_nav(pages, "");
            format!(
                "<header class=\"site-header\">{BRAND}<div class=\"site-title\">{site}</div><nav class=\"top-nav\">{nav}</nav></header><main><article class=\"prose\">{intro}</article></main>{footer}",
                site = escape_html(site_name),
            )
        }
        Layout::Minimal => {
            let links = pages
                .iter()
                .map(|p| {
                    format!(
                        "<li><a href=\"{href}\">{label}</a></li>",
                        href = escape_html(&p.href),
                        label = escape_html(page_label(p)),
                    )
                })
                .collect::<String>();
            format!(
                "<header class=\"minimal-header\"><span class=\"site-title\">{site}</span></header><main><article class=\"prose\"><ul class=\"minimal-index\">{links}</ul></article></main>{footer}",
                site = escape_html(site_name),
            )
        }
    };
    wrap(spec, &head, &inner)
}

pub fn render_user_index(spec: &ThemeSpec, username: &str, workspaces: &[WorkspaceMeta]) -> String {
    let cards = if workspaces.is_empty() {
        "<p>No published workspaces yet.</p>".to_string()
    } else {
        workspaces
            .iter()
            .map(|w| {
                format!(
                    r#"<a class="workspace-card" href="{href}"><strong>{title}</strong><span>{count} published page{pl}</span></a>"#,
                    href = escape_html(&w.href),
                    title = escape_html(&w.title),
                    count = w.page_count,
                    pl = if w.page_count == 1 { "" } else { "s" },
                )
            })
            .collect::<String>()
    };
    let head = head(spec, username);
    let inner = format!(
        "<main class=\"workspace-index\">{BRAND}<h1>{u}</h1><div class=\"workspace-grid\">{cards}</div></main>",
        u = escape_html(username),
    );
    wrap(spec, &head, &inner)
}

// ── HTML scaffolding ──────────────────────────────────────────────────────────

fn wrap(spec: &ThemeSpec, head: &str, inner: &str) -> String {
    let layout_class = match spec.layout {
        Layout::Sidebar => "layout-sidebar",
        Layout::Header => "layout-header",
        Layout::Minimal => "layout-minimal",
    };
    format!(
        "<!doctype html><html lang=\"en\" style=\"color-scheme:{scheme}\">{head}<body class=\"{class}\">{inner}</body></html>",
        scheme = spec.color_scheme(),
        class = layout_class,
    )
}

fn head(spec: &ThemeSpec, title: &str) -> String {
    format!(
        "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>{title}</title><style>:root{{{vars}}}{base}{custom}</style>{mermaid}</head>",
        title = escape_html(title),
        vars = spec.css_vars(),
        base = BASE_CSS,
        custom = spec.custom_css,
        mermaid = mermaid_script(spec.mermaid_theme()),
    )
}

fn mermaid_script(theme: &str) -> String {
    format!(
        r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({{startOnLoad:true,securityLevel:'strict',theme:'{theme}'}});</script>"#,
    )
}

fn sidebar_header(site_name: &str, count: usize) -> String {
    format!(
        "<div class=\"sidebar-header\">{BRAND}<div class=\"site-title\">{site}</div><span class=\"doc-count\">{count} page{pl}</span></div>",
        site = escape_html(site_name),
        count = count,
        pl = if count == 1 { "" } else { "s" },
    )
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() {
        String::new()
    } else {
        format!(r#"<footer class="site-footer">{safe}</footer>"#)
    }
}

/// Convert mermaid fenced code blocks into `<div class="mermaid">` containers
/// for client-side rendering, leaving every other code block untouched.
///
/// `pulldown_cmark` emits a mermaid block as exactly
/// `<pre><code class="language-mermaid">…escaped source…</code></pre>`. We must
/// rewrite only the open/close tags of *that* block — an earlier version replaced
/// every `</code></pre>` with `</div>` unconditionally, which stripped the
/// closing tag off all `language-text`/`language-bash`/… blocks and made the
/// browser nest the rest of the document inside the first code block.
fn prepare_mermaid(html: &str) -> String {
    const OPEN: &str = "<pre><code class=\"language-mermaid\">";
    const CLOSE: &str = "</code></pre>";
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find(OPEN) {
        out.push_str(&rest[..start]);
        let after_open = &rest[start + OPEN.len()..];
        // The source is HTML-escaped, so the first CLOSE after OPEN is the real
        // end of this block (an inner `</code></pre>` cannot occur).
        match after_open.find(CLOSE) {
            Some(end) => {
                out.push_str("<div class=\"mermaid\">");
                out.push_str(&after_open[..end]);
                out.push_str("</div>");
                rest = &after_open[end + CLOSE.len()..];
            }
            None => {
                // Malformed (no closer) — emit untouched and stop.
                out.push_str(&rest[start..]);
                return out;
            }
        }
    }
    out.push_str(rest);
    out
}

fn page_label(p: &PageMeta) -> &str {
    if p.title.is_empty() {
        &p.relative_path
    } else {
        &p.title
    }
}

// ── Top nav (Header layout) ───────────────────────────────────────────────────

/// Flat horizontal nav of top-level pages (no nested folders).
fn build_top_nav(pages: &[PageMeta], active: &str) -> String {
    pages
        .iter()
        .filter(|p| !p.relative_path.contains('/'))
        .map(|p| {
            let is_active = p.relative_path == active;
            format!(
                "<a class=\"top-link{a}\" href=\"{href}\">{label}</a>",
                a = if is_active { " active" } else { "" },
                href = escape_html(&p.href),
                label = escape_html(page_label(p)),
            )
        })
        .collect()
}

// ── Nav tree (Sidebar layout) ─────────────────────────────────────────────────

enum NavNode<'a> {
    Folder { name: String, children: Vec<NavNode<'a>> },
    Doc { page: &'a PageMeta },
}

fn build_nav(pages: &[PageMeta], username: &str, workspace_slug: &str, active: &str) -> String {
    let mut root: Vec<NavNode<'_>> = Vec::new();
    for page in pages {
        let parts: Vec<&str> = page.relative_path.split('/').collect();
        insert_node(&mut root, &parts, page);
    }
    render_nodes(&root, username, workspace_slug, active, 0)
}

fn insert_node<'a>(nodes: &mut Vec<NavNode<'a>>, parts: &[&str], page: &'a PageMeta) {
    if parts.len() <= 1 {
        nodes.push(NavNode::Doc { page });
        return;
    }
    let folder_name = parts[0];
    let idx = nodes
        .iter()
        .position(|n| matches!(n, NavNode::Folder { name, .. } if name == folder_name));
    let idx = if let Some(i) = idx {
        i
    } else {
        nodes.push(NavNode::Folder {
            name: folder_name.to_string(),
            children: Vec::new(),
        });
        nodes.len() - 1
    };
    if let NavNode::Folder { children, .. } = &mut nodes[idx] {
        insert_node(children, &parts[1..], page);
    }
}

fn render_nodes(
    nodes: &[NavNode<'_>],
    username: &str,
    workspace_slug: &str,
    active: &str,
    depth: usize,
) -> String {
    if nodes.is_empty() {
        return String::new();
    }
    let indent = 0.625 + depth as f64 * 0.875;
    let mut html = String::from("<ul>");
    for node in nodes {
        match node {
            NavNode::Folder { name, children } => {
                let prefix = folder_prefix(children);
                let open = active.starts_with(&prefix);
                let chevron = if open { SVG_CHEVRON_DOWN } else { SVG_CHEVRON_RIGHT };
                html.push_str(&format!(
                    r#"<li class="nav-folder"><details{open}><summary class="nav-folder-name" style="padding-left:{indent}rem">{chevron}{name}</summary>{children}</details></li>"#,
                    open = if open { " open" } else { "" },
                    name = escape_html(name),
                    children = render_nodes(children, username, workspace_slug, active, depth + 1),
                ));
            }
            NavNode::Doc { page } => {
                let is_active = page.relative_path == active;
                html.push_str(&format!(
                    r#"<li><a class="nav-link{a}" style="padding-left:{indent}rem" href="{href}">{label}</a></li>"#,
                    a = if is_active { " active" } else { "" },
                    href = escape_html(&page.href),
                    label = escape_html(page_label(page)),
                ));
            }
        }
    }
    html.push_str("</ul>");
    html
}

fn folder_prefix(children: &[NavNode<'_>]) -> String {
    for child in children {
        match child {
            NavNode::Doc { page } => {
                if let Some(pos) = page.relative_path.rfind('/') {
                    return format!("{}/", &page.relative_path[..pos]);
                }
                return String::new();
            }
            NavNode::Folder { children: kids, .. } => {
                let p = folder_prefix(kids);
                if !p.is_empty() {
                    return p;
                }
            }
        }
    }
    String::new()
}

// ── Base structural stylesheet (token-driven) ─────────────────────────────────

const BASE_CSS: &str = r#"
*,::before,::after{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--body-font);font-size:var(--base-size);line-height:var(--line-height);-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.brand{font-family:'Arial Black','Segoe UI',Arial,sans-serif;font-size:20px;font-weight:900;letter-spacing:-.02em}
.brand-bracket{opacity:.5}
.brand-j{color:var(--accent)}
.brand-type{color:var(--fg)}
.site-title{font-weight:700;font-size:15px;color:var(--fg)}
.doc-count{display:block;margin-top:3px;font-size:12px;color:var(--muted)}
ul{list-style:none;margin:0;padding:0}
/* Sidebar layout */
.layout-sidebar aside{position:fixed;inset:0 auto 0 0;width:var(--sidebar-width);display:flex;flex-direction:column;min-height:0;border-right:var(--border-width) solid var(--border);background:var(--surface)}
.sidebar-header{padding:28px 24px 18px}
.sidebar-header .site-title{margin-top:16px}
.sidebar-nav{flex:1;min-height:0;overflow:auto;padding:0 8px 24px}
.nav-link{display:block;border-radius:calc(var(--radius) * .5);padding:var(--nav-pad-y) 10px;color:var(--muted);text-decoration:none;font-size:14px;line-height:1.5;transition:color .1s,background .1s}
.nav-link:hover{color:var(--fg);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.nav-link.active{color:var(--accent);font-weight:600;background:color-mix(in srgb,var(--accent) 12%,transparent)}
.nav-folder>details{margin:0}
.nav-folder>details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:4px;border-radius:calc(var(--radius) * .5);padding:var(--nav-pad-y) 10px;color:var(--fg);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;user-select:none}
.nav-folder>details>summary::-webkit-details-marker{display:none}
.nav-folder>details>ul{margin-top:2px}
.nav-chevron{width:10px;height:10px;flex-shrink:0;opacity:.6}
.layout-sidebar main{margin-left:var(--sidebar-width);max-width:var(--content-width);padding:56px 40px}
.layout-sidebar footer.site-footer{margin-left:var(--sidebar-width)}
/* Header layout */
.layout-header .site-header{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:20px 32px;border-bottom:var(--border-width) solid var(--border);background:var(--surface)}
.top-nav{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.top-link{padding:6px 12px;border-radius:calc(var(--radius) * .6);color:var(--muted);text-decoration:none;font-size:14px;font-weight:500}
.top-link:hover{color:var(--fg);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.top-link.active{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
.layout-header main{margin:0 auto;max-width:var(--content-width);padding:56px 32px}
/* Minimal layout */
.layout-minimal .minimal-header{max-width:var(--content-width);margin:0 auto;padding:40px 28px 0}
.minimal-home,.minimal-header .site-title{color:var(--muted);text-decoration:none;font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.layout-minimal main{margin:0 auto;max-width:var(--content-width);padding:32px 28px 64px}
.minimal-index li{margin:6px 0}
/* Footer */
footer.site-footer{padding:24px 40px;font-size:13px;color:var(--muted);border-top:var(--border-width) solid var(--border)}
.layout-header footer.site-footer,.layout-minimal footer.site-footer{max-width:var(--content-width);margin:0 auto}
/* User index */
.workspace-index{max-width:920px;margin:0 auto;padding:64px 32px}
.workspace-index h1{font-size:40px;letter-spacing:var(--letter-spacing);font-family:var(--heading-font)}
.workspace-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.workspace-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:var(--border-width) solid var(--border);border-radius:calc(var(--radius) + 4px);background:var(--surface);color:var(--fg);text-decoration:none}
.workspace-card span{font-size:13px;color:var(--muted)}
/* Prose */
.prose{font-size:var(--base-size);line-height:var(--line-height)}
.prose h1,.prose h2,.prose h3,.prose h4{font-family:var(--heading-font);font-weight:var(--heading-weight);letter-spacing:var(--letter-spacing);color:var(--fg)}
.prose h1{font-size:2.4em;line-height:1.12;margin:0 0 .7em}
.prose h2{font-size:1.55em;margin:1.6em 0 .5em}
.prose h3{font-size:1.25em;margin:1.4em 0 .4em}
.prose p,.prose li{color:var(--fg)}
.prose a{color:var(--accent);text-underline-offset:2px}
.prose img{max-width:100%;height:auto;border-radius:var(--radius)}
.prose figure{margin:1.5em 0}
.prose figcaption{font-size:.85em;color:var(--muted);text-align:center;margin-top:.5em}
.prose pre{overflow:auto;border-radius:var(--radius);border:var(--border-width) solid var(--border);background:var(--code-bg);color:var(--code-fg);padding:18px;font-family:var(--mono-font);font-size:.9em}
.prose code{font-family:var(--mono-font)}
.prose :not(pre)>code{border-radius:6px;background:color-mix(in srgb,var(--accent) 12%,transparent);padding:2px 5px;color:var(--fg);font-size:.88em}
.prose blockquote{border-left:3px solid var(--accent);margin-left:0;padding-left:16px;color:var(--muted)}
.prose hr{border:0;border-top:var(--border-width) solid var(--border);margin:2em 0}
.prose table{border-collapse:collapse;width:100%;font-size:.95em}
.prose th,.prose td{border:var(--border-width) solid var(--border);padding:8px 10px;text-align:left}
.prose th{background:color-mix(in srgb,var(--accent) 8%,transparent)}
.prose .mermaid{max-width:100%;overflow:auto;margin:1rem 0;padding:12px;border:var(--border-width) solid var(--border);border-radius:var(--radius);background:var(--surface)}
@media(max-width:800px){
.layout-sidebar aside{position:static;width:auto;border-right:0;border-bottom:var(--border-width) solid var(--border)}
.layout-sidebar main,.layout-sidebar footer.site-footer{margin-left:0;padding:32px 20px}
.prose h1{font-size:1.9em}
}
"#;

#[cfg(test)]
mod tests {
    use super::prepare_mermaid;

    #[test]
    fn leaves_plain_code_blocks_intact() {
        // Regression: previously `</code></pre>` was replaced unconditionally,
        // stripping the closing tag off every non-mermaid block.
        let html = "<pre><code class=\"language-text\">hello\nworld</code></pre>";
        assert_eq!(prepare_mermaid(html), html);
    }

    #[test]
    fn does_not_swallow_following_content() {
        let html = "<pre><code class=\"language-bash\">npm install</code></pre>\n<h2>Run</h2>\n<p>next</p>";
        let out = prepare_mermaid(html);
        // Every pre is still closed and the heading/paragraph remain siblings.
        assert_eq!(out.matches("<pre>").count(), out.matches("</pre>").count());
        assert!(out.contains("</code></pre>\n<h2>Run</h2>"));
        assert_eq!(out, html);
    }

    #[test]
    fn converts_only_mermaid_blocks() {
        let html = "<pre><code class=\"language-mermaid\">graph TD; A--&gt;B</code></pre>";
        assert_eq!(
            prepare_mermaid(html),
            "<div class=\"mermaid\">graph TD; A--&gt;B</div>"
        );
    }

    #[test]
    fn mixes_mermaid_and_plain_blocks() {
        let html = concat!(
            "<pre><code class=\"language-mermaid\">graph TD; A--&gt;B</code></pre>\n",
            "<pre><code class=\"language-rust\">fn main() {}</code></pre>"
        );
        let out = prepare_mermaid(html);
        assert!(out.contains("<div class=\"mermaid\">graph TD; A--&gt;B</div>"));
        assert!(out.contains("<pre><code class=\"language-rust\">fn main() {}</code></pre>"));
        // The plain block keeps a real closing tag.
        assert_eq!(out.matches("<pre>").count(), 1);
        assert_eq!(out.matches("</pre>").count(), 1);
    }

    #[test]
    fn handles_multiple_mermaid_blocks() {
        let html = concat!(
            "<pre><code class=\"language-mermaid\">a</code></pre>",
            "<p>mid</p>",
            "<pre><code class=\"language-mermaid\">b</code></pre>"
        );
        assert_eq!(
            prepare_mermaid(html),
            "<div class=\"mermaid\">a</div><p>mid</p><div class=\"mermaid\">b</div>"
        );
    }
}
