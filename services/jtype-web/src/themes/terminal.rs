use super::{escape_html, sanitize_footer, PageMeta, RenderContext, SiteTheme, ThemeInfo, WorkspaceMeta};

pub struct TerminalTheme;

const CSS: &str = r#"*,::before,::after{box-sizing:border-box}body{margin:0;background:#0d1117;color:#b3f0c0;font-family:'Courier New',Courier,ui-monospace,monospace}::selection{background:#1f4f36;color:#b3f0c0}a{color:#39d353;text-decoration:none}a:hover{text-decoration:underline;color:#7ee787}.scanline{position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.12) 2px,rgba(0,0,0,.12) 4px);z-index:9999}header.site-header{padding:20px 24px;border-bottom:1px solid #1f3d28;display:flex;align-items:center;gap:12px}.brand{color:#39d353;font-size:16px;font-weight:700;letter-spacing:.1em}.prompt{color:#39d353;margin-right:4px}.site-title{color:#b3f0c0;font-size:14px}.container{display:flex;min-height:calc(100vh - 49px)}aside{width:240px;border-right:1px solid #1f3d28;padding:16px 0;flex-shrink:0}.sidebar-section{padding:8px 12px;font-size:11px;color:#39d353;letter-spacing:.12em;text-transform:uppercase;margin-top:8px}.nav-link{display:block;padding:4px 16px;font-size:13px;color:#8dbba0;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nav-link:hover{color:#b3f0c0;background:#11191a}.nav-link.active{color:#39d353;background:#0f2118}.nav-link.active::before{content:'> '}.nav-folder-title{padding:8px 16px 2px;font-size:11px;color:#39d353;letter-spacing:.12em;text-transform:uppercase}main{flex:1;min-width:0;padding:32px 40px;max-width:840px}footer.site-footer{padding:20px 24px;border-top:1px solid #1f3d28;font-size:12px;color:#3a6645;font-family:'Courier New',Courier,monospace}.prose{font-size:14px;line-height:1.8}.prose h1{font-size:28px;color:#7ee787;font-weight:700;margin:0 0 24px;text-shadow:0 0 20px rgba(57,211,83,.3)}.prose h2{font-size:18px;color:#39d353;margin:28px 0 12px;border-bottom:1px solid #1f3d28;padding-bottom:4px}.prose h2::before{content:'## '}.prose h3{font-size:15px;color:#57d870;margin:20px 0 8px}.prose h3::before{content:'### '}.prose p{color:#b3f0c0;margin:0 0 16px}.prose a{color:#39d353}.prose pre{background:#010409;border:1px solid #1f3d28;border-left:3px solid #39d353;padding:16px;overflow:auto;font-size:13px;border-radius:0}.prose code{font-family:'Courier New',Courier,monospace;font-size:.9em}.prose :not(pre)>code{background:#0f2118;color:#7ee787;padding:2px 5px;border:1px solid #1f3d28}.prose blockquote{border-left:3px solid #39d353;margin-left:0;padding-left:16px;color:#57d870}.prose table{border-collapse:collapse;width:100%;font-size:13px}.prose th,.prose td{border:1px solid #1f3d28;padding:6px 10px}.prose th{color:#39d353;background:#0f2118}.prose .mermaid{margin:16px 0;padding:16px;border:1px solid #1f3d28;background:#010409}.user-index{max-width:760px;margin:0 auto;padding:48px 24px}.workspace-grid{display:grid;gap:12px;margin-top:24px}.workspace-card{display:block;padding:16px;border:1px solid #1f3d28;color:#b3f0c0;text-decoration:none}.workspace-card:hover{background:#0f1c14;border-color:#39d353}.workspace-card strong{display:block;font-size:16px;color:#7ee787;margin-bottom:4px}.workspace-card span{font-size:12px;color:#3a6645}@media(max-width:700px){.container{flex-direction:column}aside{width:auto;border-right:0;border-bottom:1px solid #1f3d28}main{padding:24px 16px}}"#;

const MERMAID: &str = r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:'strict',theme:'dark'});</script>"#;

impl SiteTheme for TerminalTheme {
    fn info(&self) -> ThemeInfo {
        ThemeInfo {
            id: "terminal",
            name: "Terminal",
            description: "Hacker aesthetic — dark background, green monospace, scanline effect.",
        }
    }

    fn render_page(&self, ctx: &RenderContext<'_>) -> String {
        let nav = build_nav(ctx.pages, ctx.current_page.relative_path.as_str());
        let footer = render_footer(ctx.footer_html);
        let body = ctx.content_html.replace("<pre><code class=\"language-mermaid\">", "<div class=\"mermaid\">").replace("</code></pre>", "</div>");
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style>{mermaid}</head><body><div class="scanline"></div><header class="site-header"><div class="brand">[JTYPE]</div><span class="prompt">$</span><span class="site-title">{site}</span></header><div class="container"><aside><div class="sidebar-section">// pages</div>{nav}</aside><main><article class="prose">{body}</article></main></div>{footer}</body></html>"#,
            title = escape_html(ctx.site_name),
            css = CSS,
            mermaid = MERMAID,
            site = escape_html(ctx.site_name),
            nav = nav,
            body = body,
            footer = footer,
        )
    }

    fn render_workspace_index(&self, site_name: &str, footer_html: &str, _username: &str, _workspace_slug: &str, _workspace_title: &str, pages: &[PageMeta]) -> String {
        let nav = build_nav(pages, "");
        let footer = render_footer(footer_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{site}</title><style>{css}</style></head><body><div class="scanline"></div><header class="site-header"><div class="brand">[JTYPE]</div><span class="prompt">$</span><span class="site-title">{site}</span></header><div class="container"><aside><div class="sidebar-section">// pages</div>{nav}</aside><main><article class="prose"><h1>{site}</h1><p>Select a document.</p></article></main></div>{footer}</body></html>"#,
            site = escape_html(site_name),
            css = CSS,
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
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{u}</title><style>{css}</style></head><body><div class="scanline"></div><div class="user-index"><h1 style="color:#7ee787">{u}</h1><div class="workspace-grid">{cards}</div></div></body></html>"#,
            u = escape_html(username), css = CSS, cards = cards)
    }
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() { String::new() } else { format!(r#"<footer class="site-footer">{}</footer>"#, safe) }
}

fn build_nav(pages: &[PageMeta], active: &str) -> String {
    let mut html = String::new();
    for page in pages {
        let label = if page.title.is_empty() { &page.relative_path } else { &page.title };
        let is_active = page.relative_path == active;
        html.push_str(&format!(
            r#"<a class="nav-link{a}" href="{href}" title="{label}">{label}</a>"#,
            a = if is_active { " active" } else { "" },
            href = escape_html(&page.href),
            label = escape_html(label),
        ));
    }
    html
}
