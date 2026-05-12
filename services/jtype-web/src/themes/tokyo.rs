use super::{escape_html, sanitize_footer, PageMeta, RenderContext, SiteTheme, ThemeInfo, WorkspaceMeta};

pub struct TokyoTheme;

const CSS: &str = r#"*,::before,::after{box-sizing:border-box}body{margin:0;background:#1a1b26;color:#a9b1d6;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}::selection{background:#3d59a1;color:#c0caf5}a{color:#7aa2f7;text-decoration:none}a:hover{text-decoration:underline;color:#2ac3de}aside{position:fixed;inset:0 auto 0 0;width:260px;background:#16161e;border-right:1px solid #292e42;display:flex;flex-direction:column;overflow:hidden}.sidebar-header{padding:24px 20px 16px}.brand{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#565f89;margin-bottom:10px}.brand span{color:#bb9af7}.site-title{font-size:15px;font-weight:700;color:#c0caf5;line-height:1.3}.doc-count{font-size:12px;color:#565f89;margin-top:3px;display:block}.sidebar-nav{flex:1;overflow:auto;padding:0 8px 20px}ul{list-style:none;margin:0;padding:0}.nav-link{display:block;border-radius:8px;padding:5px 10px;font-size:13px;color:#a9b1d6;text-decoration:none;transition:color .15s,background .15s}.nav-link:hover{color:#c0caf5;background:#292e42}.nav-link.active{color:#7aa2f7;background:#1f2335;font-weight:600}.nav-folder>details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:5px;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#565f89;user-select:none;transition:color .15s}.nav-folder>details>summary:hover{color:#a9b1d6}.nav-folder>details>summary::-webkit-details-marker{display:none}.nav-chevron{width:10px;height:10px;flex-shrink:0;color:#565f89}main{margin-left:300px;max-width:860px;padding:48px 40px}footer.site-footer{margin-left:300px;padding:20px 40px;font-size:13px;color:#565f89;border-top:1px solid #292e42}.prose{font-size:16px;line-height:1.8}.prose h1{font-size:38px;font-weight:700;line-height:1.1;color:#c0caf5;margin:0 0 28px;letter-spacing:-.02em}.prose h2{font-size:22px;color:#7aa2f7;margin:36px 0 12px;border-bottom:1px solid #292e42;padding-bottom:6px}.prose h3{font-size:18px;color:#bb9af7;margin:24px 0 8px}.prose p{color:#a9b1d6;margin:0 0 18px}.prose a{color:#7aa2f7}.prose pre{background:#0d0e16;border:1px solid #292e42;border-radius:12px;padding:18px;overflow:auto;font-size:14px}.prose code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em}.prose :not(pre)>code{background:#24283b;color:#7dcfff;padding:2px 5px;border-radius:6px}.prose blockquote{border-left:4px solid #7aa2f7;margin-left:0;padding-left:16px;color:#565f89}.prose table{border-collapse:collapse;width:100%;font-size:14px}.prose th,.prose td{border:1px solid #292e42;padding:8px 12px}.prose th{background:#1f2335;color:#c0caf5}.prose .mermaid{background:#0d0e16;border:1px solid #292e42;border-radius:12px;padding:16px;margin:16px 0}.user-index{max-width:860px;margin:0 auto;padding:48px 40px}.workspace-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:28px}.workspace-card{display:flex;flex-direction:column;gap:6px;padding:18px;border:1px solid #292e42;border-radius:14px;background:#1f2335;color:#c0caf5;text-decoration:none;transition:border-color .15s,background .15s}.workspace-card:hover{border-color:#7aa2f7;background:#24283b}.workspace-card strong{font-size:16px;color:#c0caf5}.workspace-card span{font-size:12px;color:#565f89}@media(max-width:800px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid #292e42}main,footer.site-footer{margin-left:0;padding:28px 20px}.prose h1{font-size:28px}}"#;

const MERMAID: &str = r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:'strict',theme:'dark'});</script>"#;

const SVG_CHEVRON_RIGHT: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>"#;
const SVG_CHEVRON_DOWN: &str = r#"<svg class="nav-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>"#;

impl SiteTheme for TokyoTheme {
    fn info(&self) -> ThemeInfo {
        ThemeInfo {
            id: "tokyo",
            name: "Tokyo Night",
            description: "Deep blue palette, soft purple-blue accents, code-optimised.",
        }
    }

    fn render_page(&self, ctx: &RenderContext<'_>) -> String {
        let nav = build_nav(ctx.pages, ctx.current_page.relative_path.as_str());
        let footer = render_footer(ctx.footer_html);
        let body = ctx.content_html.replace("<pre><code class=\"language-mermaid\">", "<div class=\"mermaid\">").replace("</code></pre>", "</div>");
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style>{mermaid}</head><body><aside><div class="sidebar-header"><div class="brand"><span>[</span>JTYPE<span>]</span></div><div class="site-title">{site}</div><span class="doc-count">{count} page{pl}</span></div><nav class="sidebar-nav">{nav}</nav></aside><main><article class="prose">{body}</article></main>{footer}</body></html>"#,
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

    fn render_workspace_index(&self, site_name: &str, footer_html: &str, _username: &str, _workspace_slug: &str, _workspace_title: &str, pages: &[PageMeta]) -> String {
        let nav = build_nav(pages, "");
        let footer = render_footer(footer_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{site}</title><style>{css}</style></head><body><aside><div class="sidebar-header"><div class="brand"><span>[</span>JTYPE<span>]</span></div><div class="site-title">{site}</div><span class="doc-count">{count} page{pl}</span></div><nav class="sidebar-nav">{nav}</nav></aside><main><article class="prose"><h1>{site}</h1><p>Select a page from the sidebar.</p></article></main>{footer}</body></html>"#,
            site = escape_html(site_name),
            css = CSS,
            count = pages.len(),
            pl = if pages.len() == 1 { "" } else { "s" },
            nav = nav,
            footer = footer,
        )
    }

    fn render_user_index(&self, username: &str, workspaces: &[WorkspaceMeta]) -> String {
        let cards = workspaces.iter().map(|w| {
            format!(r#"<a class="workspace-card" href="{href}"><strong>{title}</strong><span>{count} page{pl}</span></a>"#,
                href = escape_html(&w.href), title = escape_html(&w.title),
                count = w.page_count, pl = if w.page_count == 1 { "" } else { "s" })
        }).collect::<String>();
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{u}</title><style>{css}</style></head><body><div class="user-index"><h1 style="font-size:38px;color:#c0caf5;margin-bottom:8px">{u}</h1><div class="workspace-grid">{cards}</div></div></body></html>"#,
            u = escape_html(username), css = CSS, cards = cards)
    }
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() { String::new() } else { format!(r#"<footer class="site-footer">{}</footer>"#, safe) }
}

fn build_nav(pages: &[PageMeta], active: &str) -> String {
    enum NavNode<'a> { Folder { name: String, children: Vec<NavNode<'a>> }, Doc { page: &'a PageMeta } }
    fn insert_node<'a>(nodes: &mut Vec<NavNode<'a>>, parts: &[&str], page: &'a PageMeta) {
        if parts.len() <= 1 { nodes.push(NavNode::Doc { page }); return; }
        let folder_name = parts[0];
        let idx = nodes.iter().position(|n| matches!(n, NavNode::Folder { name, .. } if name == folder_name));
        let idx = idx.unwrap_or_else(|| { nodes.push(NavNode::Folder { name: folder_name.to_string(), children: Vec::new() }); nodes.len() - 1 });
        if let NavNode::Folder { children, .. } = &mut nodes[idx] { insert_node(children, &parts[1..], page); }
    }
    fn render_nodes(nodes: &[NavNode<'_>], active: &str) -> String {
        if nodes.is_empty() { return String::new(); }
        let mut html = String::from("<ul>");
        for node in nodes {
            match node {
                NavNode::Folder { name, children } => {
                    let open = children.iter().any(|n| if let NavNode::Doc { page } = n { page.relative_path == active } else { false });
                    let chevron = if open { SVG_CHEVRON_DOWN } else { SVG_CHEVRON_RIGHT };
                    html.push_str(&format!(r#"<li class="nav-folder"><details{open}><summary>{chevron}{name}</summary>{children}</details></li>"#,
                        open = if open { " open" } else { "" },
                        chevron = chevron,
                        name = escape_html(name),
                        children = render_nodes(children, active)));
                }
                NavNode::Doc { page } => {
                    let label = if page.title.is_empty() { &page.relative_path } else { &page.title };
                    html.push_str(&format!(r#"<li><a class="nav-link{a}" href="{href}">{label}</a></li>"#,
                        a = if page.relative_path == active { " active" } else { "" },
                        href = escape_html(&page.href),
                        label = escape_html(label)));
                }
            }
        }
        html.push_str("</ul>");
        html
    }
    let mut root: Vec<NavNode<'_>> = Vec::new();
    for page in pages {
        let parts: Vec<&str> = page.relative_path.split('/').collect();
        insert_node(&mut root, &parts, page);
    }
    render_nodes(&root, active)
}
