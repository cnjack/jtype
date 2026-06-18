import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// While a pane is actively scrolled it "owns" the sync; scroll events on the
// other pane within this idle window are treated as programmatic echoes and
// ignored. Continued scrolling on the active pane keeps refreshing the timer.
const SYNC_LOCK_MS = 100;

export function useScrollSync(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  previewRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const activeSource = useRef<HTMLElement | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    // Setting `target.scrollTop` fires a `scroll` event on the target on a
    // later frame. Rather than guess when that echo lands (a rAF-cleared flag
    // races it and lets the echo sync back, quantizing the position upward),
    // we lock to whichever pane the user is actively scrolling and ignore the
    // other pane's events until it goes idle.
    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (activeSource.current && activeSource.current !== source) return;
      activeSource.current = source;
      const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight);
      const targetRange = Math.max(1, target.scrollHeight - target.clientHeight);
      const ratio = source.scrollTop / sourceRange;
      target.scrollTop = ratio * targetRange;
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        activeSource.current = null;
      }, SYNC_LOCK_MS);
    };

    const handleEditorScroll = () => syncScroll(editor, preview);
    const handlePreviewScroll = () => syncScroll(preview, editor);

    editor.addEventListener("scroll", handleEditorScroll, { passive: true });
    preview.addEventListener("scroll", handlePreviewScroll, { passive: true });

    return () => {
      editor.removeEventListener("scroll", handleEditorScroll);
      preview.removeEventListener("scroll", handlePreviewScroll);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      activeSource.current = null;
    };
  }, [editorRef, previewRef, enabled]);
}
