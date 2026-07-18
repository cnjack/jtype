import { useEffect, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  CheckIcon,
  ArrowPathIcon,
  XMarkIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";

/**
 * DeviceAuthWaiting — the "waiting for browser authorization" state view,
 * shown inside AccountDialog after "Connect in browser" is clicked.
 *
 * Replaces the single-line subtitle that made the flow feel like it ended
 * abruptly. Shows: countdown ring (10-min expiry, matching backend
 * `INTERVAL 10 MINUTE`), large copyable user code, three-step progress,
 * and Cancel / Reopen browser actions.
 */

const EXPIRY_SECONDS = 10 * 60; // backend oauth.rs: INTERVAL 10 MINUTE

/** Local countdown driven by the OAuth start timestamp. */
function useCountdown(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!startedAt) return { remaining: 0, expired: false, progress: 0 };
  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = Math.max(0, EXPIRY_SECONDS - elapsed);
  return {
    remaining,
    expired: remaining <= 0,
    progress: remaining / EXPIRY_SECONDS,
  };
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface DeviceAuthWaitingProps {
  userCode: string;
  startedAt: number | null;
  onCancel: () => void;
  onReopenBrowser: () => void;
  onStartAgain: () => void;
}

export function DeviceAuthWaiting({ userCode, startedAt, onCancel, onReopenBrowser, onStartAgain }: DeviceAuthWaitingProps) {
  const { remaining, expired, progress } = useCountdown(startedAt);
  const [copied, setCopied] = useState(false);

  // Circle geometry: r=27 → circumference ≈ 169.6
  const circumference = 2 * Math.PI * 27;
  const dashOffset = circumference * (1 - progress);

  const copyCode = () => {
    if (!userCode) return;
    navigator.clipboard?.writeText(userCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="mx-auto max-w-md py-2 text-center">
      {/* Countdown ring */}
      <div className="ring-wrap">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle className="ring-bg" cx="32" cy="32" r="27" fill="none" strokeWidth="4" />
          <circle
            className={`ring-fg ${expired ? "expired" : ""}`}
            cx="32" cy="32" r="27" fill="none" strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={expired ? 0 : dashOffset}
          />
        </svg>
        <div className="ring-center">
          <span className={`ring-time ${expired ? "expired" : ""}`}>
            {expired ? t`Expired` : formatTime(remaining)}
          </span>
          {!expired && <span className="ring-label"><Trans>remaining</Trans></span>}
        </div>
      </div>

      <h3 className="mb-1 text-lg font-bold tracking-tight text-stone-900">
        {expired ? <Trans>Verification code expired</Trans> : <Trans>Waiting for web confirmation</Trans>}
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-stone-500">
        {expired
          ? <Trans>Codes expire after 10 minutes. Generate a new one to continue.</Trans>
          : <Trans>A browser opened to the authorization page. Enter the code below to finish signing in.</Trans>}
      </p>

      {/* Large display code */}
      {!expired && (
        <>
          <p className="code-label mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <Trans>Enter this code on the web</Trans>
          </p>
          <button
            type="button"
            onClick={copyCode}
            title={t`Click to copy`}
            className="display-code mx-auto mb-1 cursor-pointer"
          >
            {userCode.split("").map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </button>
          <p className="mb-5 text-[11px] text-brand">
            {copied ? <Trans>Copied</Trans> : <Trans>Click code to copy</Trans>}
          </p>

          {/* Three-step progress */}
          <div className="auth-steps">
            <div className="step done">
              <div className="step-dot"><CheckIcon className="h-3 w-3" /></div>
              <Trans>Browser opened</Trans>
            </div>
            <div className="step active">
              <div className="step-dot">2</div>
              <Trans>Web confirmation</Trans>
            </div>
            <div className="step">
              <div className="step-dot">3</div>
              <Trans>Done</Trans>
            </div>
          </div>

          <div className="mt-5 flex justify-center gap-2">
            <button className="subtle-button" type="button" onClick={onCancel}>
              <XMarkIcon className="h-3.5 w-3.5" />
              <Trans>Cancel</Trans>
            </button>
            <button className="toolbar-button" type="button" onClick={onReopenBrowser}>
              <ArrowPathIcon className="h-3.5 w-3.5" />
              <Trans>Reopen browser</Trans>
            </button>
          </div>
        </>
      )}

      {expired && (
        <div className="mt-4 flex justify-center">
          <button className="toolbar-button toolbar-button-primary" type="button" onClick={onStartAgain}>
            <ComputerDesktopIcon className="h-4 w-4" />
            <Trans>Start again</Trans>
          </button>
        </div>
      )}
    </section>
  );
}
