import { useEffect, useRef, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { extractMxGraphXml } from "./drawioDecode";

export interface DrawioViewProps {
  /** Raw `.drawio` file text (mxGraph XML, possibly compressed). */
  content: string;
}

// Register @maxgraph/core codecs exactly once per session.
let codecsRegistered = false;

/**
 * Read-only, fully-offline Draw.io (diagrams.net) renderer. Decodes the `.drawio`
 * envelope and renders the first page with @maxgraph/core. Standard shapes, text,
 * and edges render faithfully; exotic diagrams.net stencils degrade to labeled
 * boxes (this is a preview, not the full editor).
 */
export default function DrawioView({ content }: DrawioViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let graph: { destroy?: () => void } | null = null;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setError(null);

    (async () => {
      let xml: string;
      try {
        xml = extractMxGraphXml(content);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        return;
      }

      try {
        const maxgraph = await import("@maxgraph/core");
        if (cancelled || !containerRef.current) return;
        const { Graph, ModelXmlSerializer, InternalEvent } = maxgraph;
        if (!codecsRegistered && typeof maxgraph.registerCoreCodecs === "function") {
          maxgraph.registerCoreCodecs();
          codecsRegistered = true;
        }
        InternalEvent.disableContextMenu(container);
        // Cast to a structural type — @maxgraph/core's Graph API is broad and we
        // only need the read-only subset here.
        const g = new Graph(container) as unknown as {
          setEnabled: (v: boolean) => void;
          setPanning: (v: boolean) => void;
          getDataModel: () => unknown;
          fit: (border?: number) => number;
          center: (h?: boolean, v?: boolean) => void;
          destroy?: () => void;
        };
        graph = g;
        g.setEnabled(false);
        g.setPanning(true);
        new ModelXmlSerializer(g.getDataModel() as never).import(xml);
        g.fit(8);
        g.center(true, true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      try {
        graph?.destroy?.();
      } catch {
        /* ignore teardown errors */
      }
    };
  }, [content]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#f8fbf9]">
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-stone-700">
            <Trans>Could not render this Draw.io diagram.</Trans>
          </p>
          <p className="max-w-md break-words text-xs text-brand-gray">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-auto"
          aria-label={t`Draw.io diagram`}
        />
      )}
    </div>
  );
}

export { DrawioView };
