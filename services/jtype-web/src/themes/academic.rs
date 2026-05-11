use super::{escape_html, sanitize_footer, PageMeta, RenderContext, SiteTheme, ThemeInfo, WorkspaceMeta};

pub struct AcademicTheme;

const CSS: &str = r#"*,::before,::after{box-sizing:border-box}body{margin:0;background:#fffef9;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif}header.site-header{border-bottom:1px solid #d4c9a8;padding:24px 0;text-align:center;margin-bottom:0}.site-header .brand{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#8a7c5a;margin-bottom:8px}.site-header .site-title{font-size:28px;font-weight:700;color:#1a1a1a;margin:0}nav.page-nav{border-bottom:1px solid #d4c9a8;padding:12px 0;text-align:center;font-size:14px}nav.page-nav a{color:#5a4a2a;text-decoration:none;margin:0 12px}nav.page-nav a:hover{text-decoration:underline}main{max-width:680px;margin:0 auto;padding:48px 24px}footer.site-footer{max-width:680px;margin:0 auto;padding:32px 24px;font-size:13px;color:#8a7c5a;border-top:1px solid #d4c9a8;font-family:Georgia,serif}.prose{font-size:17px;line-height:1.9}.prose h1{font-size:36px;line-height:1.15;font-weight:700;margin:0 0 32px;color:#1a1a1a}.prose h2{font-size:24px;margin:48px 0 16px;border-bottom:1px solid #d4c9a8;padding-bottom:6px}.prose h3{font-size:20px;margin:32px 0 12px}.prose p{margin:0 0 20px}.prose a{color:#5a4a2a}.prose pre{background:#f5f0e8;border-left:4px solid #d4c9a8;padding:16px;overflow:auto;font-size:14px}.prose code{font-family:ui-monospace,Consolas,monospace;font-size:.9em}.prose :not(pre)>code{background:#f5f0e8;padding:2px 5px}.prose blockquote{border-left:4px solid #d4c9a8;margin-left:0;padding-left:20px;color:#5a4a2a;font-style:italic}.prose table{border-collapse:collapse;width:100%;margin:24px 0}.prose th,.prose td{border:1px solid #d4c9a8;padding:8px 12px;text-align:left}.prose th{background:#f5f0e8;font-weight:600}.prose .mermaid{margin:24px 0;padding:16px;border:1px solid #d4c9a8;background:#faf7f0}.user-index{max-width:680px;margin:0 auto;padding:48px 24px}.workspace-grid{display:grid;gap:16px;margin-top:32px}.workspace-card{display:block;padding:20px;border:1px solid #d4c9a8;color:#1a1a1a;text-decoration:none}.workspace-card:hover{background:#f5f0e8}.workspace-card strong{display:block;font-size:18px;margin-bottom:4px}.workspace-card span{font-size:13px;color:#8a7c5a}@media(max-width:700px){main,footer.site-footer{padding:32px 16px}}"#;

const MERMAID: &str = r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:'strict',theme:'neutral'});</script>"#;

impl SiteTheme for AcademicTheme {
    fn info(&self) -> ThemeInfo {
        ThemeInfo {
            id: "academic",
            name: "Academic",
            description: "Serif typography, centered narrow column, scholarly style.",
        }
    }

    fn render_page(&self, ctx: &RenderContext<'_>) -> String {
        let footer = render_footer(ctx.footer_html);
        let body = ctx.content_html.replace("<pre><code class=\"language-mermaid\">", "<div class=\"mermaid\">").replace("</code></pre>", "</div>");
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — {site}</title><style>{css}</style>{mermaid}</head><body><header class="site-header"><div class="brand">[JTYPE]</div><div class="site-title">{site}</div></header><main><article class="prose">{body}</article></main>{footer}</body></html>"#,
            title = escape_html(&ctx.current_page.title),
            site = escape_html(ctx.site_name),
            css = CSS,
            mermaid = MERMAID,
            body = body,
            footer = footer,
        )
    }

    fn render_workspace_index(&self, site_name: &str, footer_html: &str, _username: &str, _workspace_slug: &str, workspace_title: &str, pages: &[PageMeta]) -> String {
        let links = pages.iter().map(|p| {
            format!(r#"<p><a href="{}">{}</a></p>"#, escape_html(&p.href), escape_html(if p.title.is_empty() { &p.relative_path } else { &p.title }))
        }).collect::<String>();
        let footer = render_footer(footer_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{site}</title><style>{css}</style></head><body><header class="site-header"><div class="brand">[JTYPE]</div><div class="site-title">{site}</div></header><main><article class="prose"><h1>{title}</h1>{links}</article></main>{footer}</body></html>"#,
            site = escape_html(site_name),
            css = CSS,
            title = escape_html(workspace_title),
            links = links,
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
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{u}</title><style>{css}</style></head><body><div class="user-index"><h1>{u}</h1><div class="workspace-grid">{cards}</div></div></body></html>"#,
            u = escape_html(username), css = CSS, cards = cards)
    }
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() { String::new() } else { format!(r#"<footer class="site-footer">{}</footer>"#, safe) }
}
