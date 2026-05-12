use super::{escape_html, sanitize_footer, PageMeta, RenderContext, SiteTheme, ThemeInfo, WorkspaceMeta};

pub struct DefaultTheme;

const CSS: &str = r#"*,::before,::after{box-sizing:border-box}body{margin:0;background:#fbfdfb;color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}aside{position:fixed;inset:0 auto 0 0;width:272px;display:flex;flex-direction:column;min-height:0;border-right:1px solid rgba(13,13,12,.06);background:#f7faf8}.sidebar-header{padding:28px 24px 20px}.brand{font-family:'Arial Black','Segoe UI',Arial,sans-serif;font-size:20px;font-weight:900}.brand-bracket{color:#8d939d}.brand-j{color:#008884}.brand-type{color:#0d0d0c}.site-title{margin-top:16px;font-weight:700;font-size:15px;color:#18181b}.doc-count{display:block;margin-top:3px;font-size:12px;color:#8a9691}.sidebar-nav{flex:1;min-height:0;overflow:auto;padding:0 8px 24px}ul{list-style:none;margin:0;padding:0}.nav-link{display:block;border-radius:6px;padding:5px 10px;color:#52615c;text-decoration:none;font-size:14px;line-height:1.5;transition:color .1s,background .1s}.nav-link:hover{color:#18181b;background:rgba(255,255,255,.5)}.nav-link.active{color:#006f6b;font-weight:600}.nav-folder>details{margin:0}.nav-folder>details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:4px;border-radius:6px;padding:5px 10px;color:#3b4945;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;user-select:none;transition:color .1s}.nav-folder>details>summary:hover{color:#18181b}.nav-folder>details>summary::-webkit-details-marker{display:none}.nav-folder>details>ul{padding-left:0;margin-top:2px}.nav-chevron{width:10px;height:10px;flex-shrink:0;color:#a0a8a4}main{margin-left:320px;max-width:840px;padding:56px 40px}footer.site-footer{margin-left:320px;padding:24px 40px;font-size:13px;color:#8a9691;border-top:1px solid rgba(13,13,12,.06)}.workspace-index{margin-left:0;max-width:920px}.workspace-index h1{font-size:40px;letter-spacing:-.04em}.workspace-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.workspace-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid rgba(13,13,12,.06);border-radius:18px;background:#fff;color:#18181b;text-decoration:none;box-shadow:0 14px 40px rgba(15,23,42,.06)}.workspace-card span{font-size:13px;color:#6f817a}.prose{font-size:16px;line-height:1.75}.prose h1{font-size:40px;line-height:1.1;margin:0 0 28px}.prose h2{font-size:24px;margin:36px 0 12px}.prose h3{font-size:20px;margin:28px 0 10px}.prose p,.prose li{color:#3f3f46}.prose a{color:#008884}.prose pre{overflow:auto;border-radius:14px;background:#101816;color:#f8fafc;padding:18px}.prose code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.prose :not(pre)>code{border-radius:6px;background:#e8f6f2;padding:2px 5px;color:#0d0d0c}.prose blockquote{border-left:4px solid #008884;margin-left:0;padding-left:16px;color:#52615c}.prose table{border-collapse:collapse;width:100%}.prose .mermaid{max-width:100%;overflow:auto;margin:1rem 0;padding:12px;border:1px solid rgba(13,13,12,.06);border-radius:16px;background:#fff}.prose th,.prose td{border:1px solid rgba(13,13,12,.08);padding:8px 10px;text-align:left}@media(max-width:800px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid rgba(13,13,12,.06)}main,footer.site-footer{margin-left:0;padding:32px 20px}.prose h1{font-size:32px}}"#;

const MERMAID: &str = r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:'strict',theme:'neutral'});</script>"#;

const SVG_CHEVRON_RIGHT: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>"#;
const SVG_CHEVRON_DOWN: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>"#;

impl SiteTheme for DefaultTheme {
    fn info(&self) -> ThemeInfo {
        ThemeInfo {
            id: "default",
            name: "JType Default",
            description: "Clean green-tinted tech theme with sidebar navigation.",
        }
    }

    fn render_page(&self, ctx: &RenderContext<'_>) -> String {
        let nav = build_nav(ctx.pages, ctx.username, ctx.workspace_slug, ctx.current_page.relative_path.as_str());
        let footer = render_footer(ctx.footer_html);
        let body = prepare_mermaid(ctx.content_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style>{mermaid}</head><body><aside><div class="sidebar-header"><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><div class="site-title">{site}</div><span class="doc-count">{count} page{pl}</span></div><nav class="sidebar-nav">{nav}</nav></aside><main><article class="prose">{body}</article></main>{footer}</body></html>"#,
            title = escape_html(ctx.site_name),
            css = CSS,
            mermaid = MERMAID,
            site = escape_html(ctx.site_name),
            count = ctx.pages.len(),
            pl = if ctx.pages.len() == 1 { "" } else { "s" },
            nav = nav,
            body = body,
            footer = footer,
        )
    }

    fn render_workspace_index(&self, site_name: &str, footer_html: &str, username: &str, workspace_slug: &str, _workspace_title: &str, pages: &[PageMeta]) -> String {
        let nav = build_nav(pages, username, workspace_slug, "");
        let footer = render_footer(footer_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style></head><body><aside><div class="sidebar-header"><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><div class="site-title">{title}</div><span class="doc-count">{count} page{pl}</span></div><nav class="sidebar-nav">{nav}</nav></aside><main><article class="prose"><h1>{title}</h1><p>Select a page from the sidebar.</p></article></main>{footer}</body></html>"#,
            title = escape_html(site_name),
            css = CSS,
            count = pages.len(),
            pl = if pages.len() == 1 { "" } else { "s" },
            nav = nav,
            footer = footer,
        )
    }

    fn render_user_index(&self, username: &str, workspaces: &[WorkspaceMeta]) -> String {
        let cards = if workspaces.is_empty() {
            "<p>No published workspaces yet.</p>".to_string()
        } else {
            workspaces.iter().map(|w| {
                format!(r#"<a class="workspace-card" href="{href}"><strong>{title}</strong><span>{count} published page{pl}</span></a>"#,
                    href = escape_html(&w.href),
                    title = escape_html(&w.title),
                    count = w.page_count,
                    pl = if w.page_count == 1 { "" } else { "s" },
                )
            }).collect::<Vec<_>>().join("")
        };
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{u}</title><style>{css}</style></head><body><main class="workspace-index"><div class="brand"><span class="brand-bracket">[</span><span class="brand-j">J</span><span class="brand-type">TYPE</span><span class="brand-bracket">]</span></div><h1>{u}</h1><div class="workspace-grid">{cards}</div></main></body></html>"#,
            u = escape_html(username),
            css = CSS,
            cards = cards,
        )
    }
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() {
        String::new()
    } else {
        format!(r#"<footer class="site-footer">{}</footer>"#, safe)
    }
}

fn prepare_mermaid(html: &str) -> String {
    html.replace("<pre><code class=\"language-mermaid\">", "<div class=\"mermaid\">")
        .replace("</code></pre>", "</div>")
}

// ── Nav tree ────────────────────────────────────────────────────────────────

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
    let idx = nodes.iter().position(|n| matches!(n, NavNode::Folder { name, .. } if name == folder_name));
    let idx = if let Some(i) = idx {
        i
    } else {
        nodes.push(NavNode::Folder { name: folder_name.to_string(), children: Vec::new() });
        nodes.len() - 1
    };
    if let NavNode::Folder { children, .. } = &mut nodes[idx] {
        insert_node(children, &parts[1..], page);
    }
}

fn render_nodes(nodes: &[NavNode<'_>], username: &str, workspace_slug: &str, active: &str, depth: usize) -> String {
    if nodes.is_empty() { return String::new(); }
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
                    indent = indent,
                    chevron = chevron,
                    name = escape_html(name),
                    children = render_nodes(children, username, workspace_slug, active, depth + 1),
                ));
            }
            NavNode::Doc { page } => {
                let is_active = page.relative_path == active;
                let label = if page.title.is_empty() { &page.relative_path } else { &page.title };
                html.push_str(&format!(
                    r#"<li><a class="nav-link{a}" style="padding-left:{indent}rem" href="{href}">{label}</a></li>"#,
                    a = if is_active { " active" } else { "" },
                    indent = indent,
                    href = escape_html(&page.href),
                    label = escape_html(label),
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
                if !p.is_empty() { return p; }
            }
        }
    }
    String::new()
}
