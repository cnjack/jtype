import { ArrowUpCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useAppUpdate } from "../../hooks/useAppUpdate";
import { formatAppVersion } from "@shared/lib/version";

/**
 * Floating toast that appears (bottom-right) when the desktop auto-updater finds
 * a newer signed release. Lets the user download + install it in place. No-op in
 * the browser build — the underlying hook short-circuits off the Tauri runtime.
 */
export function UpdateBanner() {
  const update = useAppUpdate();

  if (!update.visible) return null;

  const newVersion = update.version ? formatAppVersion(update.version) : "";
  const busy = update.status === "downloading" || update.status === "installed";
  const percent = Math.round(update.progress * 100);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-[min(360px,calc(100vw-2rem))]">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-emerald-950/10 ring-1 ring-black/[0.04] backdrop-blur">
        <div className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#008884]/10 text-[#008884]">
            <ArrowUpCircleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900">
              {update.status === "installed" ? (
                <Trans>Restarting to finish update…</Trans>
              ) : update.status === "downloading" ? (
                <Trans>Downloading update…</Trans>
              ) : (
                <Trans>A new version is available</Trans>
              )}
            </p>
            {newVersion && update.status !== "downloading" && update.status !== "installed" && (
              <p className="mt-0.5 text-xs text-stone-500">
                <Trans>Update to {newVersion}</Trans>
              </p>
            )}
            {update.notes && update.status === "available" && (
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-stone-500">
                {update.notes}
              </p>
            )}
            {update.status === "error" && update.error && (
              <p className="mt-2 text-xs text-red-600">{update.error}</p>
            )}

            {busy && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-[#008884] transition-[width] duration-200"
                    style={{ width: `${update.status === "installed" ? 100 : percent}%` }}
                  />
                </div>
                {update.status === "downloading" && (
                  <p className="mt-1 text-right text-[11px] tabular-nums text-stone-400">{percent}%</p>
                )}
              </div>
            )}

            {!busy && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void update.installUpdate()}
                  className="rounded-lg bg-[#008884] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#006f6b]"
                >
                  {update.status === "error" ? <Trans>Retry</Trans> : <Trans>Update &amp; restart</Trans>}
                </button>
                <button
                  type="button"
                  onClick={update.dismiss}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <Trans>Later</Trans>
                </button>
              </div>
            )}
          </div>
          {!busy && (
            <button
              type="button"
              onClick={update.dismiss}
              title={t`Dismiss`}
              className="shrink-0 rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
