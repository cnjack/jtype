use super::{escape_html, sanitize_footer, PageMeta, RenderContext, SiteTheme, ThemeInfo, WorkspaceMeta};

pub struct PaperTheme;

const CSS: &str = r#"*,::before,::after{box-sizing:border-box}body{margin:0;background:#fafaf8;color:#18171c;font-family:'Helvetica Neue',Arial,sans-serif}header.site-header{padding:40px 0 32px;text-align:center;border-bottom:2px solid #18171c}.brand{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#8a8890;margin-bottom:12px}.site-title{font-size:22px;font-weight:700;letter-spacing:-.01em}nav.toc{max-width:600px;margin:32px auto;padding:0 24px;font-size:14px}nav.toc a{color:#18171c;text-decoration:none;border-bottom:1px solid #d0cfd4;display:block;padding:8px 0}nav.toc a:hover{color:#4f4dbd}main{max-width:600px;margin:0 auto;padding:48px 24px 80px}footer.site-footer{max-width:600px;margin:0 auto;padding:24px 24px 48px;font-size:12px;color:#8a8890;border-top:1px solid #d0cfd4}.prose{font-size:16px;line-height:1.85}.prose h1{font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.1;margin:0 0 32px;color:#18171c;letter-spacing:-.03em}.prose h2{font-family:Georgia,'Times New Roman',serif;font-size:22px;margin:40px 0 14px;font-weight:700}.prose h3{font-size:17px;margin:28px 0 10px;font-weight:700}.prose p{margin:0 0 22px}.prose a{color:#4f4dbd;text-decoration:underline}.prose pre{background:#f0efeb;border:1px solid #d0cfd4;padding:16px;overflow:auto;font-size:13px}.prose code{font-family:ui-monospace,Consolas,monospace;font-size:.9em}.prose :not(pre)>code{background:#f0efeb;padding:2px 5px;border-radius:3px}.prose blockquote{border-left:3px solid #d0cfd4;margin-left:0;padding-left:20px;color:#5c5b61;font-style:italic}.prose table{border-collapse:collapse;width:100%;margin:24px 0;font-size:14px}.prose th,.prose td{border:1px solid #d0cfd4;padding:8px 12px}.prose th{background:#f0efeb}.prose .mermaid{margin:24px 0;padding:16px;border:1px solid #d0cfd4;background:#f0efeb}.user-index{max-width:600px;margin:0 auto;padding:48px 24px}.workspace-list{margin-top:24px;display:flex;flex-direction:column;gap:0}.workspace-item{display:flex;align-items:baseline;justify-content:space-between;padding:12px 0;border-bottom:1px solid #d0cfd4;text-decoration:none;color:#18171c}.workspace-item:hover .workspace-title{text-decoration:underline}.workspace-title{font-size:17px;font-weight:600}.workspace-count{font-size:13px;color:#8a8890}@media(max-width:640px){main,footer.site-footer,nav.toc{padding:32px 16px}.prose h1{font-size:28px}}"#;

const MERMAID: &str = r#"<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:'strict',theme:'neutral'});</script>"#;

impl SiteTheme for PaperTheme {
    fn info(&self) -> ThemeInfo {
        ThemeInfo {
            id: "paper",
            name: "Paper",
            description: "Minimal white space, 600px narrow column, mixed serif headings.",
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
            let label = if p.title.is_empty() { &p.relative_path } else { &p.title };
            format!(r#"<a class="toc-link" href="{}">{}</a>"#, escape_html(&p.href), escape_html(label))
        }).collect::<String>();
        let footer = render_footer(footer_html);
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{site}</title><style>{css} .toc-link{{display:block;padding:8px 0;border-bottom:1px solid #d0cfd4;color:#18171c;text-decoration:none}}.toc-link:hover{{color:#4f4dbd}}</style></head><body><header class="site-header"><div class="brand">[JTYPE]</div><div class="site-title">{site}</div></header><main><article class="prose"><h1>{title}</h1>{links}</article></main>{footer}</body></html>"#,
            site = escape_html(site_name),
            css = CSS,
            title = escape_html(workspace_title),
            links = links,
            footer = footer,
        )
    }

    fn render_user_index(&self, username: &str, workspaces: &[WorkspaceMeta]) -> String {
        let items = workspaces.iter().map(|w| {
            format!(r#"<a class="workspace-item" href="{href}"><span class="workspace-title">{title}</span><span class="workspace-count">{count} page{pl}</span></a>"#,
                href = escape_html(&w.href), title = escape_html(&w.title),
                count = w.page_count, pl = if w.page_count == 1 { "" } else { "s" })
        }).collect::<String>();
        format!(
            r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{u}</title><style>{css}</style></head><body><div class="user-index"><h1 style="font-size:32px;letter-spacing:-.03em;font-family:Georgia,serif">{u}</h1><div class="workspace-list">{items}</div></div></body></html>"#,
            u = escape_html(username), css = CSS, items = items)
    }
}

fn render_footer(raw: &str) -> String {
    let safe = sanitize_footer(raw);
    if safe.trim().is_empty() { String::new() } else { format!(r#"<footer class="site-footer">{}</footer>"#, safe) }
}
