import { formatAppVersion } from "@shared/lib/version";

interface AppVersionProps {
  className?: string;
}

export function AppVersion({ className = "" }: AppVersionProps) {
  const label = formatAppVersion();

  return (
    <span className={`app-version ${className}`.trim()} title={`JType ${label}`}>
      {label}
    </span>
  );
}
