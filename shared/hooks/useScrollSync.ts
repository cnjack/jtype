import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useScrollSync(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  previewRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const isSyncingScroll = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight);
      const targetRange = Math.max(1, target.scrollHeight - target.clientHeight);
      const ratio = source.scrollTop / sourceRange;
      target.scrollTop = ratio * targetRange;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };

    const handleEditorScroll = () => syncScroll(editor, preview);
    const handlePreviewScroll = () => syncScroll(preview, editor);

    editor.addEventListener("scroll", handleEditorScroll);
    preview.addEventListener("scroll", handlePreviewScroll);

    return () => {
      editor.removeEventListener("scroll", handleEditorScroll);
      preview.removeEventListener("scroll", handlePreviewScroll);
    };
  }, [editorRef, previewRef, enabled]);
}
