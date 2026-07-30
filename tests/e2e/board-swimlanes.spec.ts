import { expect, test } from "@playwright/test";

type HarnessState = {
  config: {
    columns?: Array<{ key: string }>;
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
  actions: Array<{
    type: "setConfig" | "updateCards";
    swimlaneKeys?: string[];
    cardIds?: string[];
  }>;
};

const openHarness = async (page: import("@playwright/test").Page) => {
  await page.goto("/tests/fixtures/board-swimlanes.html");
  await expect(page.getByText("Product roadmap")).toBeVisible();
};

const state = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __BOARD_TEST_STATE__: HarnessState }).__BOARD_TEST_STATE__);

test("custom rows render as one editable grid and keep empty rows", async ({ page }) => {
  await openHarness(page);

  await expect(page.locator("[data-swimlane-scrollport]")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Platform" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  await expect(page.getByText("0 cards")).toBeVisible();

  await page.getByRole("button", { name: "Manage custom rows" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom rows" });
  await expect(dialog.getByRole("heading", { name: "Manage custom rows" })).toBeVisible();
  await dialog.getByRole("button", { name: "Add row" }).click();
  await dialog.getByRole("textbox", { name: "Row name" }).fill("Research");
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

test("default row delete preserves card key and surfaces the dangling mapping", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Manage custom rows" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom rows" });
  await dialog.getByRole("button", { name: "Actions for Platform" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const deleteDialog = page.getByRole("dialog", { name: 'Delete "Platform"?' });
  await expect(deleteDialog.getByText("Keep cards in Unassigned")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete row" }).click();

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
  await page.getByRole("button", { name: "Manage custom rows" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom rows" });
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

  const actionLog = (await state(page)).actions;
  const cardMoveIndex = actionLog.findIndex(
    (action) =>
      action.type === "updateCards" &&
      action.cardIds?.some((cardId) => cardId.endsWith("analytics.md")),
  );
  const laneRemovalIndex = actionLog.findIndex(
    (action) =>
      action.type === "setConfig" &&
      action.swimlaneKeys != null &&
      !action.swimlaneKeys.includes("lane_growth_22222222"),
  );
  expect(cardMoveIndex).toBeGreaterThanOrEqual(0);
  expect(laneRemovalIndex).toBeGreaterThan(cardMoveIndex);
});

test("status swimlane actions reorder the status definitions, not the column groups", async ({ page }) => {
  await openHarness(page);
  await page.locator("select").first().selectOption("priority");
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("status");

  await page.getByRole("button", { name: "Actions for To do" }).click();
  await page.getByRole("menuitem", { name: "Move down" }).click();

  await expect
    .poll(async () => (await state(page)).config.columns?.map((column) => column.key))
    .toEqual(["doing", "todo", "done"]);
});

test("manage statuses stays visible and adds a workflow status independently of rows", async ({ page }) => {
  await openHarness(page);

  await page.getByRole("button", { name: "Manage statuses" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage statuses" });
  await expect(dialog.getByText("cards stay mapped by status ID")).toBeVisible();
  await expect(dialog.getByText("Status ID: todo")).toBeVisible();
  await dialog.getByRole("button", { name: "Add status" }).click();
  await dialog.getByRole("textbox", { name: "Status name" }).fill("Review");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect
    .poll(async () => (await state(page)).config.columns?.map((column) => column.key))
    .toContain("review");

  await dialog.getByRole("button", { name: "Actions for Review" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect
    .poll(async () => (await state(page)).config.columns?.map((column) => column.key))
    .not.toContain("review");
});

test("lightweight filters OR values within a section and AND across sections", async ({ page }) => {
  await openHarness(page);

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("checkbox", { name: "high" }).click();
  await page.getByRole("checkbox", { name: "medium" }).click();
  await page.getByRole("checkbox", { name: "My cards" }).click();

  await expect(page.getByText("1 of 4 cards shown")).toBeVisible();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  await expect(page.getByText("Publishing analytics")).toBeHidden();
  const priorityChip = page.getByRole("button", { name: /Remove filter: Priority/ });
  const mineChip = page.getByRole("button", { name: /Remove filter: My cards/ });
  await expect(priorityChip).toBeVisible();
  await expect(mineChip).toBeVisible();

  await priorityChip.click();
  await expect(page.getByText("Publishing analytics")).toBeHidden();
  await expect(page.getByText("Legacy lane cleanup")).toBeVisible();
  await mineChip.click();
  await expect(page.getByText("Publishing analytics")).toBeVisible();
});

test("priority conversion keeps priority and finishes with reusable custom row IDs", async ({ page }) => {
  await openHarness(page);
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("priority");
  await page.getByRole("button", { name: "Make rows editable" }).click();

  const dialog = page.getByRole("dialog", { name: "Make priority rows editable?" });
  await expect(dialog.getByText("High", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Create editable rows" }).click();

  await expect.poll(async () => (await state(page)).config.swimlaneBy).toBe("custom");
  const final = await state(page);
  expect(final.config.swimlaneMigration).toBeUndefined();
  const high = final.cards.find((card) => card.id.endsWith("offline.md"));
  expect(high?.priority).toBe("high");
  expect(high?.swimlaneKey).toMatch(/^lane_high_/);
  expect(final.config.swimlanes?.some((lane) => lane.key === high?.swimlaneKey)).toBe(true);
});

test("conversion stops after bounded retries when card writes do not persist", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_DROP_UPDATES__: boolean }).__BOARD_TEST_DROP_UPDATES__ = true;
  });
  await openHarness(page);
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("priority");
  await page.getByRole("button", { name: "Make rows editable" }).click();

  const dialog = page.getByRole("dialog", { name: "Make priority rows editable?" });
  await dialog.getByRole("button", { name: "Create editable rows" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Conversion stopped because card updates did not persist.",
  );

  const updateAttempts = (await state(page)).actions.filter(
    (action) => action.type === "updateCards",
  );
  expect(updateAttempts).toHaveLength(2);
});
