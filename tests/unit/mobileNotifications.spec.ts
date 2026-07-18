import { expect, test } from "@playwright/test";
import {
  MOBILE_COLLABORATION_PREVIEW_DELAY_MS,
  mobileCollaborationPreviewDelayMs,
  mobileNotificationDeliveryMode,
} from "../../src/lib/mobileNotifications";

test("keeps simulator collaboration previews scheduled after first paint", () => {
  expect(mobileCollaborationPreviewDelayMs("android")).toBe(MOBILE_COLLABORATION_PREVIEW_DELAY_MS);
  expect(mobileCollaborationPreviewDelayMs("ios")).toBe(MOBILE_COLLABORATION_PREVIEW_DELAY_MS);
  expect(mobileCollaborationPreviewDelayMs("desktop")).toBeUndefined();
});

test("defers iOS notification plugin delivery until after first paint", () => {
  expect(mobileNotificationDeliveryMode("ios", 2_500)).toBe("inProcessDelay");
  expect(mobileNotificationDeliveryMode("ios", 0)).toBe("immediate");
});

test("keeps Android delayed delivery in the native scheduler", () => {
  expect(mobileNotificationDeliveryMode("android", 2_500)).toBe("nativeSchedule");
  expect(mobileNotificationDeliveryMode("android")).toBe("immediate");
});
