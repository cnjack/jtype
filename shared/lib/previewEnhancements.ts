import "highlight.js/styles/github.css";
import "./previewEnhancements.css";

/**
 * Post-render enhancements applied to the markdown preview container after
 * every render pass (morphdom resets DOM state, so each pass re-applies):
 *
 *  - Syntax highlighting for fenced code blocks (highlight.js, lazy-loaded).
 *  - A hover "Copy" button on every code block.
 *  - ```html blocks become a live preview inside a fully sandboxed iframe
 *    (sandbox="" — no scripts, no same-origin) with a Preview/Source toggle.
 *  - Clicking an image opens a lightbox overlay.
 *
 * When the container is a PDF-export root (`data-pdf-export-root`), only the
 * syntax highlighting is applied — interactive chrome would end up rasterized
 * into the exported document.
 */

type Hljs = typeof import("highlight.js/lib/common")["default"];
let hljsPromise: Promise<Hljs> | null = null;

function loadHighlighter(): Promise<Hljs> {
  if (!hljsPromise) {
    hljsPromise = import("highlight.js/lib/common").then((module) => module.default);
  }
  return hljsPromise;
}

/** Fences that earlier pipeline passes already transformed (or will). */
const NON_CODE_LANGUAGES = new Set(["mermaid", "plantuml", "jtype-board", "math"]);

export async function enhancePreview(container: HTMLElement): Promise<void> {
  const isPdfExport = container.dataset.pdfExportRoot === "true";
  if (!isPdfExport) {
    buildHtmlPreviewBlocks(container);
  }
  await highlightCodeBlocks(container);
  if (isPdfExport) return;
  addCopyButtons(container);
  attachDelegatedEvents(container);
}

async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const codes = Array.from(container.querySelectorAll<HTMLElement>("pre > code")).filter((code) => {
    const lang = languageOf(code);
    return lang !== null && !NON_CODE_LANGUAGES.has(lang);
  });
  if (codes.length === 0) return;
  const hljs = await loadHighlighter();
  for (const code of codes) {
    const lang = languageOf(code);
    if (!lang || !hljs.getLanguage(lang)) continue;
    // Re-highlight from the raw text every pass: textContent stays the raw
    // source even after innerHTML is replaced with spans, so this is
    // idempotent and survives morphdom stripping the spans.
    const source = code.textContent ?? "";
    try {
      code.innerHTML = hljs.highlight(source, { language: lang, ignoreIllegals: true }).value;
      code.classList.add("hljs");
    } catch {
      // Leave the block unhighlighted on any parser hiccup.
    }
  }
}

function languageOf(code: HTMLElement): string | null {
  for (const cls of Array.from(code.classList)) {
    if (cls.startsWith("language-")) return cls.slice("language-".length).toLowerCase();
  }
  return null;
}

function addCopyButtons(container: HTMLElement): void {
  for (const pre of Array.from(container.querySelectorAll<HTMLElement>("pre"))) {
    if (!pre.querySelector("code")) continue;
    pre.classList.add("code-block");
    // Inside an html-preview block the copy button lives in the header.
    if (pre.closest(".html-preview-block")) continue;
    if (pre.querySelector(":scope > button.code-copy")) continue;
    pre.appendChild(makeCopyButton());
  }
}

function makeCopyButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy";
  button.textContent = "Copy";
  button.setAttribute("aria-label", "Copy code");
  return button;
}

function buildHtmlPreviewBlocks(container: HTMLElement): void {
  for (const code of Array.from(container.querySelectorAll<HTMLElement>("pre > code.language-html"))) {
    const pre = code.parentElement;
    if (!pre || pre.closest(".html-preview-block")) continue;
    const source = code.textContent ?? "";

    const wrapper = document.createElement("figure");
    wrapper.className = "html-preview-block";
    wrapper.dataset.mode = "preview";

    const header = document.createElement("div");
    header.className = "html-preview-header";
    const previewTab = document.createElement("button");
    previewTab.type = "button";
    previewTab.className = "html-preview-tab";
    previewTab.dataset.htmlTab = "preview";
    previewTab.setAttribute("aria-selected", "true");
    previewTab.textContent = "Preview";
    const sourceTab = document.createElement("button");
    sourceTab.type = "button";
    sourceTab.className = "html-preview-tab";
    sourceTab.dataset.htmlTab = "source";
    sourceTab.setAttribute("aria-selected", "false");
    sourceTab.textContent = "HTML";
    header.append(previewTab, sourceTab, makeCopyButton());

    const iframe = document.createElement("iframe");
    iframe.className = "html-preview-frame";
    iframe.title = "HTML preview";
    // Fully sandboxed: no scripts, no same-origin, no forms, no navigation.
    iframe.setAttribute("sandbox", "");
    iframe.setAttribute("loading", "lazy");
    iframe.srcdoc = source;

    pre.replaceWith(wrapper);
    wrapper.append(header, iframe, pre);
  }
}

/**
 * One delegated listener per container handles copy buttons, html-preview
 * tabs, and the image lightbox. The flag survives morphdom because morphdom
 * patches children only (`childrenOnly: true`).
 */
function attachDelegatedEvents(container: HTMLElement): void {
  if (container.dataset.previewEnhanced === "1") return;
  container.dataset.previewEnhanced = "1";
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const copy = target.closest<HTMLButtonElement>("button.code-copy");
    if (copy && container.contains(copy)) {
      const scope = copy.closest(".html-preview-block") ?? copy.closest("pre");
      const code = scope?.querySelector("pre > code") ?? scope?.querySelector("code");
      const text = code?.textContent ?? "";
      void navigator.clipboard.writeText(text).then(() => {
        const previous = copy.textContent;
        copy.textContent = "Copied";
        window.setTimeout(() => {
          copy.textContent = previous;
        }, 1200);
      });
      return;
    }

    const tab = target.closest<HTMLButtonElement>("button.html-preview-tab");
    if (tab && container.contains(tab)) {
      const wrapper = tab.closest<HTMLElement>(".html-preview-block");
      if (!wrapper) return;
      wrapper.dataset.mode = tab.dataset.htmlTab === "source" ? "source" : "preview";
      wrapper.querySelectorAll<HTMLButtonElement>("button.html-preview-tab").forEach((button) => {
        button.setAttribute("aria-selected", button === tab ? "true" : "false");
      });
      return;
    }

    // Any preview image (incl. PlantUML diagrams) zooms unless it is a link.
    if (target instanceof HTMLImageElement && !target.closest("a[href]")) {
      event.preventDefault();
      openLightbox(target);
    }
  });
}

function openLightbox(image: HTMLImageElement): void {
  const overlay = document.createElement("div");
  overlay.className = "preview-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", image.alt || "Image preview");
  const full = document.createElement("img");
  full.src = image.currentSrc || image.src;
  full.alt = image.alt ?? "";
  overlay.appendChild(full);

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
}
