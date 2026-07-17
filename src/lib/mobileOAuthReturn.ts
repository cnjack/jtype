type OAuthReturnHandler = () => void;

let activeHandler: OAuthReturnHandler | null = null;

/** Register the single in-progress device flow that a mobile deep link may wake. */
export function registerMobileOAuthReturnHandler(handler: OAuthReturnHandler): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

/** Returns false for stale or manually forged callbacks with no active flow. */
export function notifyMobileOAuthReturn(): boolean {
  if (!activeHandler) return false;
  activeHandler();
  return true;
}
