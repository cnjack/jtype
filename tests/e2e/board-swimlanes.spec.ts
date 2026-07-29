import { expect, test } from "@playwright/test";

type HarnessState = {
  config: {
    swimlaneBy?: string;
    swimlanes?: Array<{ key: string; name: string; color?: string | null }>;
    swimlaneMigration?: unknown;
  };
  cards: Array<{
    id: string;
    title: string;
    priority?: string | null;
    swimlaneKey?: string | null;
  }>;
};

const openHarness = async (page: import("@playwright/test").Page) => {
  await page.goto("/tests/fixtures/board-swimlanes.html");
  await expect(page.getByText("Product roadmap")).toBeVisible();
};

const state = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __BOARD_TEST_STATE__: HarnessState }).__BOARD_TEST_STATE__);

test("custom swimlanes render as one editable grid and keep empty lanes", async ({ page }) => {
  await openHarness(page);

  await expect(page.locator("[data-swimlane-scrollport]")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Platform" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  await expect(page.getByText("0 cards")).toBeVisible();

  await page.getByRole("button", { name: "Manage swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage swimlanes" });
  await expect(dialog.getByRole("heading", { name: "Manage swimlanes" })).toBeVisible();
  await dialog.getByRole("button", { name: "Add swimlane" }).click();
  await dialog.getByRole("textbox", { name: "Swimlane name" }).fill("Research");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect
    .poll(async () => (await state(page)).config.swimlanes?.map((lane) => lane.name))
    .toContain("Research");
  await expect(dialog.getByText("Research", { exact: true })).toBeVisible();
});

test("Peek changes card mapping by stable lane key", async ({ page }) => {
  await openHarness(page);
  await page.getByText("Offline conflict indicator").click();

  await page.getByPlaceholder("Untitled card").fill("Offline conflict state");
  await page.getByRole("button", { name: "Platform", exact: true }).click();
  await page.getByRole("option", { name: "Growth" }).click();

  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("offline.md"))?.swimlaneKey)
    .toBe("lane_growth_22222222");
  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("offline.md"))?.title)
    .toBe("Offline conflict state");
});

test("default delete preserves card key and surfaces the dangling mapping", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Manage swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage swimlanes" });
  await dialog.getByRole("button", { name: "Actions for Platform" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const deleteDialog = page.getByRole("dialog", { name: 'Delete "Platform"?' });
  await expect(deleteDialog.getByText("Keep cards in Unassigned")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete swimlane" }).click();

  await expect
    .poll(async () => (await state(page)).config.swimlanes?.some((lane) => lane.name === "Platform"))
    .toBe(false);
  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("offline.md"))?.swimlaneKey)
    .toBe("lane_platform_11111111");
  await expect(dialog.getByRole("button", { name: "Show affected cards" })).toBeVisible();
});

test("move-before-delete updates cards before removing the lane", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Manage swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage swimlanes" });
  await dialog.getByRole("button", { name: "Actions for Growth" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const deleteDialog = page.getByRole("dialog", { name: 'Delete "Growth"?' });
  await deleteDialog.getByText("Move cards before deleting").click();
  await deleteDialog.getByRole("button", { name: "Move cards and delete" }).click();

  await expect
    .poll(async () => (await state(page)).config.swimlanes?.some((lane) => lane.name === "Growth"))
    .toBe(false);
  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("analytics.md"))?.swimlaneKey)
    .toBeNull();
});

test("priority conversion keeps priority and finishes with reusable custom lane IDs", async ({ page }) => {
  await openHarness(page);
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("priority");
  await page.getByRole("button", { name: "Make swimlanes editable" }).click();

  const dialog = page.getByRole("dialog", { name: "Make priority swimlanes editable?" });
  await expect(dialog.getByText("High", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Create editable swimlanes" }).click();

  await expect.poll(async () => (await state(page)).config.swimlaneBy).toBe("custom");
  const final = await state(page);
  expect(final.config.swimlaneMigration).toBeUndefined();
  const high = final.cards.find((card) => card.id.endsWith("offline.md"));
  expect(high?.priority).toBe("high");
  expect(high?.swimlaneKey).toMatch(/^lane_high_/);
  expect(final.config.swimlanes?.some((lane) => lane.key === high?.swimlaneKey)).toBe(true);
});
