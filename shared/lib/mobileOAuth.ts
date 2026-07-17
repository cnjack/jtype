/**
 * The mobile OAuth return link deliberately carries no device code, token, or
 * account data. It only brings the already-polling JType app to the foreground.
 */
export const MOBILE_OAUTH_CALLBACK_URL = "jtype://oauth/complete";

export function isMobileOAuthCallbackUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return (
      url.protocol === "jtype:" &&
      url.hostname === "oauth" &&
      url.pathname === "/complete" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
