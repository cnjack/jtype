import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import { parseFrontmatter } from "./frontmatter";

marked.use({ gfm: true, breaks: false });

let mermaidRenderer: Awaited<typeof import("mermaid")>["default"] | null = null;

function renderMath(content: string) {
  const withBlocks = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expression: string) => {
    try {
      return `<div class="math-block">${katex.renderToString(expression.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<pre><code>${escapeHtmlSimple(expression.trim())}</code></pre>`;
    }
  });

  return withBlocks.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_match, prefix: string, expression: string) => {
    try {
      return `${prefix}${katex.renderToString(expression.trim(), { displayMode: false, throwOnError: false })}`;
    } catch {
      return `${prefix}$${expression}$`;
    }
  });
}

function escapeHtmlSimple(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function prepareMermaidPreview(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code) => {
    const block = document.createElement("div");
    block.className = "mermaid";
    block.textContent = code.textContent ?? "";
    code.parentElement?.replaceWith(block);
  });
}

async function renderMermaidPreview(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>(".mermaid");
  if (nodes.length === 0) return;
  try {
    if (!mermaidRenderer) {
      const module = await import("mermaid");
      mermaidRenderer = module.default;
      mermaidRenderer.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    }
    await mermaidRenderer.run({ nodes });
  } catch {
    // Mermaid rendering errors are non-critical
  }
}

export async function renderMarkdownToHtml(content: string): Promise<string> {
  if (!content.trim()) {
    return '<h2>Empty document</h2><p>Start typing Markdown to preview it here.</p>';
  }
  const { data, body, hasFrontmatter } = parseFrontmatter(content);
  let markdownBody = body;
  if (hasFrontmatter && data.title) {
    markdownBody = `# ${data.title}\n\n${markdownBody}`;
  }
  const rendered = await marked.parse(renderMath(markdownBody));
  return DOMPurify.sanitize(rendered);
}

export async function renderToContainer(content: string, container: HTMLElement): Promise<boolean> {
  const isEmpty = !content.trim();

  if (isEmpty) {
    container.classList.add("empty");
    container.innerHTML = '<h2>Empty document</h2><p>Start typing Markdown to preview it here.</p>';
    return false;
  }

  container.classList.remove("empty");
  const html = await renderMarkdownToHtml(content);
  container.innerHTML = html;
  prepareMermaidPreview(container);
  await renderMermaidPreview(container);
  return true;
}
