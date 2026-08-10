import { expect, test } from "@playwright/test";

type HarnessState = {
  config: {
    columns?: Array<{ key: string }>;
    groupBy?: string;
    swimlaneBy?: string;
    swimlanes?: Array<{ key: string; name: string; color?: string | null }>;
    swimlaneMigration?: unknown;
    project?: { key?: string; summary?: string; startDate?: string; targetDate?: string };
  };
  viewState: {
    viewType?: string;
    groupBy?: string;
    swimlaneBy?: string;
    calendarMode?: string;
    scope?: string;
    filters?: { archived?: string };
    dismissedInboxItemKeys?: string[];
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
    start?: string | null;
    reminder?: string | null;
    archived?: boolean;
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

test("projection and scope preferences stay personal while every view uses the same cards", async ({ page }) => {
  await openHarness(page);
  const configWrites = (await state(page)).actions.filter((action) => action.type === "setConfig").length;

  await page.getByRole("button", { name: "Backlog" }).click();
  await expect(page.getByText("To do", { exact: true })).toBeVisible();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  expect((await state(page)).viewState.viewType).toBe("backlog");

  await page.getByRole("button", { name: "Gantt" }).click();
  await expect(page.getByLabel(/Publishing analytics, milestone/)).toBeVisible();
  await expect(page.getByText("Unscheduled", { exact: true })).toBeVisible();
  expect((await state(page)).viewState.viewType).toBe("gantt");

  await page.getByRole("button", { name: "Calendar" }).click();
  await page.getByRole("button", { name: "Agenda" }).click();
  expect((await state(page)).viewState.calendarMode).toBe("agenda");

  await page.getByRole("button", { name: "My work" }).click();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  await expect(page.getByText("Publishing analytics")).toBeHidden();
  expect((await state(page)).viewState.scope).toBe("my-work");

  await page.getByRole("button", { name: /Inbox/ }).click();
  await expect(page.getByText("Mentioned @jack")).toBeVisible();
  const mention = page.getByText("Mentioned @jack");
  await mention.locator("xpath=../..").getByRole("button", { name: /Dismiss/ }).click();
  await expect(mention).toBeHidden();
  expect((await state(page)).viewState.dismissedInboxItemKeys?.some((key) => key.includes(":mention:jack"))).toBe(true);

  expect((await state(page)).actions.filter((action) => action.type === "setConfig")).toHaveLength(configWrites);
});

test("Backlog selection is keyboard-operable without opening Card detail", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Backlog" }).click();
  const select = page.getByRole("button", { name: "Add to selection" }).first();
  await select.focus();
  await page.keyboard.press("Space");

  await expect(page.getByText("1 selected")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
});

test("Backlog applies asynchronously restored collapsed groups", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Backlog" }).click();
  await expect(page.getByText("Offline conflict indicator")).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __BOARD_TEST_SET_VIEW_STATE__: (patch: { collapsedGroupKeys: string[] }) => void })
      .__BOARD_TEST_SET_VIEW_STATE__({ collapsedGroupKeys: ["backlog:status:todo"] });
  });
  await expect(page.getByText("Offline conflict indicator")).toBeHidden();
});

test("Board Card action menu is keyboard-operable without opening detail", async ({ page }) => {
  await openHarness(page);
  const actions = page.getByRole("button", { name: "Card actions for Offline conflict indicator" });
  await actions.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
});

test("project settings validates planning dates and persists lightweight metadata", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Project settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Project settings" });
  await dialog.getByLabel("Start date").fill("2026-10-10");
  await dialog.getByLabel("Target date").fill("2026-10-01");
  await dialog.getByRole("button", { name: "Save project" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Target date must be on or after");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Target date").fill("2026-10-20");
  await dialog.getByRole("button", { name: "Save project" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await state(page)).config.project).toMatchObject({
    key: "JT",
    startDate: "2026-10-10",
    targetDate: "2026-10-20",
  });
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
  const opener = page.locator('[data-card-id="roadmap/offline.md"]');
  await opener.click();

  const sheet = page.getByTestId("card-detail-sheet");
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox).not.toBeNull();
  expect(Math.abs(sheetBox!.x + sheetBox!.width - page.viewportSize()!.width)).toBeLessThan(2);
  await expect(sheet.getByText("Changed status")).toBeVisible();
  await expect(sheet.getByText("Planning agent")).toBeVisible();
  await expect(sheet.getByText("MCP", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Roadmap automation")).toBeVisible();
  await expect(sheet.getByTitle("column_key")).toHaveText("Status");

  await page.getByPlaceholder("Untitled card").fill("Offline conflict state");
  await page.getByRole("button", { name: "Platform", exact: true }).click();
  await page.getByRole("option", { name: "Growth" }).click();

  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("offline.md"))?.swimlaneKey)
    .toBe("lane_growth_22222222");
  await expect
    .poll(async () => (await state(page)).cards.find((card) => card.id.endsWith("offline.md"))?.title)
    .toBe("Offline conflict state");

  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(opener).toBeFocused();
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
  await createDialog.getByRole("button", { name: "Unassigned" }).click();
  await page.getByRole("option", { name: "Maya" }).click();
  await createDialog.getByRole("button", { name: "Add labels" }).click();
  await page.getByRole("menuitem", { name: "frontend" }).click();
  await page.getByRole("menuitem", { name: "analytics" }).click();
  await createDialog.getByRole("button", { name: "frontend, analytics" }).click();
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
      tags: [{ label: "frontend", color: "#0ea5e9" }, { label: "analytics", color: "#22c55e" }],
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
  await page.locator('[data-card-id="roadmap/offline.md"]').click();

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
  await detail.getByRole("button", { name: /Write conflict guide/ }).click();
  await expect(detail.getByPlaceholder("Untitled card")).toHaveValue("Write conflict guide");
  await expect(detail.getByPlaceholder("Untitled card")).toBeFocused();
  await detail.getByRole("button", { name: "Back to previous card" }).click();
  await expect(detail.getByPlaceholder("Untitled card")).toHaveValue("Offline conflict indicator");
  await expect(detail.getByPlaceholder("Untitled card")).toBeFocused();
});

test("Table rows open with Space without scrolling the project", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Table" }).click();
  const row = page.getByRole("button", { name: /Offline conflict indicator/ });
  await row.focus();
  const before = await page.evaluate(() => window.scrollY);
  await row.press("Space");
  await expect(page.getByRole("dialog", { name: "Card details" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("card detail exposes failed saves and retries the preserved patch", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE__: boolean }).__BOARD_TEST_CARD_SAVE_FAILURE__ = true;
  });
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  const title = detail.getByPlaceholder("Untitled card");
  await title.fill("Recovered after retry");
  await expect(detail.getByRole("alert")).toContainText("simulated card save failure");
  await page.evaluate(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE__: boolean }).__BOARD_TEST_CARD_SAVE_FAILURE__ = false;
  });
  await detail.getByRole("button", { name: "Retry" }).click();
  await expect(detail.getByRole("alert")).toHaveCount(0);
  await expect.poll(async () => (await state(page)).cards.find((card) => card.id === "roadmap/offline.md")?.title)
    .toBe("Recovered after retry");
});

test("a later successful field save does not discard an earlier failed patch", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE_COUNT__: number }).__BOARD_TEST_CARD_SAVE_FAILURE_COUNT__ = 1;
  });
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  await detail.getByPlaceholder("Untitled card").fill("Keep the failed title");
  await expect(detail.getByRole("alert")).toContainText("simulated first card save failure");
  await detail.getByLabel("Due").fill("2026-09-03");
  await expect.poll(async () => (await state(page)).cards.find((card) => card.id === "roadmap/offline.md")?.due).toBe("2026-09-03");
  await expect(detail.getByRole("alert")).toContainText("simulated first card save failure");
  await detail.getByRole("button", { name: "Retry" }).click();
  await expect.poll(async () => (await state(page)).cards.find((card) => card.id === "roadmap/offline.md")?.title).toBe("Keep the failed title");
});

test("pending save failure blocks delete and preserves the open draft", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE__: boolean }).__BOARD_TEST_CARD_SAVE_FAILURE__ = true;
  });
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  await detail.getByPlaceholder("Untitled card").fill("Do not resurrect me");
  await detail.getByRole("button", { name: "Delete card" }).click();

  await expect(detail).toBeVisible();
  await expect(detail.getByRole("alert")).toContainText("simulated card save failure");
  expect((await state(page)).cards.some((card) => card.id === "roadmap/offline.md")).toBe(true);
});

test("delete failures stay in Card detail and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __BOARD_TEST_DELETE_FAILURE__: boolean }).__BOARD_TEST_DELETE_FAILURE__ = true;
  });
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  await detail.getByRole("button", { name: "Delete card" }).click();
  await expect(detail.getByRole("alert")).toContainText("simulated delete failure");
  await page.evaluate(() => {
    (window as unknown as { __BOARD_TEST_DELETE_FAILURE__: boolean }).__BOARD_TEST_DELETE_FAILURE__ = false;
  });
  await detail.getByRole("button", { name: "Retry" }).click();
  await expect(detail).toBeHidden();
  expect((await state(page)).cards.some((card) => card.id === "roadmap/offline.md")).toBe(false);
});

test("failed parent edits cannot leak through nested Card navigation", async ({ page }) => {
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  const childInput = detail.getByPlaceholder("+ Add sub-card");
  await childInput.fill("Safe child");
  await childInput.press("Enter");
  await page.evaluate(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE__: boolean }).__BOARD_TEST_CARD_SAVE_FAILURE__ = true;
  });
  await detail.getByPlaceholder("Untitled card").fill("Parent draft");
  await expect(detail.getByRole("alert")).toContainText("simulated card save failure");
  await detail.getByRole("button", { name: /Safe child/ }).click();
  await expect(detail.getByPlaceholder("Untitled card")).toHaveValue("Parent draft");

  await page.evaluate(() => {
    (window as unknown as { __BOARD_TEST_CARD_SAVE_FAILURE__: boolean }).__BOARD_TEST_CARD_SAVE_FAILURE__ = false;
  });
  await detail.getByRole("button", { name: "Retry" }).click();
  await detail.getByRole("button", { name: /Safe child/ }).click();
  await expect(detail.getByPlaceholder("Untitled card")).toHaveValue("Safe child");
});

test("Activity and comments distinguish load failures from honest empty states", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __BOARD_TEST_ACTIVITY_FAILURE__: boolean; __BOARD_TEST_COMMENTS_FAILURE__: boolean };
    state.__BOARD_TEST_ACTIVITY_FAILURE__ = true;
    state.__BOARD_TEST_COMMENTS_FAILURE__ = true;
  });
  await openHarness(page);
  await page.locator('[data-card-id="roadmap/offline.md"]').click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  const activityFailure = detail.getByRole("alert").filter({ hasText: "simulated Activity failure" });
  const commentsFailure = detail.getByRole("alert").filter({ hasText: "simulated comments failure" });
  await expect(activityFailure).toBeVisible();
  await expect(commentsFailure).toBeVisible();
  await page.evaluate(() => {
    const state = window as unknown as { __BOARD_TEST_ACTIVITY_FAILURE__: boolean; __BOARD_TEST_COMMENTS_FAILURE__: boolean };
    state.__BOARD_TEST_ACTIVITY_FAILURE__ = false;
    state.__BOARD_TEST_COMMENTS_FAILURE__ = false;
  });
  await activityFailure.getByRole("button", { name: "Retry" }).click();
  await commentsFailure.getByRole("button", { name: "Retry" }).click();
  await expect(detail.getByText("Planning agent")).toBeVisible();
  await expect(detail.getByText("No comments yet")).toBeVisible();
});

test("bulk mutations use updateCards, expose archive recovery, and preserve failed selections", async ({ page }) => {
  await openHarness(page);
  const offline = page.locator('[data-card-id="roadmap/offline.md"]');
  const analytics = page.locator('[data-card-id="roadmap/analytics.md"]');
  const selectPair = async () => {
    await offline.click({ modifiers: ["Control"] });
    await analytics.click({ modifiers: ["Control"] });
    await expect(page.getByText("2 selected")).toBeVisible();
  };

  await selectPair();
  await page.getByLabel("Set assignee").selectOption("Maya");
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).map((card) => card.assignee)).toEqual(["Maya", "Maya"]);
  expect((await state(page)).actions.some((action) => action.type === "updateCards" && action.cardIds?.length === 2)).toBe(true);

  await selectPair();
  await page.getByRole("button", { name: "Add labels" }).click();
  await page.getByRole("menuitem", { name: "release" }).click();
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).every((card) => card.tags?.some((tag) => tag.label === "release"))).toBe(true);

  await selectPair();
  await page.getByLabel("Set due date").fill("2026-09-20");
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).map((card) => card.due)).toEqual(["2026-09-20", "2026-09-20"]);

  await selectPair();
  await page.getByRole("button", { name: "Clear due date" }).click();
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).map((card) => card.due)).toEqual([null, null]);

  await selectPair();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).every((card) => card.archived)).toBe(true);
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "Archived" }).click();
  await expect(offline).toBeVisible();
  await selectPair();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect.poll(async () => (await state(page)).cards.filter((card) => card.id.endsWith("offline.md") || card.id.endsWith("analytics.md")).every((card) => !card.archived)).toBe(true);

  await page.getByRole("button", { name: "Filters, 1 active" }).click();
  await page.getByRole("radio", { name: "Active" }).click();
  await page.evaluate(() => { (window as unknown as { __BOARD_TEST_UPDATE_FAILURE__: boolean }).__BOARD_TEST_UPDATE_FAILURE__ = true; });
  await selectPair();
  await page.getByLabel("Set priority").selectOption("high");
  await expect(page.getByRole("alert")).toContainText("simulated bulk failure");
  await expect(page.getByText("2 selected")).toBeVisible();
});

test("read-only keeps projection navigation and detail while hiding every mutation entry", async ({ page }) => {
  await page.goto("/tests/fixtures/board-swimlanes.html?readonly=1");
  await expect(page.getByText("Product roadmap")).toBeVisible();
  await expect(page.getByRole("button", { name: "Project settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage custom swimlanes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New card" })).toHaveCount(0);

  await page.getByRole("button", { name: "Table" }).click();
  expect((await state(page)).viewState.viewType).toBe("table");
  await page.getByRole("button", { name: /Offline conflict indicator/ }).click();
  const detail = page.getByRole("dialog", { name: "Card details" });
  await expect(detail.getByPlaceholder("Untitled card")).toHaveAttribute("readonly", "");
  await expect(detail.getByRole("button", { name: "Delete card" })).toHaveCount(0);
  await expect(detail.getByPlaceholder("Paste a URL or path")).toHaveCount(0);
  await expect(detail.getByText("Changed status")).toBeVisible();
  expect((await state(page)).actions).toHaveLength(0);
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

  await expect.poll(async () => (await state(page)).viewState.swimlaneBy).toBe("custom");
  const final = await state(page);
  expect(final.viewState.groupBy).toBe("status");
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
