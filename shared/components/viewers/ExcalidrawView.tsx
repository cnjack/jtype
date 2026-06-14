import { useCallback, useEffect, useMemo, useRef, type ComponentProps } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export interface ExcalidrawViewProps {
  /** `.excalidraw` file content (JSON text). */
  content: string;
  /** When false, the canvas is shown read-only (view mode). */
  editable?: boolean;
  /** Called (debounced) with the serialized `.excalidraw` JSON on edits. */
  onChange?: (next: string) => void;
}

type SceneData = {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

function parseScene(content: string): SceneData | undefined {
  const text = content?.trim();
  if (!text) return undefined;
  try {
    const data = JSON.parse(text) as SceneData;
    if (data && typeof data === "object" && data.appState) {
      // `collaborators` must be a Map at runtime; saved files shouldn't include
      // it, but strip it defensively so a hand-edited file can't crash the editor.
      delete (data.appState as Record<string, unknown>).collaborators;
    }
    return data;
  } catch {
    return undefined;
  }
}

/**
 * Full Excalidraw canvas editor backed by a `.excalidraw` JSON file. Loads the
 * scene once, and reports serialized changes (debounced) so the host can persist
 * them through the normal save flow. Heavy — always lazy-loaded by the host.
 */
export default function ExcalidrawView({ content, editable = true, onChange }: ExcalidrawViewProps) {
  // Parse the initial scene once; subsequent edits flow through onChange, never
  // back into initialData (which would reset the canvas mid-edit).
  const initialData = useMemo((): ComponentProps<typeof Excalidraw>["initialData"] => {
    const scene = parseScene(content);
    return { ...(scene ?? {}), scrollToContent: true } as ComponentProps<typeof Excalidraw>["initialData"];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // null until the first onChange (the on-load event) establishes the baseline,
  // so loading a file is never reported as an edit. serializeAsJSON output rarely
  // byte-matches the raw on-disk text, so we can't seed it from `content`.
  const lastSerialized = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending debounced save on unmount, so a file switch within the
  // debounce window can't fire onChange with this (now stale) file's content.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleChange = useCallback(() => {
    if (!onChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const api = apiRef.current;
      if (!api) return;
      const next = serializeAsJSON(
        api.getSceneElements(),
        api.getAppState(),
        api.getFiles(),
        "local",
      );
      // Excalidraw fires onChange once after the initial scene loads; treat that
      // first event as the baseline rather than a user edit.
      if (lastSerialized.current === null) {
        lastSerialized.current = next;
        return;
      }
      if (next !== lastSerialized.current) {
        lastSerialized.current = next;
        onChange(next);
      }
    }, 400);
  }, [onChange]);

  return (
    <div className="excalidraw-host h-full min-h-0 w-full">
      <Excalidraw
        initialData={initialData}
        viewModeEnabled={!editable}
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        onChange={editable ? handleChange : undefined}
      />
    </div>
  );
}

export { ExcalidrawView };
