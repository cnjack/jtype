import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useRef, useEffect, useCallback, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { save } from "@tauri-apps/plugin-dialog";
import { isCurrentVaultReadOnly, useAppDispatch, useAppState } from "../../app/AppState";
import { useFileSystem } from "../../hooks";
import { renderMarkdownToHtml, renderToContainer } from "@shared/lib/markdown";
import { parseFrontmatter, writeFrontmatter } from "@shared/lib/frontmatter";
import { basename, escapeHtml, isTauriRuntime, normalizePath } from "../../lib/utils";
import { findMarkdownByWikiTarget, workspaceIndexFor } from "../../lib/workspaceIndex";
import { useCommandsList } from "../../app/App";
import { addMarkdownTableColumn, addMarkdownTableRow, formatMarkdownTable, insertAtCursor, insertBlockAtSafeCursor, insertOrEditTable } from "../../hooks/useCommands";
import { useEagerSync } from "../../hooks/useEagerSync";
import { useConfirm } from "@shared/components/PromptDialogContext";
import { httpRequest } from "@shared/lib/http";
import { tauri } from "../../lib/tauri";
import type { EditorMode } from "@shared/lib/types";
import type { BoardConfig, BoardCard } from "../../lib/types";
import { FindBar } from "./FindBar";
import { SlashMenu } from "./SlashMenu";
import { ZoomIndicator } from "./ZoomIndicator";
import { useRuntimeCapabilities } from "../../app/RuntimeCapabilities";
import { useMobileInteraction } from "../../hooks/useMobileInteraction";

/** Build read-only HTML for an inline ```jtype-board``` embed in a document preview. */
function renderBoardEmbedHtml(config: BoardConfig, cards: BoardCard[]): string {
  const cols = config.columns
    .map((col) => {
      const colCards = cards.filter((c) => c.status === col.key).sort((a, b) => a.position - b.position);
      const items = colCards
        .map(
          (c) =>
            `<li style="background:#fff;border:0.5px solid rgba(0,0,0,0.06);border-radius:6px;padding:4px 8px;margin:4px 0;font-size:12px;list-style:none">${escapeHtml(c.title)}</li>`,
        )
        .join("");
      return `<div style="min-width:140px;flex:1;background:#f6faf7;border:0.5px solid rgba(0,0,0,0.05);border-radius:8px;padding:6px"><div style="font-size:12px;font-weight:500;color:#4b5753;padding:2px 4px 6px">${escapeHtml(col.name)} <span style="color:#9aa6a1">${colCards.length}</span></div><ul style="margin:0;padding:0">${items}</ul></div>`;
    })
    .join("");
  return `<div style="border:0.5px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px;margin:8px 0;background:#fbfdfb"><div style="font-size:13px;font-weight:600;color:#1c1917;padding:2px 4px 8px">${escapeHtml(config.title)}</div><div style="display:flex;gap:8px;overflow-x:auto">${cols}</div></div>`;
}
import { useScrollSync, useFloatingTooltip } from "@shared/hooks";
import { ViewModeToggle, FloatingTooltip, DiagramView } from "@shared/components";
import { isEditableResourcePath } from "@shared/lib/fileTypes";
import { ResourceViewer } from "./ResourceViewer";
import { BoardView } from "../BoardView";
import { CardPropertyStrip } from "./CardPropertyStrip";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeBracketIcon,
  TableCellsIcon,
  VariableIcon,
  ShareIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  CheckCircleIcon,
  StarIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  LinkSlashIcon,
  PrinterIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

/** Blob URLs need an explicit mime type (SVG won't render without one). */
function mimeForImagePath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME[ext] ?? "application/octet-stream";
}

type PublishStatusResponse = {
  documentId: string;
  isPublished: boolean;
  publishedAt: string | null;
  currentHash: string;
  publishedHash: string | null;
  hasUnpublishedChanges: boolean;
};

function applyPdfColorFallback(root: HTMLElement) {
  const applyBaseColors = (element: Element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;
    const style = element.style;
    style.color = "#1c1917";
    style.backgroundColor = "transparent";
    style.borderColor = "transparent";
    style.outlineColor = "transparent";
    style.textDecorationColor = "currentColor";
    style.boxShadow = "none";
  };

  applyBaseColors(root);
  root.querySelectorAll("*").forEach(applyBaseColors);

  root.style.backgroundColor = "#f8fbf9";
  root.querySelectorAll<HTMLElement>("a").forEach((element) => {
    element.style.color = "#008884";
  });
  root.querySelectorAll<HTMLElement>("code").forEach((element) => {
    element.style.backgroundColor = "#e8f6f2";
    element.style.color = "#1c1917";
  });
  root.querySelectorAll<HTMLElement>("pre").forEach((element) => {
    element.style.backgroundColor = "#f5f5f4";
    element.style.borderColor = "rgba(13, 13, 12, 0.08)";
  });
  root.querySelectorAll<HTMLElement>("blockquote").forEach((element) => {
    element.style.color = "#6f817a";
    element.style.borderLeftColor = "#008884";
  });
  root.querySelectorAll<HTMLElement>("th, td").forEach((element) => {
    element.style.borderColor = "#e7e5e4";
  });
  root.querySelectorAll<HTMLElement>(".math-block, .mermaid").forEach((element) => {
    element.style.backgroundColor = "rgba(255, 255, 255, 0.55)";
    element.style.borderColor = "rgba(13, 13, 12, 0.06)";
  });
}

async function renderPreviewPdfBytes(content: string): Promise<Uint8Array> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.background = "#f8fbf9";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  const article = document.createElement("article");
  article.className = "preview";
  article.dataset.pdfExportRoot = "true";
  article.style.boxSizing = "border-box";
  article.style.width = "794px";
  article.style.minHeight = "1123px";
  article.style.padding = "40px";
  article.style.background = "#f8fbf9";
  article.style.color = "#1c1917";
  host.appendChild(article);
  document.body.appendChild(host);

  try {
    await renderToContainer(content, article, { progressive: false });
    applyPdfColorFallback(article);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const canvas = await html2canvas(article, {
      backgroundColor: "#f8fbf9",
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      windowWidth: article.scrollWidth,
      windowHeight: article.scrollHeight,
      onclone: (clonedDocument) => {
        clonedDocument.documentElement.style.backgroundColor = "#f8fbf9";
        clonedDocument.body.style.backgroundColor = "#f8fbf9";
        const clonedArticle = clonedDocument.querySelector<HTMLElement>("[data-pdf-export-root='true']");
        if (clonedArticle) applyPdfColorFallback(clonedArticle);
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const pageImageHeight = pageHeight - margin * 2;
    const sourcePageHeight = Math.floor((pageImageHeight * canvas.width) / imageWidth);

    let sourceY = 0;
    let pageIndex = 0;
    while (sourceY < canvas.height) {
      const pageCanvas = document.createElement("canvas");
      const chunkHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      pageCanvas.width = canvas.width;
      pageCanvas.height = chunkHeight;

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error(t`Could not prepare PDF page.`);
      ctx.fillStyle = "#f8fbf9";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        chunkHeight,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height,
      );

      if (pageIndex > 0) pdf.addPage();
      const chunkImageHeight = Math.min(imageHeight - pageIndex * pageImageHeight, pageImageHeight);
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, imageWidth, chunkImageHeight);
      sourceY += chunkHeight;
      pageIndex += 1;
    }

    return new Uint8Array(pdf.output("arraybuffer"));
  } finally {
    host.remove();
  }
}

export function EditorShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fs = useFileSystem();
  const capabilities = useRuntimeCapabilities();
  const commands = useCommandsList();
  const confirm = useConfirm();
  const { pushSingleDocument } = useEagerSync();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compactPanelInitializedRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [publishState, setPublishState] = useState<PublishStatusResponse | null>(null);
  const performHaptic = useMobileInteraction();
  const { tooltip: floatingTooltip, tooltipProps } = useFloatingTooltip();

  // In-page shortcuts: find (Cmd+F / Cmd+G) and zoom (Cmd+/- / Cmd+0). These
  // live on EditorShell (not the global shortcut table) because find/zoom only
  // make sense with a document open, and Cmd+F must suppress the browser's own
  // find UI in the Tauri webview.
  useEffect(() => {
    // Only meaningful when there is a document or draft to act on.
    if (!state.currentPath && !state.isDraft) return;
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key;
      // Find open / next / previous. Match on e.code as well: with Alt held,
      // macOS reports e.key as "ƒ" instead of "f" (Cmd+Alt+F opens replace).
      if (key === "f" || e.code === "KeyF") {
        e.preventDefault();
        dispatch({ type: "SET_FINDBAR", open: true });
        if (e.altKey) {
          window.dispatchEvent(new CustomEvent("jtype:find-open-replace"));
        }
        return;
      }
      if (key === "g") {
        e.preventDefault();
        // Dispatch a custom event the FindBar listens for so it can step its
        // internal match index without round-tripping through global state.
        window.dispatchEvent(new CustomEvent("jtype:find-step", { detail: { direction: e.shiftKey ? -1 : 1 } }));
        return;
      }
      // Zoom in / out / reset
      if (key === "=" || key === "+") {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", level: state.zoomLevel + 0.1 });
        return;
      }
      if (key === "-") {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", level: state.zoomLevel - 0.1 });
        return;
      }
      if (key === "0") {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", level: 1 });
        return;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dispatch, state.currentPath, state.isDraft, state.zoomLevel]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.value = state.editorContent;
    }
  }, [state.currentPath, state.editorContentVersion, state.isDraft]);

  const populateBoardEmbeds = useCallback(
    async (container: HTMLElement) => {
      const root = state.workspace?.rootPath;
      if (!root || !tauri.isAvailable) return;
      const embeds = Array.from(container.querySelectorAll<HTMLElement>(".jtype-board-embed[data-board]"));
      for (const el of embeds) {
        if (el.dataset.filled) continue;
        el.dataset.filled = "1";
        const ref = el.getAttribute("data-board") ?? "";
        try {
          const config = JSON.parse(await tauri.readBoardFile(`${root}/${ref}`)) as BoardConfig;
          const cards = await tauri.scanBoardCards(root, config.id);
          el.innerHTML = renderBoardEmbedHtml(config, cards);
        } catch {
          el.textContent = `Board not found: ${ref}`;
        }
      }
    },
    [state.workspace?.rootPath],
  );

  const fileName = state.isDraft ? t`Untitled` : state.currentPath ? basename(state.currentPath) : t`No file selected`;
  const isMarkdown = state.currentKind === "markdown";
  const isAssetView = state.currentKind === "asset" && !!state.currentPath;
  const isBoardView = state.currentKind === "board" && !!state.currentPath;
  const isDiagramView = state.currentKind === "diagram" && !!state.currentPath;
  const documentLocation = (() => {
    const sourcePath = state.currentRelativePath || state.currentPath;
    if (!sourcePath) return "";
    const parts = normalizePath(sourcePath).split("/").filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  })();

  const getGridClass = (mode: EditorMode) => {
    if (mode === "write") return "editor-preview-grid view-mode-write";
    if (mode === "preview") return "editor-preview-grid view-mode-preview";
    return "editor-preview-grid view-mode-split";
  };

  const fileStateLabel = state.isDirty ? t`Unsaved changes` : "";
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const isCloudViewer = Boolean(
    (currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false)
      || isCurrentVaultReadOnly(state),
  );
  const canEditMarkdown = isMarkdown && !isCloudViewer;
  // Editable diagram resources (Mermaid `.mmd`, Excalidraw) save like documents.
  const canEditDiagram = isDiagramView && !isCloudViewer && isEditableResourcePath(state.currentPath);
  const canSaveCurrent = canEditMarkdown || canEditDiagram;
  const canPublishToCloud = Boolean(isMarkdown && state.mode === "workspace" && currentVaultBinding && state.syncToken && state.cloudProfile?.token && currentVaultSettings?.cloudSyncEnabled !== false);
  const showVaultDocumentTools = state.mode === "workspace";
  const showDocumentPanel = showVaultDocumentTools && state.documentPanelOpen;
  const compactWorkbench = capabilities.prefersCompactLayout;
  const effectiveEditorMode: EditorMode = compactWorkbench && state.editorMode === "split" ? "write" : state.editorMode;
  const showDesktopDocumentPanel = showDocumentPanel && !compactWorkbench;
  const showMobileDocumentPanel = showDocumentPanel && compactWorkbench;
  const isPublished = Boolean(publishState?.isPublished);
  const hasUnpublishedChanges = Boolean(isPublished && (state.isDirty || publishState?.hasUnpublishedChanges));
  const cloudWs = currentVaultBinding ? state.cloudWorkspaces.find((w) => w.id === currentVaultBinding.workspaceId) : undefined;
  const wsSlug = cloudWs?.slug || currentVaultBinding?.workspaceSlug || "";
  const publishedUrl = (state.syncSiteUrl || state.cloudProfile?.siteUrl) && wsSlug && state.currentRelativePath
    ? `${(state.syncSiteUrl || state.cloudProfile?.siteUrl || "").replace(/\/$/, "")}/${wsSlug}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
    : "";

  useEffect(() => {
    if (compactWorkbench && state.editorMode === "split") {
      dispatch({ type: "SET_EDITOR_MODE", mode: "write" });
    }
  }, [compactWorkbench, dispatch, state.editorMode]);

  useEffect(() => {
    if (!compactWorkbench) {
      compactPanelInitializedRef.current = false;
      return;
    }
    if (compactPanelInitializedRef.current) return;
    compactPanelInitializedRef.current = true;
    if (state.documentPanelOpen) dispatch({ type: "TOGGLE_DOCUMENT_PANEL" });
  }, [compactWorkbench, dispatch]);

  const handleInput = useCallback(() => {
    if (isCloudViewer) return;
    const content = editorRef.current?.value ?? "";
    dispatch({ type: "SET_EDITOR_CONTENT", content });
  }, [dispatch, isCloudViewer]);

  // Blob URLs for vault-relative images shown in the preview, keyed by full
  // path. Revoked when the workspace changes or the shell unmounts.
  const imageUrlCacheRef = useRef<Map<string, string>>(new Map());
  const localImageObserverRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const cache = imageUrlCacheRef.current;
    return () => {
      localImageObserverRef.current?.disconnect();
      localImageObserverRef.current = null;
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, [state.workspace?.rootPath]);

  /**
   * Resolve vault-relative `<img>` sources to blob URLs so local images render
   * in the preview. Runs after every render pass: morphdom resets `src` to the
   * raw markdown value, and cached entries re-apply without re-reading disk.
   */
  const resolveLocalImages = useCallback(async (container: HTMLElement) => {
    const root = state.workspace?.rootPath;
    if (!root || !tauri.isAvailable) return;
    localImageObserverRef.current?.disconnect();

    const resolveImage = async (img: HTMLImageElement) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || /^(https?:|data:|blob:|asset:|file:|\/\/)/i.test(src)) return;
      let rel: string;
      try {
        rel = normalizePath(decodeURIComponent(src)).replace(/^\.\//, "");
      } catch {
        return;
      }
      // Try document-relative first, then vault-root-relative.
      const candidates = documentLocation ? [`${documentLocation}/${rel}`, rel] : [rel];
      for (const candidate of candidates) {
        const fullPath = `${root}/${candidate}`;
        let url = imageUrlCacheRef.current.get(fullPath);
        if (!url) {
          try {
            const bytes = await tauri.readBinaryFile(fullPath);
            url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeForImagePath(candidate) }));
            imageUrlCacheRef.current.set(fullPath, url);
          } catch {
            continue;
          }
        }
        img.src = url;
        break;
      }
    };

    const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
    images.forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
    });
    if (typeof IntersectionObserver === "undefined") {
      await Promise.all(images.map(resolveImage));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
          observer.unobserve(entry.target);
          void resolveImage(entry.target as HTMLImageElement);
        });
      },
      { root: container, rootMargin: "480px 0px" },
    );
    localImageObserverRef.current = observer;
    images.forEach((img) => observer.observe(img));
  }, [state.workspace?.rootPath, documentLocation]);

  /** Save pasted image data into `<doc dir>/assets/` and insert its markdown link. */
  const handleEditorPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canEditMarkdown) return;
    const root = state.workspace?.rootPath;
    if (!root || !tauri.isAvailable) return;
    const images = Array.from(e.clipboardData?.items ?? []).filter(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (images.length === 0) return;
    e.preventDefault();
    for (const item of images) {
      const file = item.getAsFile();
      if (!file) continue;
      void (async () => {
        try {
          const ext = (file.type.split("/")[1] ?? "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "") || "png";
          const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
          const nonce = Math.random().toString(36).slice(2, 6);
          const name = `pasted-${stamp}-${nonce}.${ext}`;
          const relAssetPath = documentLocation ? `${documentLocation}/assets/${name}` : `assets/${name}`;
          const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
          await tauri.writeBinaryFile(`${root}/${relAssetPath}`, bytes);
          // The markdown link is document-relative; the file sits next to the doc.
          insertAtCursor(`![${name}](assets/${name})`);
          dispatch({ type: "SET_STATUS", message: t`Image saved to ${relAssetPath}.` });
        } catch (error) {
          dispatch({ type: "SET_STATUS", message: String(error) });
        }
      })();
    }
  }, [canEditMarkdown, state.workspace?.rootPath, documentLocation, dispatch]);

  useEffect(() => {
    if (!previewRef.current || state.currentKind !== "markdown") return;
    // Skip rendering when preview is not visible (write mode)
    if (effectiveEditorMode === "write") return;
    // Debounce preview rendering to avoid rapid DOM thrashing
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const container = previewRef.current;
    const content = state.editorContent;
    previewTimerRef.current = setTimeout(() => {
      void renderToContainer(content, container, {
        renderKey: state.currentPath || (state.isDraft ? "draft" : "markdown"),
        renderMoreLabel: t`Show more`,
      }).then(() =>
        Promise.all([populateBoardEmbeds(container), resolveLocalImages(container)]),
      );
    }, 120);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [state.editorContent, state.currentKind, state.currentPath, state.isDraft, effectiveEditorMode, populateBoardEmbeds, resolveLocalImages]);

  const isFavorite = (() => {
    if (!state.currentPath) return false;
    const key = `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
    const favorites: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return favorites.includes(state.currentPath);
  })();

  const toggleFavorite = useCallback(() => {
    if (!state.currentPath) return;
    const key = `jtype.favorites:${state.workspace?.rootPath ?? "global"}`;
    const favorites: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const next = favorites.includes(state.currentPath)
      ? favorites.filter((p) => p !== state.currentPath)
      : [state.currentPath, ...favorites];
    window.localStorage.setItem(key, JSON.stringify(next));
    dispatch({ type: "TOGGLE_FAVORITE" });
    dispatch({ type: "SET_STATUS", message: next.includes(state.currentPath) ? t`Added to favorites.` : t`Removed from favorites.` });
  }, [state.currentPath, state.workspace, state.editorContent, dispatch]);

  const runCommand = useCallback((id: string) => {
    const cmd = commands.find((c) => c.id === id);
    if (cmd && cmd.isEnabled()) cmd.run();
  }, [commands]);

  const runAccessoryCommand = useCallback((id: string) => {
    void performHaptic("selection");
    runCommand(id);
    window.requestAnimationFrame(() => editorRef.current?.focus());
  }, [performHaptic, runCommand]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Keep the OS text-selection/copy callout on touch devices. Desktop still
    // receives the existing JType editor context menu.
    if (capabilities.isTouchPrimary) return;
    e.preventDefault();
    if (isCloudViewer) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [capabilities.isTouchPrimary, isCloudViewer]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const wikilink = (event.target as HTMLElement).closest("[data-wikilink]") as HTMLElement | null;
    if (wikilink) {
      event.preventDefault();
      const target = wikilink.getAttribute("data-wikilink") ?? "";
      const node = findMarkdownByWikiTarget(workspaceIndexFor(state.workspace?.entries), target);
      if (node) void fs.openMarkdownFile(node.path, node.relativePath);
      else dispatch({ type: "SET_STATUS", message: t`No note named "${target}".` });
      return;
    }
    const anchor = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#")) return;

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      event.preventDefault();
      dispatch({ type: "SET_STATUS", message: t`Only web, email, and phone links can be opened from preview.` });
      return;
    }

    event.preventDefault();
    if (!isTauriRuntime()) {
      window.open(url.href, "_blank", "noopener,noreferrer");
      return;
    }

    void import("@tauri-apps/plugin-opener")
      .then(({ openUrl }) => openUrl(url.href))
      .catch(() => {
        window.open(url.href, "_blank", "noopener,noreferrer");
      });
  }, [dispatch, fs, state.workspace?.entries]);

  const cloudPublishRequest = useCallback(async <T,>(path: string, init: RequestInit = {}) => {
    if (!currentVaultBinding || !state.syncToken || !state.cloudProfile?.token) return null;
    const serviceUrl = (state.serviceUrl || state.cloudProfile?.serverUrl || "http://localhost:13345").trim().replace(/\/$/, "");
    const response = await httpRequest(`${serviceUrl}/api/v1/workspaces/${currentVaultBinding.workspaceId}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.syncToken}`,
        "x-device-id": state.cloudProfile?.deviceId ?? capabilities.clientType,
        "x-client-type": capabilities.clientType,
        ...(state.wsSessionId ? { "x-session-id": state.wsSessionId } : {}),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return null;
    return (await response.json()) as T;
  }, [capabilities.clientType, currentVaultBinding, state.cloudProfile, state.serviceUrl, state.syncToken, state.wsSessionId]);

  const findCloudDocumentId = useCallback(async () => {
    if (!state.currentRelativePath) return "";
    const docs = await cloudPublishRequest<Array<{ id: string; relativePath: string }>>("/documents");
    const relativePath = normalizePath(state.currentRelativePath);
    return docs?.find((doc) => normalizePath(doc.relativePath) === relativePath)?.id ?? "";
  }, [cloudPublishRequest, state.currentRelativePath]);

  const refreshPublishState = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) {
      setPublishState(null);
      return;
    }
    try {
      const documentId = await findCloudDocumentId();
      if (!documentId) {
        setPublishState(null);
        return;
      }
      const next = await cloudPublishRequest<PublishStatusResponse>(`/documents/${documentId}/publish`);
      setPublishState(next);
    } catch {
      setPublishState(null);
    }
  }, [canPublishToCloud, cloudPublishRequest, findCloudDocumentId, state.currentRelativePath]);

  useEffect(() => {
    void refreshPublishState();
  }, [refreshPublishState]);

  const publishCurrentDocument = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) {
      dispatch({ type: "SET_STATUS", message: t`Connect this vault to a cloud workspace before publishing.` });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const relativePath = state.currentRelativePath;
      const content = state.editorContent;
      if (state.isDirty) await fs.saveCurrentFile();
      await pushSingleDocument(relativePath, content);
      const documentId = await findCloudDocumentId();
      if (!documentId) throw new Error(t`Sync this document before publishing.`);
      const result = await cloudPublishRequest<{ isPublished: boolean; publishedAt: string; contentHash: string }>(`/documents/${documentId}/publish`, { method: "POST", body: "{}" });
      const next = await cloudPublishRequest<PublishStatusResponse>(`/documents/${documentId}/publish`);
      setPublishState(next ?? (result ? {
        documentId,
        isPublished: result.isPublished,
        publishedAt: result.publishedAt,
        currentHash: result.contentHash,
        publishedHash: result.contentHash,
        hasUnpublishedChanges: false,
      } : null));
      dispatch({ type: "SET_STATUS", message: t`Document published.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [canPublishToCloud, cloudPublishRequest, dispatch, findCloudDocumentId, fs, pushSingleDocument, state.currentRelativePath, state.editorContent, state.isDirty]);

  const unpublishCurrentDocument = useCallback(async () => {
    if (!canPublishToCloud || !state.currentRelativePath) return;
    const ok = await confirm(t`Remove this document from the public site?`, { destructive: true, confirmLabel: t`Unpublish` });
    if (!ok) return;
    try {
      dispatch({ type: "SET_LOADING", isLoading: true });
      const documentId = await findCloudDocumentId();
      if (!documentId) throw new Error(t`Cloud document not found.`);
      await cloudPublishRequest(`/documents/${documentId}/publish`, { method: "DELETE" });
      await refreshPublishState();
      dispatch({ type: "SET_STATUS", message: t`Document unpublished.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [canPublishToCloud, cloudPublishRequest, confirm, dispatch, findCloudDocumentId, refreshPublishState, state.currentRelativePath]);

  const exportCurrentPdf = useCallback(async () => {
    if (!state.currentPath || state.currentKind !== "markdown") return;
    const title = basename(state.currentPath).replace(/\.(md|markdown|mdown|mkd)$/i, "");

    try {
      if (isTauriRuntime()) {
        if (capabilities.isMobile) {
          dispatch({ type: "SET_LOADING", isLoading: true });
          dispatch({ type: "SET_STATUS", message: t`Exporting PDF...` });
          const pdfBytes = await renderPreviewPdfBytes(state.editorContent);
          const fileName = `${title}.pdf`;
          await tauri.sharePdf(fileName, Array.from(pdfBytes));
          dispatch({ type: "SET_STATUS", message: t`Opened system sharing for ${fileName}.` });
          return;
        }

        const selected = await save({
          defaultPath: `${title}.pdf`,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (!selected) return;
        const outputPath = selected.toLowerCase().endsWith(".pdf") ? selected : `${selected}.pdf`;

        dispatch({ type: "SET_LOADING", isLoading: true });
        dispatch({ type: "SET_STATUS", message: t`Exporting PDF...` });
        const pdfBytes = await renderPreviewPdfBytes(state.editorContent);
        await tauri.writeBinaryFile(outputPath, Array.from(pdfBytes));
        dispatch({ type: "SET_STATUS", message: t`Exported PDF to ${outputPath}.` });
        return;
      }

      dispatch({ type: "SET_STATUS", message: t`Preparing PDF export...` });
      const html = await renderMarkdownToHtml(state.editorContent);
      const printHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; background: white; color: #1c1917; font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
      main { max-width: 760px; margin: 0 auto; padding: 48px 42px; }
      h1, h2, h3 { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.2; }
      pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      pre { overflow: auto; padding: 14px; background: #f5f5f4; border-radius: 8px; }
      img { max-width: 100%; }
      blockquote { margin-left: 0; padding-left: 18px; border-left: 3px solid #d6d3d1; color: #57534e; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e7e5e4; padding: 8px; text-align: left; }
      @page { margin: 18mm; }
      @media print { main { max-width: none; padding: 0; } }
    </style>
  </head>
  <body>
    <main class="preview">${html}</main>
    <script>
      window.addEventListener("load", () => {
        window.focus();
        setTimeout(() => window.print(), 120);
      });
    </script>
  </body>
</html>`;

      const existingFrame = document.getElementById("jtype-pdf-export-frame");
      existingFrame?.remove();

      const printFrame = document.createElement("iframe");
      printFrame.id = "jtype-pdf-export-frame";
      printFrame.title = "PDF export";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.style.opacity = "0";
      printFrame.setAttribute("aria-hidden", "true");
      document.body.appendChild(printFrame);

      const printDocument = printFrame.contentDocument;
      if (!printDocument || !printFrame.contentWindow) {
        throw new Error(t`Could not prepare PDF export.`);
      }

      printDocument.open();
      printDocument.write(printHtml);
      printDocument.close();
      dispatch({ type: "SET_STATUS", message: t`Use the print dialog to save as PDF.` });
    } catch (error) {
      dispatch({ type: "SET_STATUS", message: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [capabilities.isMobile, dispatch, state.currentKind, state.currentPath, state.editorContent]);

  useScrollSync(editorRef, previewRef, !!state.currentPath && state.currentKind === "markdown");

  const documentInfoSections = (
    <>
      <PropertiesSection />
      <OutlineSection />
      {state.currentKind === "markdown" && (
        <PublishSection
          publishState={publishState}
          isPublished={isPublished}
          hasUnpublishedChanges={hasUnpublishedChanges}
          publishedUrl={publishedUrl}
          canPublish={canPublishToCloud && canEditMarkdown}
          isLoading={state.isLoading}
          onPublish={publishCurrentDocument}
          onUnpublish={unpublishCurrentDocument}
        />
      )}
      <LinksSection />
    </>
  );

  return (
    <section
      className="relative flex min-h-0 flex-col bg-[#fbfdfb]"
      // --jtype-zoom drives font-size scaling for the editor + preview. Both
      // #editor and #preview read it via calc() so a single dispatch rescales
      // the whole document surface (incl. PDF, which receives zoomLevel as a prop).
      style={{ "--jtype-zoom": state.zoomLevel } as React.CSSProperties}
    >
      <FindBar />
      <SlashMenu enabled={canEditMarkdown && (effectiveEditorMode === "write" || effectiveEditorMode === "split")} />
      <ZoomIndicator />
      <div className={`relative z-30 flex min-h-[56px] min-w-0 items-center justify-between gap-3 bg-white/60 backdrop-blur-xl ${compactWorkbench ? "px-3" : "px-5"}`}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-baseline gap-1">
              {state.workspace && state.currentRelativePath && (
                <span className="shrink-0 truncate text-xs text-[#9aa6a1]">
                  {state.workspace.name}
                  {documentLocation ? ` / ${documentLocation.replace(/\//g, " / ")}` : ""}
                  {" / "}
                </span>
              )}
              <p className="truncate text-sm font-semibold text-stone-950">{fileName}</p>
            </div>
            {state.currentPath && (
              <button
                type="button"
                className={`editor-tool h-8 w-8 px-0 ${isFavorite ? "text-amber-500 hover:text-amber-600" : ""}`}
                aria-label={isFavorite ? t`Remove from favorites` : t`Add to favorites`}
                aria-pressed={isFavorite}
                title={isFavorite ? t`Remove from favorites` : t`Add to favorites`}
                onClick={toggleFavorite}
              >
                <StarIcon className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
            {state.workspace && state.currentRelativePath && (
              <button
                type="button"
                className="editor-tool h-8 w-8 px-0 hover:text-red-700"
                aria-label={t`Move to trash`}
                title={t`Move to trash`}
                disabled={isCloudViewer}
                onClick={() => runCommand("file.delete")}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="header-action-group">
          {!state.isDirty || compactWorkbench || <span id="file-state" className="status-chip status-chip-warning">{fileStateLabel}</span>}
          {canPublishToCloud && canEditMarkdown && (!isPublished || hasUnpublishedChanges) && (
            <span className="header-tooltip header-tooltip-end group">
              <button
                className={`header-icon-button ${
                  hasUnpublishedChanges
                    ? "header-icon-button-warning"
                    : "header-icon-button-primary"
                }`}
                type="button"
                aria-label={hasUnpublishedChanges ? t`Republish` : t`Publish`}
                aria-disabled={state.isLoading}
                {...tooltipProps(hasUnpublishedChanges ? t`Republish` : t`Publish`)}
                onClick={() => {
                  if (state.isLoading) return;
                  void publishCurrentDocument();
                }}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </span>
          )}
          {isPublished && canEditMarkdown && (
            <button
              className="header-icon-button header-icon-button-danger"
              type="button"
              aria-label={t`Unpublish`}
              aria-disabled={state.isLoading}
              {...tooltipProps(t`Unpublish`)}
              onClick={() => {
                if (state.isLoading) return;
                void unpublishCurrentDocument();
              }}
            >
              <LinkSlashIcon className="h-4 w-4" />
            </button>
          )}
          {isCloudViewer && <span className="status-chip status-chip-neutral"><Trans>Read-only</Trans></span>}
          {state.activeConflicts.length > 0 && (
            <button
              type="button"
              className="status-chip status-chip-warning cursor-pointer"
              onClick={() => dispatch({ type: "SET_CONFLICT_DIALOG", open: true })}
              title={t`${state.activeConflicts.length} conflict${state.activeConflicts.length > 1 ? "s" : ""} to resolve`}
            >
              <Trans>{state.activeConflicts.length} conflict{state.activeConflicts.length > 1 ? "s" : ""}</Trans>
            </button>
          )}
          {(state.currentPath || state.isDraft) && (
            <span className="header-tooltip header-tooltip-end group">
              <button
                className={`header-icon-button ${state.isDraft || state.isDirty ? "header-icon-button-primary" : ""}`}
                type="button"
                aria-label={state.isDraft ? t`Save as…` : state.isDirty ? t`Save` : t`No unsaved changes`}
                aria-keyshortcuts="Control+S Meta+S"
                aria-disabled={state.isDraft ? false : (!canSaveCurrent || !state.isDirty)}
                {...tooltipProps(state.isDraft ? t`Save as…` : state.isDirty ? t`Save` : t`No unsaved changes`)}
                onClick={() => {
                  // Drafts route to the "save as" flow (no disk path yet).
                  if (state.isDraft) {
                    void fs.saveDraftAs();
                    return;
                  }
                  if (!canSaveCurrent || !state.isDirty) return;
                  const relPath = state.currentRelativePath;
                  const content = state.editorContent;
                  fs.saveCurrentFile().then(() => {
                    if (relPath && state.mode === "workspace") {
                      pushSingleDocument(relPath, content);
                    }
                  });
                }}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            </span>
          )}
          {state.currentPath && state.currentKind === "markdown" && (
            <Menu as="div" className="relative inline-block text-left">
              <MenuButton
                className="header-icon-button"
                type="button"
                aria-label={t`Export`}
                title={t`Export`}
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-[120] mt-2 w-44 origin-top-right rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
              >
                <MenuItem>
                  {({ focus }) => (
                    <button
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${focus ? "bg-[#e8f6f2] text-[#006f6b]" : ""}`}
                      type="button"
                      onClick={() => void exportCurrentPdf()}
                    >
                      <PrinterIcon className="h-4 w-4" />
                      <Trans>PDF</Trans>
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition ${focus ? "bg-[#e8f6f2] text-[#006f6b]" : ""}`}
                      type="button"
                      onClick={() => void fs.exportCurrentMarkdown()}
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <Trans>Markdown</Trans>
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
          )}
        </div>
      </div>

      {isMarkdown && (
      <div className={`flex min-w-0 items-center gap-1 overflow-x-auto bg-[#fbfdfb] ${capabilities.isTouchPrimary ? "min-h-14 px-3 [&_.editor-tool]:h-11 [&_.editor-tool]:min-w-11" : "min-h-12 px-5"}`}>
        <EditorToolbarButton command="editor.bold" title={t`Bold - Ctrl+B`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Bold - Ctrl+B`)}>
          <BoldIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.italic" title={t`Italic - Ctrl+I`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Italic - Ctrl+I`)}>
          <ItalicIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.link" title={t`Link - Ctrl+K`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Link - Ctrl+K`)}>
          <LinkIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="editor.code" title={t`Inline code`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Inline code`)}>
          <CodeBracketIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.table" title={t`Insert or edit table - Ctrl+Shift+T`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Insert or edit table - Ctrl+Shift+T`)}>
          <TableCellsIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.math" title={t`Insert formula block`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Insert formula block`)}>
          <VariableIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.mermaid" title={t`Insert Mermaid diagram`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Insert Mermaid diagram`)}>
          <ShareIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <EditorToolbarButton command="insert.task" title={t`Task list`} disabled={!canEditMarkdown} runCommand={runCommand} tooltipProps={tooltipProps(t`Task list`)}>
          <ClipboardDocumentListIcon className="h-4 w-4" />
        </EditorToolbarButton>
        <div className={capabilities.isTouchPrimary ? "order-first mr-1 shrink-0" : "ml-auto shrink-0"}>
          <ViewModeToggle
            mode={effectiveEditorMode}
            onModeChange={(mode) => dispatch({ type: "SET_EDITOR_MODE", mode })}
            tooltipProps={tooltipProps}
            allowSplit={!compactWorkbench}
            touchOptimized={capabilities.isTouchPrimary}
          />
        </div>
        {showVaultDocumentTools && (
          <>
            <button className={`editor-tool shrink-0 ${state.documentPanelOpen ? "bg-[#e8f6f2] text-[#006f6b] ring-1 ring-[#008884]/15 hover:bg-[#e8f6f2] hover:text-[#006f6b]" : ""}`} type="button" aria-label={t`Document info`} {...tooltipProps(t`Document info`)} onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
              <InformationCircleIcon className="h-4 w-4" />
            </button>
            <button className="editor-tool shrink-0" type="button" aria-label={t`Focus mode`} {...tooltipProps(t`Focus mode`)} onClick={() => dispatch({ type: "TOGGLE_FOCUS_MODE" })}>
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      )}

      {isMarkdown && <CardPropertyStrip content={state.editorContent} />}

      <div id="workbench-body" className={`workbench-body grid min-h-0 flex-1 bg-[#fbfdfb] ${showDesktopDocumentPanel ? "grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-[minmax(0,1fr)]"}`}>
        {isBoardView ? (
          <BoardView boardPath={state.currentPath} boardRelativePath={state.currentRelativePath} />
        ) : isAssetView ? (
          <ResourceViewer path={state.currentPath} relativePath={state.currentRelativePath} />
        ) : isDiagramView ? (
          <DiagramView
            path={state.currentPath}
            content={state.editorContent}
            editable={canEditDiagram}
            onChange={(next) => dispatch({ type: "SET_EDITOR_CONTENT", content: next })}
            onSave={(next) => void fs.saveCurrentFile(next)}
          />
        ) : (
        <div className={getGridClass(effectiveEditorMode)} style={{ position: "relative" }}>
          <textarea
            id="editor"
            ref={editorRef}
            className={`h-full min-h-0 w-full resize-none bg-white/40 font-mono leading-7 text-stone-800 outline-none placeholder:text-[#9aa6a1] ${compactWorkbench ? "p-5" : "p-8"}`}
            style={{
              position: "relative",
              zIndex: 2,
              // iOS zooms the entire WebView when a focused text control is
              // rendered below 16px. Keep the compact editor at that floor so
              // native keyboard focus does not push header actions off-screen.
              fontSize: compactWorkbench
                ? "max(16px, calc(16px * var(--jtype-font-scale, 1) * var(--jtype-zoom, 1)))"
                : "calc(13px * var(--jtype-zoom, 1))",
            }}
            spellCheck={false}
            aria-label={t`Markdown editor`}
            placeholder={t`Open or drop a Markdown file to start editing.`}
            disabled={!isMarkdown}
            readOnly={isCloudViewer}
            onFocus={() => setEditorFocused(true)}
            onBlur={() => setEditorFocused(false)}
            onInput={handleInput}
            onPaste={handleEditorPaste}
            onContextMenu={handleContextMenu}
          />
          <article
            id="preview"
            ref={previewRef}
            className={`preview empty min-h-0 overflow-y-auto overflow-x-hidden border-l border-black/[0.04] bg-[#f8fbf9] ${compactWorkbench ? "p-5" : "p-10"}`}
            style={{ position: "relative", zIndex: 1, fontSize: compactWorkbench ? "calc(16px * var(--jtype-font-scale, 1) * var(--jtype-zoom, 1))" : "calc(16px * var(--jtype-zoom, 1))" }}
            onClick={handlePreviewClick}
          >
            <h2><Trans>Select a Markdown file</Trans></h2>
            <p><Trans>Your rendered document will appear here.</Trans></p>
          </article>
        </div>
        )}

        {showDesktopDocumentPanel && (
          <aside id="document-panel" className="min-h-0 overflow-y-auto border-l border-black/[0.04] bg-[#f6faf7] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950"><Trans>Document Info</Trans></p>
                <p className="text-xs text-[#6b7773]"><Trans>Properties, outline, links, and publish.</Trans></p>
              </div>
              <button className="subtle-button aspect-square px-0" type="button" title={t`Hide`} onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            {documentInfoSections}
          </aside>
        )}
      </div>

      <Dialog
        open={showMobileDocumentPanel}
        onClose={() => {
          if (state.documentPanelOpen) dispatch({ type: "TOGGLE_DOCUMENT_PANEL" });
        }}
        className="relative z-[75]"
      >
        <DialogBackdrop transition className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm transition data-[closed]:opacity-0" />
        <div className="fixed inset-0 flex items-end overflow-hidden">
          <DialogPanel
            id="document-panel"
            transition
            className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-[#f6faf7] shadow-2xl shadow-stone-950/25 transition duration-200 data-[closed]:translate-y-full"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-5 py-4">
              <div>
                <DialogTitle className="text-sm font-semibold text-stone-950"><Trans>Document Info</Trans></DialogTitle>
                <p className="text-xs text-[#6b7773]"><Trans>Properties, outline, links, and publish.</Trans></p>
              </div>
              <button className="toolbar-button aspect-square px-0" type="button" title={t`Hide`} onClick={() => dispatch({ type: "TOGGLE_DOCUMENT_PANEL" })}>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {documentInfoSections}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {capabilities.isTouchPrimary && compactWorkbench && editorFocused && canEditMarkdown && effectiveEditorMode !== "preview" && (
        <div
          id="mobile-editor-accessory"
          role="toolbar"
          aria-label={t`Keyboard formatting`}
          className="fixed left-1/2 z-[90] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-black/[0.08] bg-white/95 p-1.5 shadow-2xl shadow-stone-950/20 backdrop-blur-xl"
          style={{ bottom: "calc(var(--jtype-keyboard-inset, 0px) + max(0.5rem, env(safe-area-inset-bottom)))" }}
        >
          <MobileAccessoryButton label={t`Undo`} shortcut="Control+Z Meta+Z" onClick={() => runAccessoryCommand("editor.undo")}>
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <MobileAccessoryButton label={t`Redo`} shortcut="Control+Shift+Z Meta+Shift+Z" onClick={() => runAccessoryCommand("editor.redo")}>
            <ArrowUturnRightIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <span className="mx-0.5 h-6 w-px shrink-0 bg-stone-200" aria-hidden />
          <MobileAccessoryButton label={t`Bold`} shortcut="Control+B Meta+B" onClick={() => runAccessoryCommand("editor.bold")}>
            <BoldIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <MobileAccessoryButton label={t`Italic`} shortcut="Control+I Meta+I" onClick={() => runAccessoryCommand("editor.italic")}>
            <ItalicIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <MobileAccessoryButton label={t`Link`} shortcut="Control+K Meta+K" onClick={() => runAccessoryCommand("editor.link")}>
            <LinkIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <MobileAccessoryButton label={t`Task list`} onClick={() => runAccessoryCommand("insert.task")}>
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </MobileAccessoryButton>
          <span className="mx-0.5 h-6 w-px shrink-0 bg-stone-200" aria-hidden />
          <MobileAccessoryButton
            label={t`Dismiss keyboard`}
            onClick={() => {
              void performHaptic("selection");
              setEditorFocused(false);
              editorRef.current?.blur();
            }}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </MobileAccessoryButton>
        </div>
      )}

      {contextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { runCommand("editor.bold"); setContextMenu(null); }}><BoldIcon className="mr-2 h-3.5 w-3.5" /><Trans>Bold</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { runCommand("editor.link"); setContextMenu(null); }}><LinkIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert link</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertOrEditTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert or format table</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { addMarkdownTableRow(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Add table row below</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { addMarkdownTableColumn(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Add table column right</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { formatMarkdownTable(); setContextMenu(null); }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Format table</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertBlockAtSafeCursor("\n$$\nE = mc^2\n$$\n"); setContextMenu(null); }}><VariableIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert formula</Trans></button>
          <button type="button" className="context-menu-button" disabled={!canEditMarkdown} onClick={() => { insertBlockAtSafeCursor("\n```mermaid\nflowchart TD\n  A --> B\n```\n"); setContextMenu(null); }}><ShareIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert Mermaid diagram</Trans></button>
        </div>
      )}
      {floatingTooltip && (
        <FloatingTooltip label={floatingTooltip.label} x={floatingTooltip.x} y={floatingTooltip.y} />
      )}
    </section>
  );
}

function EditorToolbarButton({ title, disabled, runCommand, command, tooltipProps, children }: { title: string; disabled: boolean; runCommand: (id: string) => void; command: string; tooltipProps?: React.HTMLAttributes<HTMLButtonElement>; children: React.ReactNode }) {
  return (
    <button
      className="editor-tool shrink-0"
      type="button"
      aria-label={title}
      aria-disabled={disabled}
      aria-keyshortcuts={command === "editor.bold" ? "Control+B Meta+B" : command === "editor.italic" ? "Control+I Meta+I" : command === "editor.link" ? "Control+K Meta+K" : command === "insert.table" ? "Control+Shift+T Meta+Shift+T" : undefined}
      {...tooltipProps}
      onClick={() => { if (!disabled) runCommand(command); }}
    >
      {children}
    </button>
  );
}

function MobileAccessoryButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activationLockRef = useRef(false);
  const activateOnce = useCallback(() => {
    if (activationLockRef.current) return;
    activationLockRef.current = true;
    onClick();
    window.setTimeout(() => {
      activationLockRef.current = false;
    }, 300);
  }, [onClick]);

  return (
    <button
      type="button"
      className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-stone-600 transition hover:bg-brand-soft hover:text-brand-dark active:bg-brand-soft"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={label}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") event.preventDefault();
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") return;
        event.preventDefault();
        activateOnce();
      }}
      onTouchEnd={(event) => {
        event.preventDefault();
        activateOnce();
      }}
      onMouseDown={(event) => event.preventDefault()}
      onMouseUp={activateOnce}
      onClick={activateOnce}
    >
      {children}
    </button>
  );
}

function PropertiesSection() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const currentVaultSettings = state.workspace ? state.vaultSettings[state.workspace.rootPath] : undefined;
  const currentVaultBinding = state.workspace
    ? state.vaultBindings.find((binding) => binding.localVaultPath === state.workspace?.rootPath)
    : null;
  const readOnly = Boolean(currentVaultBinding?.workspaceRole === "viewer" && currentVaultSettings?.cloudSyncEnabled !== false);
  if (state.currentKind !== "markdown") {
    return (
      <section id="properties-panel" className="document-info-section">
        <p className="text-sm text-stone-500"><Trans>Open a Markdown file to edit frontmatter properties.</Trans></p>
      </section>
    );
  }
  const parsed = parseFrontmatter(state.editorContent);
  const basicFields = ["title", "description", "tags", "slug"];
  const advancedFields = ["createdAt", "updatedAt"];

  const updateField = (field: string, value: string) => {
    if (readOnly) return;
    const editor = document.querySelector<HTMLTextAreaElement>("#editor");
    if (!editor) return;
    const newContent = writeFrontmatter(editor.value, { [field]: value.trim() });
    editor.value = newContent;
    dispatch({ type: "SET_EDITOR_CONTENT", content: newContent });
  };

  return (
    <section id="properties-panel" className="document-info-section">
      <p className="text-sm font-semibold text-stone-950"><Trans>Properties</Trans></p>
      <p className="mt-1 text-xs text-stone-500"><Trans>Edits are written back to YAML frontmatter.</Trans></p>
      <div className="mt-3 space-y-3">
        {basicFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} disabled={readOnly} onUpdate={updateField} />)}
        <details className="rounded-md border border-stone-200 bg-stone-50 p-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase text-stone-500"><Trans>Advanced</Trans></summary>
          <div className="mt-3 space-y-3">
            {advancedFields.map((field) => <PropertyField key={field} field={field} value={parsed.data[field] ?? ""} disabled={readOnly} onUpdate={updateField} />)}
          </div>
        </details>
      </div>
    </section>
  );
}

function PropertyField({ field, value, disabled, onUpdate }: { field: string; value: string; disabled: boolean; onUpdate: (field: string, value: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{field}</span>
      {field === "description" ? (
        <textarea
          className="field-textarea"
          defaultValue={value}
          disabled={disabled}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
          onBlur={(e) => onUpdate(field, e.target.value)}
        />
      ) : (
        <input
          className="field-input"
          defaultValue={value}
          disabled={disabled}
          aria-label={field}
          onChange={(e) => onUpdate(field, e.target.value)}
          onBlur={(e) => onUpdate(field, e.target.value)}
        />
      )}
    </label>
  );
}

/**
 * Scroll the visible editing surface to a heading. `line` is the 0-based line
 * in the full document content (frontmatter included). In write/split mode the
 * textarea is the scroll authority (split-view sync moves the preview along);
 * in preview mode we resolve the nearest `data-source-line`, which is relative
 * to the body, so the frontmatter offset is subtracted first.
 */
function jumpToHeading(content: string, mode: EditorMode, line: number) {
  if (mode === "write" || mode === "split") {
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor) return;
    const lines = editor.value.split("\n");
    let offset = 0;
    for (let i = 0; i < line && i < lines.length; i += 1) offset += lines[i].length + 1;
    editor.focus();
    editor.setSelectionRange(offset, offset + (lines[line]?.length ?? 0));
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 28;
    editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight * 0.3);
    return;
  }
  const preview = document.getElementById("preview");
  if (!preview) return;
  const { body } = parseFrontmatter(content);
  const bodyLine = line - (content.split("\n").length - body.split("\n").length);
  let target: HTMLElement | null = null;
  for (const el of Array.from(preview.querySelectorAll<HTMLElement>("[data-source-line]"))) {
    const sourceLine = Number(el.dataset.sourceLine);
    if (Number.isNaN(sourceLine) || sourceLine > bodyLine) break;
    target = el;
  }
  target?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function OutlineSection() {
  const state = useAppState();
  if (state.currentKind !== "markdown") {
    return (
      <section id="outline-panel" className="document-info-section">
        <p className="text-sm text-stone-500"><Trans>Open a Markdown file to see its outline.</Trans></p>
      </section>
    );
  }
  const headings = state.editorContent.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    return match ? [{ level: match[1].length, title: match[2].trim(), line: index }] : [];
  });
  if (headings.length === 0) {
    return (
      <section id="outline-panel" className="document-info-section">
        <p className="text-sm text-stone-500"><Trans>No headings found.</Trans></p>
      </section>
    );
  }
  return (
    <section id="outline-panel" className="document-info-section">
      <div className="space-y-1">
        {headings.map((h, i) => (
          <button
            key={i}
            type="button"
            className="tree-button"
            style={{ paddingLeft: `${h.level * 0.5}rem` }}
            title={h.title}
            onClick={() => jumpToHeading(state.editorContent, state.editorMode, h.line)}
          >
            {h.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function PublishSection({
  publishState,
  isPublished,
  hasUnpublishedChanges,
  publishedUrl,
  canPublish,
  isLoading,
  onPublish,
  onUnpublish,
}: {
  publishState: PublishStatusResponse | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedUrl: string;
  canPublish: boolean;
  isLoading: boolean;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
}) {
  return (
    <section id="publish-panel" className="document-info-section">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-950"><Trans>Publish</Trans></p>
        <span className={`status-chip ${isPublished ? (hasUnpublishedChanges ? "status-chip-warning" : "status-chip-success") : "status-chip-neutral"}`}>
          <Trans>{isPublished ? (hasUnpublishedChanges ? "Changed" : "Published") : "Not published"}</Trans>
        </span>
      </div>
      {publishState?.publishedAt && (
        <p className="mt-2 text-xs text-stone-500"><Trans>Published {new Date(publishState.publishedAt).toLocaleString()}</Trans></p>
      )}
      {hasUnpublishedChanges && (
        <p className="mt-2 text-xs text-amber-700"><Trans>The public snapshot is behind the current document.</Trans></p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`sidebar-action ${hasUnpublishedChanges ? "bg-amber-500 text-white hover:bg-amber-600 hover:text-white" : ""}`}
          type="button"
          title={hasUnpublishedChanges ? t`Republish` : t`Publish`}
          disabled={!canPublish || isLoading}
          onClick={() => { void onPublish(); }}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          className="sidebar-action hover:text-red-700"
          type="button"
          title={t`Unpublish`}
          disabled={!canPublish || isLoading || !isPublished}
          onClick={() => { void onUnpublish(); }}
        >
          <LinkSlashIcon className="h-4 w-4" />
        </button>
      </div>
      {publishedUrl && (
        <a
          className="mt-2 block truncate text-xs font-semibold text-teal-700"
          href={publishedUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Trans>View published page</Trans>
        </a>
      )}
      <p className="mt-3 text-xs text-stone-500"><Trans>Publishing uses a cloud snapshot; frontmatter status is treated as user metadata.</Trans></p>
    </section>
  );
}

function LinksSection() {
  const state = useAppState();
  if (state.currentKind !== "markdown") {
    return (
      <section className="document-info-section">
        <p className="text-sm text-stone-500"><Trans>Open a Markdown file to inspect links.</Trans></p>
      </section>
    );
  }
  const links: Array<{ target: string; line: number }> = [];
  state.editorContent.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      links.push({ target: match[1], line: index });
    }
    for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      links.push({ target: match[1], line: index });
    }
  });

  const binding = state.vaultBindings.find((b) => b.localVaultPath === state.workspace?.rootPath);
  const cloudWs = binding ? state.cloudWorkspaces.find((w) => w.id === binding.workspaceId) : undefined;
  const wsSlug = cloudWs?.slug || binding?.workspaceSlug || "";
  const publicUrl = state.syncSiteUrl && wsSlug && state.currentRelativePath
    ? `${state.syncSiteUrl.replace(/\/$/, "")}/${wsSlug}/${normalizePath(state.currentRelativePath).replace(/\.(md|markdown|mdown|mkd)$/i, "")}`
    : "";

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950"><Trans>Outgoing links</Trans></p>
      <div className="mt-2 space-y-1">
        {links.length === 0 ? (
          <p className="text-xs text-stone-500"><Trans>No outgoing links.</Trans></p>
        ) : (
          links.map((l, i) => (
            <div key={i} className="rounded-md border border-stone-200 px-2 py-1.5 text-xs">
              <span className="font-semibold text-stone-800">{l.target}</span>
              <span className="ml-2 text-stone-500"><Trans>line {l.line + 1}</Trans></span>
            </div>
          ))
        )}
      </div>
      {publicUrl && (
        <>
          <p className="mt-4 text-sm font-semibold text-stone-950"><Trans>Public URL</Trans></p>
          <p className="mt-2 break-all text-xs text-stone-600">{publicUrl}</p>
        </>
      )}
    </section>
  );
}
