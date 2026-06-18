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
const PLANTUML_SERVER_BASE = "https://www.plantuml.com/plantuml/svg/";
const PLANTUML_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

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

function encodePlantuml6Bit(value: number) {
  return PLANTUML_ALPHABET[value & 0x3f] ?? "";
}

function encodePlantumlBytes(bytes: Uint8Array) {
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    encoded += encodePlantuml6Bit(first >> 2);
    encoded += encodePlantuml6Bit(((first & 0x3) << 4) | (second >> 4));
    encoded += encodePlantuml6Bit(((second & 0xf) << 2) | (third >> 6));
    encoded += encodePlantuml6Bit(third & 0x3f);
  }
  return encoded;
}

async function deflatePlantumlSource(source: string) {
  if (typeof CompressionStream === "undefined") return null;
  const compressed = await new Response(
    new Blob([new TextEncoder().encode(source)]).stream().pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  if (bytes.length <= 6) return bytes;
  return bytes.slice(2, -4);
}

async function plantumlImageUrl(source: string) {
  const compressed = await deflatePlantumlSource(source);
  if (!compressed) return null;
  return `${PLANTUML_SERVER_BASE}${encodePlantumlBytes(compressed)}`;
}

function plantumlTitle(source: string) {
  return source.match(/^\s*@start\w*\s+([^\r\n]+)/i)?.[1]?.trim();
}

function prepareMermaidPreview(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code) => {
    const block = document.createElement("div");
    block.className = "mermaid";
    // Give each mermaid block a unique ID to avoid stale render issues
    mermaidRenderCounter += 1;
    block.id = `mermaid-${mermaidRenderCounter}`;
    block.textContent = code.textContent ?? "";
    code.parentElement?.replaceWith(block);
  });
}

async function renderMermaidPreview(container: HTMLElement, version: number) {
  const nodes = container.querySelectorAll<HTMLElement>(".mermaid");
  if (nodes.length === 0) return;
  // Skip if a newer render has started
  if (version !== renderVersion) return;
  try {
    if (!mermaidRenderer) {
      const module = await import("mermaid");
      mermaidRenderer = module.default;
      mermaidRenderer.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    }
    // Check again before async render
    if (version !== renderVersion) return;
    await mermaidRenderer.run({ nodes });
  } catch {
    // Mermaid rendering errors are non-critical
  }
}

async function renderPlantumlPreview(container: HTMLElement, version: number) {
  const codes = Array.from(container.querySelectorAll<HTMLElement>("pre > code.language-plantuml"));
  if (codes.length === 0) return;

  await Promise.all(
    codes.map(async (code) => {
      const source = code.textContent ?? "";
      const src = await plantumlImageUrl(source);
      if (!src || version !== renderVersion) return;

      const figure = document.createElement("figure");
      figure.className = "plantuml";

      const image = document.createElement("img");
      image.src = src;
      image.alt = plantumlTitle(source) || "PlantUML diagram";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      figure.append(image);

      code.parentElement?.replaceWith(figure);
    }),
  );
}

/**
 * Convert `[[Note]]` / `[[Note|Label]]` wikilinks into clickable spans carrying
 * the link target in `data-wikilink`. The platform layer resolves the target to
 * a vault note on click (see EditorShell's preview click handler).
 */
function renderWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g, (_match, target: string, label?: string) => {
    const targetText = target.trim();
    const labelText = (label ?? target).trim();
    const safeTarget = targetText.replace(/"/g, "&quot;");
    return `<span class="wikilink" role="link" tabindex="0" data-wikilink="${safeTarget}">${escapeHtmlSimple(labelText)}</span>`;
  });
}

/**
 * Replace a ```` ```jtype-board <id> ```` fenced block with an embed placeholder
 * that the platform layer fills with a read-only mini board (it needs to scan
 * card-notes, which requires filesystem access not available in this shared module).
 */
function replaceBoardEmbeds(html: string): string {
  return html.replace(
    /<pre><code class="language-jtype-board">([\s\S]*?)<\/code><\/pre>/g,
    (_match, id: string) => `<div class="jtype-board-embed" data-board="${id.trim().replace(/"/g, "&quot;")}"></div>`,
  );
}

// Stamp the source line number onto the first tag of a rendered block so the
// split-view scroll sync can align the preview with the editor (see useScrollSync).
function injectSourceLine(htmlPiece: string, line: number): string {
  return htmlPiece.replace(/^(\s*)<([a-zA-Z][\w-]*)/, (_match, ws: string, tag: string) => `${ws}<${tag} data-source-line="${line}"`);
}

/**
 * Render the body block-by-block so each top-level element carries a
 * `data-source-line` attribute (the 0-based line of the body where that block
 * begins). marked has no native line tracking, so we walk the lexer's top-level
 * tokens and accumulate the newline count of each token's raw text. The links
 * table is carried onto each single-token list so reference-style links resolve.
 */
function renderBodyWithSourceLines(body: string): string {
  const transformed = renderWikilinks(renderMath(body));
  const tokens = marked.lexer(transformed);
  let line = 0;
  let html = "";
  for (const token of tokens) {
    const single = [token] as typeof tokens;
    single.links = tokens.links;
    const piece = marked.parser(single);
    html += token.type === "space" ? piece : injectSourceLine(piece, line);
    line += (token.raw.match(/\n/g) ?? []).length;
  }
  return html;
}

export async function renderMarkdownToHtml(content: string): Promise<string> {
  if (!content.trim()) {
    return '<h2>Empty document</h2><p>Start typing Markdown to preview it here.</p>';
  }
  // Frontmatter (title/metadata) is not document content, so it is not rendered
  // into the preview body — the title belongs to the card/property UI, not here.
  const { body } = parseFrontmatter(content);
  const rendered = renderBodyWithSourceLines(body);
  return DOMPurify.sanitize(replaceBoardEmbeds(rendered), { ADD_ATTR: ["data-wikilink", "data-board", "data-source-line"] });
}

export async function renderToContainer(content: string, container: HTMLElement): Promise<boolean> {
  // Increment version to cancel any in-flight mermaid renders
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

  // If a newer render started while we were processing, discard this result
  if (thisVersion !== renderVersion) return false;

  // Use morphdom for incremental DOM patching: only changed elements are
  // touched, which preserves scroll position and avoids full-page flicker.
  const virtualContainer = document.createElement(container.tagName);
  virtualContainer.innerHTML = html;
  morphdom(container, virtualContainer, { childrenOnly: true });

  await renderPlantumlPreview(container, thisVersion);
  prepareMermaidPreview(container);
  await renderMermaidPreview(container, thisVersion);
  return true;
}
