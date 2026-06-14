import { useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

export interface MermaidViewProps {
  /** Mermaid source text (the `.mmd` file content). */
  content: string;
  /** When true, show the source editor alongside the live preview. */
  editable?: boolean;
  /** Called with the new source on every edit. */
  onChange?: (next: string) => void;
}

// Mermaid is heavy, so it is imported on first render and cached for the session.
let mermaidModule: typeof import("mermaid")["default"] | null = null;
let mermaidIdCounter = 0;

async function getMermaid() {
  if (!mermaidModule) {
    const mod = await import("mermaid");
    mermaidModule = mod.default;
    mermaidModule.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
  }
  return mermaidModule;
}

/**
 * Standalone Mermaid (`.mmd`) viewer/editor: a live diagram preview, with an
 * optional source pane for editing. Reuses the same Mermaid renderer (strict
 * security) as fenced ```mermaid code blocks in Markdown.
 */
export default function MermaidView({ content, editable = false, onChange }: MermaidViewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped on each render request so a stale async render can bail out.
  const renderToken = useRef(0);

  useEffect(() => {
    const token = ++renderToken.current;
    const container = previewRef.current;
    if (!container) return;

    const source = content.trim();
    if (!source) {
      container.innerHTML = "";
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const mermaid = await getMermaid();
        if (token !== renderToken.current) return;
        const id = `mmd-view-${++mermaidIdCounter}`;
        const { svg } = await mermaid.render(id, source);
        if (token !== renderToken.current || !previewRef.current) return;
        previewRef.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        if (token !== renderToken.current) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [content]);

  const preview = (
    <div className="relative min-h-0 flex-1 overflow-auto bg-[#f8fbf9] p-6">
      {error ? (
        <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">
            <Trans>Diagram error</Trans>
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
        </div>
      ) : null}
      <div ref={previewRef} className="mermaid-standalone flex justify-center [&_svg]:max-w-full" aria-label={t`Mermaid diagram`} />
      {!content.trim() && (
        <p className="text-center text-sm text-brand-gray">
          <Trans>Write Mermaid syntax to see the diagram.</Trans>
        </p>
      )}
    </div>
  );

  if (!editable) {
    return <div className="flex h-full min-h-0 flex-col bg-[#fbfdfb]">{preview}</div>;
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-[#fbfdfb] md:grid-cols-2">
      <textarea
        className="h-full min-h-0 w-full resize-none border-r border-black/[0.05] bg-white/40 p-6 font-mono text-[13px] leading-7 text-stone-800 outline-none placeholder:text-[#9aa6a1]"
        spellCheck={false}
        value={content}
        aria-label={t`Mermaid source`}
        placeholder={t`flowchart TD\n  A[Start] --> B[End]`}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {preview}
    </div>
  );
}

export { MermaidView };
