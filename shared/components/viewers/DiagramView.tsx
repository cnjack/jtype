import { lazy, Suspense } from "react";
import { Trans } from "@lingui/react/macro";
import { resourceTypeForPath } from "../../lib/fileTypes";

// Each heavy viewer/editor is code-split into its own chunk and only fetched
// when a file of that type is opened.
const MermaidView = lazy(() => import("./MermaidView"));
const DrawioView = lazy(() => import("./DrawioView"));
const ExcalidrawView = lazy(() => import("./ExcalidrawView"));
const SwaggerView = lazy(() => import("./SwaggerView"));

export interface DiagramViewProps {
  /** Path of the file (drives which viewer/editor renders). */
  path: string;
  /** The file's text content. */
  content: string;
  /** Whether in-app editing is allowed (combined with the type's own capability). */
  editable?: boolean;
  /** Called with new content on edits (editable types only). */
  onChange?: (next: string) => void;
  /** Called with the latest content when the user presses Ctrl/Cmd+S (Mermaid, Excalidraw). */
  onSave?: (next: string) => void;
}

function ViewerLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-[#fbfdfb]">
      <div className="h-24 w-40 animate-pulse rounded-xl bg-stone-200/70" />
    </div>
  );
}

/**
 * Routes a text-based "diagram" resource (Mermaid, Draw.io, Excalidraw, or
 * Swagger/OpenAPI) to its dedicated viewer/editor. Shared by the desktop and web
 * shells so both render these file types identically. Keyed by `path` so opening
 * a different file remounts the underlying editor with fresh state.
 */
export function DiagramView({ path, content, editable = false, onChange, onSave }: DiagramViewProps) {
  const def = resourceTypeForPath(path);
  const canEdit = editable && def.editable;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fbfdfb]">
      <Suspense fallback={<ViewerLoading />}>
        {def.viewer === "mermaid" ? (
          <MermaidView key={path} content={content} editable={canEdit} onChange={onChange} onSave={onSave} />
        ) : def.viewer === "drawio" ? (
          <DrawioView key={path} content={content} />
        ) : def.viewer === "excalidraw" ? (
          <ExcalidrawView key={path} content={content} editable={canEdit} onChange={onChange} onSave={onSave} />
        ) : def.viewer === "swagger" ? (
          <SwaggerView key={path} content={content} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-brand-gray">
            <Trans>This file type can not be previewed yet.</Trans>
          </div>
        )}
      </Suspense>
    </div>
  );
}

export default DiagramView;
