import { expect, test } from "@playwright/test";

type HarnessState = {
  config: {
    columns?: Array<{ key: string }>;
    groupBy?: string;
    swimlaneBy?: string;
    swimlanes?: Array<{ key: string; name: string; color?: string | null }>;
    swimlaneMigration?: unknown;
  };
  cards: Array<{
    id: string;
    title: string;
    priority?: string | null;
    columnKey?: string;
    assignee?: string | null;
    due?: string | null;
    notes?: string;
    tags?: Array<{ label: string }>;
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

test("custom swimlanes render as vertical columns and keep empty swimlanes", async ({ page }) => {
  await openHarness(page);

  await expect(page.locator("[data-swimlane-scrollport]")).toHaveCount(0);
  await expect(page.locator('[data-col-key="lane_platform_11111111"]')).toContainText("Platform");
  await expect(page.locator('[data-col-key="lane_growth_22222222"]')).toContainText("Growth");
  await expect(page.locator('[data-col-key="lane_operations_33333333"]')).toContainText("Operations");
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();

  await page.getByRole("button", { name: "Manage custom swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom swimlanes" });
  await expect(dialog.getByRole("heading", { name: "Manage custom swimlanes" })).toBeVisible();
  await dialog.getByRole("button", { name: "Add swimlane" }).click();
  await dialog.getByRole("textbox", { name: "Swimlane name" }).fill("Research");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect
    .poll(async () => (await state(page)).config.swimlanes?.map((lane) => lane.name))
    .toContain("Research");
  await expect(dialog.getByText("Research", { exact: true })).toBeVisible();
});

test("dragging a card between vertical custom swimlanes updates its stable mapping", async ({
  page,
}) => {
  await openHarness(page);

  const card = page.locator('[data-card-id="roadmap/analytics.md"]');
  const target = page.locator('[data-col-key="lane_platform_11111111"]');
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox!.x + cardBox!.width / 2 + 8, cardBox!.y + cardBox!.height / 2, {
    steps: 4,
  });
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 160, {
    steps: 12,
  });
  await page.mouse.up();

  await expect
    .poll(
      async () =>
        (await state(page)).cards.find((item) => item.id.endsWith("analytics.md"))
          ?.swimlaneKey,
    )
    .toBe("lane_platform_11111111");
  await expect(target).toContainText("Publishing analytics");

  const movedCard = page.locator('[data-card-id="roadmap/analytics.md"]');
  const unassigned = page.locator('[data-col-key=""]');
  const movedCardBox = await movedCard.boundingBox();
  const unassignedBox = await unassigned.boundingBox();
  expect(movedCardBox).not.toBeNull();
  expect(unassignedBox).not.toBeNull();

  await page.mouse.move(
    movedCardBox!.x + movedCardBox!.width / 2,
    movedCardBox!.y + movedCardBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    movedCardBox!.x + movedCardBox!.width / 2 + 8,
    movedCardBox!.y + movedCardBox!.height / 2,
    { steps: 4 },
  );
  await page.mouse.move(
    unassignedBox!.x + unassignedBox!.width / 2,
    unassignedBox!.y + 160,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect
    .poll(
      async () =>
        (await state(page)).cards.find((item) => item.id.endsWith("analytics.md"))
          ?.swimlaneKey,
    )
    .toBeNull();
  await expect(unassigned).toContainText("Publishing analytics");
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

test("quick create captures card details and opens the full detail dialog", async ({ page }) => {
  await openHarness(page);
  const platform = page.locator('[data-col-key="lane_platform_11111111"]');
  await platform.getByRole("button", { name: "New card" }).click();

  const createDialog = page.getByRole("dialog", { name: "New card" });
  await expect(createDialog.getByText("Product roadmap")).toBeVisible();
  await expect(createDialog.getByText("Platform", { exact: true })).toBeVisible();
  await createDialog.getByRole("textbox", { name: "Card title" }).fill("Polished create flow");
  await createDialog.getByRole("textbox", { name: "Description" }).fill("A focused Markdown description.");
  await createDialog.getByRole("button", { name: "To do" }).click();
  await page.getByRole("option", { name: "Doing" }).click();
  await createDialog.getByRole("button", { name: "none" }).click();
  await page.getByRole("option", { name: "high" }).click();
  await createDialog.getByRole("textbox", { name: "Assignee" }).fill("Maya");
  await createDialog.getByRole("textbox", { name: "Tags" }).fill("design, frontend");
  await createDialog.getByLabel("Due").fill("2026-08-14");
  await createDialog.getByRole("button", { name: "Create card" }).click();

  await expect(page.getByRole("dialog", { name: "Card details" })).toBeVisible();
  await expect(page.getByPlaceholder("Untitled card")).toHaveValue("Polished create flow");
  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.title === "Polished create flow"))
    .toMatchObject({
      columnKey: "doing",
      priority: "high",
      assignee: "Maya",
      due: "2026-08-14",
      notes: "A focused Markdown description.",
      tags: [{ label: "design" }, { label: "frontend" }],
      swimlaneKey: "lane_platform_11111111",
    });
});

test("quick create preserves the draft when saving fails", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_CREATE_FAILURE__: boolean }).__BOARD_TEST_CREATE_FAILURE__ = true;
  });
  await openHarness(page);
  const platform = page.locator('[data-col-key="lane_platform_11111111"]');
  await platform.getByRole("button", { name: "New card" }).click();

  const createDialog = page.getByRole("dialog", { name: "New card" });
  const title = createDialog.getByRole("textbox", { name: "Card title" });
  await title.fill("Keep this draft");
  await createDialog.getByRole("button", { name: "Create card" }).click();

  await expect(createDialog.getByRole("alert")).toHaveText("Could not create card. Try again.");
  await expect(title).toHaveValue("Keep this draft");
  await expect
    .poll(async () => (await state(page)).cards.some((card) => card.title === "Keep this draft"))
    .toBe(false);
});

test("sub-card creation persists the parent in the initial write", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: /Offline conflict indicator/ }).click();

  const detail = page.getByRole("dialog", { name: "Card details" });
  const childInput = detail.getByPlaceholder("+ Add sub-card");
  await childInput.fill("Write conflict guide");
  await childInput.press("Enter");

  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.title === "Write conflict guide"))
    .toMatchObject({
      parent: "roadmap/offline",
      columnKey: "todo",
      swimlaneKey: "lane_platform_11111111",
    });
  await expect(detail.getByRole("button", { name: /Write conflict guide/ })).toBeVisible();
});

test("default swimlane delete preserves card key and surfaces the dangling mapping", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Manage custom swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom swimlanes" });
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
  await page.getByRole("button", { name: "Manage custom swimlanes" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage custom swimlanes" });
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

test("status swimlane actions reorder the vertical status columns", async ({ page }) => {
  await openHarness(page);
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("status");

  await page.getByRole("button", { name: "Manage statuses" }).click();
  const dialog = page.getByRole("dialog", { name: "Manage statuses" });
  await dialog.getByRole("button", { name: "Actions for To do" }).click();
  await page.getByRole("menuitem", { name: "Move down" }).click();

  await expect
    .poll(async () => (await state(page)).config.columns?.map((column) => column.key))
    .toEqual(["doing", "todo", "done"]);
});

test("manage statuses adds a workflow swimlane", async ({ page }) => {
  await openHarness(page);

  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("status");
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
  // This chip removes itself synchronously. Dispatching the semantic click
  // avoids Playwright retrying an action whose target correctly disappears
  // between the event handler and post-action stability check.
  await mineChip.dispatchEvent("click");
  await expect(page.getByText("Publishing analytics")).toBeVisible();
});

test("priority conversion keeps priority and finishes with reusable custom swimlane IDs", async ({ page }) => {
  await openHarness(page);
  const swimlaneSelect = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
  await swimlaneSelect.selectOption("priority");
  await page.getByRole("button", { name: "Make swimlanes editable" }).click();

  const dialog = page.getByRole("dialog", { name: "Make priority swimlanes editable?" });
  await expect(dialog.getByText("High", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Create editable swimlanes" }).click();

  await expect.poll(async () => (await state(page)).config.swimlaneBy).toBe("custom");
  const final = await state(page);
  expect(final.config.groupBy).toBe("status");
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
  await page.getByRole("button", { name: "Make swimlanes editable" }).click();

  const dialog = page.getByRole("dialog", { name: "Make priority swimlanes editable?" });
  await dialog.getByRole("button", { name: "Create editable swimlanes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Conversion stopped because card updates did not persist.",
  );

  const updateAttempts = (await state(page)).actions.filter(
    (action) => action.type === "updateCards",
  );
  expect(updateAttempts).toHaveLength(2);
});
