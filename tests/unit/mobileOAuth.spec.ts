import { expect, test } from "@playwright/test";
import {
  MOBILE_OAUTH_CALLBACK_URL,
  isMobileOAuthCallbackUrl,
} from "../../shared/lib/mobileOAuth";

test("accepts only the credential-free JType OAuth callback", () => {
  expect(isMobileOAuthCallbackUrl(MOBILE_OAUTH_CALLBACK_URL)).toBe(true);
  expect(isMobileOAuthCallbackUrl("jtype://oauth/not-complete")).toBe(false);
  expect(isMobileOAuthCallbackUrl("jtype://oauth/complete?token=secret")).toBe(false);
  expect(isMobileOAuthCallbackUrl("jtype://evil/complete")).toBe(false);
  expect(isMobileOAuthCallbackUrl("https://example.com/oauth/complete")).toBe(false);
  expect(isMobileOAuthCallbackUrl("not a url")).toBe(false);
});
