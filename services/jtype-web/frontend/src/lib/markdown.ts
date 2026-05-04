import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import morphdom from "morphdom";
import { parseFrontmatter } from "./frontmatter";

marked.use({ gfm: true, breaks: false });

let mermaidRenderer: Awaited<typeof import("mermaid")>["default"] | null = null;
let mermaidRenderCounter = 0;
let renderVersion = 0;

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
    mermaidRenderCounter += 1;
    block.id = `mermaid-${mermaidRenderCounter}`;
    block.textContent = code.textContent ?? "";
    code.parentElement?.replaceWith(block);
  });
}

async function renderMermaidPreview(container: HTMLElement, version: number) {
  const nodes = container.querySelectorAll<HTMLElement>(".mermaid");
  if (nodes.length === 0) return;
  if (version !== renderVersion) return;
  try {
    if (!mermaidRenderer) {
      const module = await import("mermaid");
      mermaidRenderer = module.default;
      mermaidRenderer.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    }
    if (version !== renderVersion) return;
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
  renderVersion += 1;
  const thisVersion = renderVersion;

  const isEmpty = !content.trim();

  if (isEmpty) {
    container.classList.add("empty");
    container.innerHTML = '<h2>Empty document</h2><p>Start typing Markdown to preview it here.</p>';
    return false;
  }

  container.classList.remove("empty");
  const html = await renderMarkdownToHtml(content);

  if (thisVersion !== renderVersion) return false;

  // Use morphdom for incremental DOM patching: only changed elements are
  // touched, which preserves scroll position and avoids full-page flicker.
  const virtualContainer = document.createElement(container.tagName);
  virtualContainer.innerHTML = html;
  morphdom(container, virtualContainer, { childrenOnly: true });

  prepareMermaidPreview(container);
  await renderMermaidPreview(container, thisVersion);
  return true;
}
