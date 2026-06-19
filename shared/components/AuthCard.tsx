import type { ReactNode } from "react";

/**
 * AuthCard — unified authentication card shell for Web Login + DeviceOAuth.
 *
 * Props-in / Callbacks-out. No platform coupling.
 * Fixes the card "feel" so login/device-auth stay visually consistent:
 * #f5f8f6 background, rounded-2xl card, ring-1 ring-black/[0.03], JetBrains
 * Mono [J]TYPE wordmark.
 *
 * Two modes:
 *  - split (default when `brand` provided): brand panel on the left, form on right
 *  - single column (no `brand`): centered card, used by device auth
 */
export interface AuthCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Leading icon, shown above the title in single-column mode. */
  icon?: ReactNode;
  /** Optional left brand panel for the split layout. When omitted, single column. */
  brand?: ReactNode;
  /** Bottom slot, typically the login/register switch link. */
  footer?: ReactNode;
  /** Card content (form / OTP). */
  children: ReactNode;
}

export function AuthCard({ title, subtitle, icon, brand, footer, children }: AuthCardProps) {
  if (brand) {
    return (
      <div className="flex min-h-screen">
        <div className="relative hidden flex-col justify-between bg-brand p-12 text-white lg:flex lg:w-[42%]">{brand}</div>
        <div className="flex flex-1 items-center justify-center bg-[#f5f8f6] p-6">
          <div className="auth-card">
            {icon && <div className="auth-card-head">{icon}</div>}
            <h2 className="auth-card-title">{title}</h2>
            {subtitle && <p className="auth-card-sub">{subtitle}</p>}
            {children}
            {footer}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8f6] p-6">
      <div className="auth-card">
        <div className="auth-card-head">
          {icon && <div className="auth-stage-icon">{icon}</div>}
          <h2 className="auth-card-title">{title}</h2>
          {subtitle && <p className="auth-card-sub">{subtitle}</p>}
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

/**
 * Default [J]TYPE wordmark for the brand panel. Callers may pass their own
 * brand node to override (e.g. to localize the tagline).
 */
export function JTypeWordmark({ variant = "light" }: { variant?: "light" | "dark" }) {
  const bracketColor = variant === "light" ? "text-white/40" : "text-stone-400";
  const mainColor = variant === "light" ? "text-white" : "text-stone-900";
  const accentColor = "text-brand-light";
  return (
    <div
      className={`select-none ${variant === "light" ? "" : "text-brand"}`}
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: -0.5,
      }}
    >
      <span className={bracketColor}>[</span>
      <span className={accentColor}>J</span>
      <span className={mainColor}>TYPE</span>
      <span className={bracketColor}>]</span>
    </div>
  );
}
