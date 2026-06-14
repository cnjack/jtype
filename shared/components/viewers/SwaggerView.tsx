import { useEffect, useRef, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { parse as parseYaml } from "yaml";
// Vanilla Swagger UI bundle (no React peer dependency, so it is immune to the
// app's React version). Lazy-loaded with this component.
// @ts-expect-error - swagger-ui-dist ships no type for the bundle entry
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle.js";
import "swagger-ui-dist/swagger-ui.css";

export interface SwaggerViewProps {
  /** OpenAPI/Swagger spec text (JSON or YAML). */
  content: string;
}

function parseSpec(content: string): unknown {
  const text = content.trim();
  if (!text) throw new Error("Empty specification.");
  if (text.startsWith("{") || text.startsWith("[")) {
    return JSON.parse(text);
  }
  return parseYaml(text);
}

/**
 * Read-only Swagger / OpenAPI documentation viewer. Parses a JSON or YAML spec
 * and renders it with the vanilla Swagger UI bundle (try-it-out disabled).
 */
export default function SwaggerView({ content }: SwaggerViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    setError(null);

    let spec: unknown;
    try {
      spec = parseSpec(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    try {
      SwaggerUIBundle({
        spec,
        domNode: node,
        deepLinking: false,
        tryItOutEnabled: false,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      node.innerHTML = "";
    };
  }, [content]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center">
        <p className="text-sm font-medium text-stone-700">
          <Trans>Could not render this API specification.</Trans>
        </p>
        <p className="max-w-md break-words text-xs text-brand-gray">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-auto bg-white">
      <div ref={hostRef} className="swagger-view" />
    </div>
  );
}

export { SwaggerView };
