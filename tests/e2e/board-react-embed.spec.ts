import { expect, test } from "@playwright/test";

const openEmbed = async (
  page: import("@playwright/test").Page,
  options: { readOnly?: boolean } = {},
) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/tests/fixtures/board-react-embed.html${options.readOnly ? "?readonly=1" : ""}`);
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();
};

const quickCreate = async (page: import("@playwright/test").Page, title: string) => {
  await page.locator('[data-col-key="todo"]').getByText("New card", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New card" });
  await dialog.getByLabel("Card title").fill(title);
  await dialog.getByRole("button", { name: "Create card", exact: true }).click();
  await expect(dialog).toBeHidden();
};

test("editable package embed uses the shared card editor inside a bounded Cloud-style host", async ({
  page,
}) => {
  await openEmbed(page);

  const host = page.getByTestId("cloud-board-host");
  const board = page.locator("[data-jtype-board]");
  const [hostBox, boardBox] = await Promise.all([host.boundingBox(), board.boundingBox()]);
  expect(hostBox).not.toBeNull();
  expect(boardBox).not.toBeNull();
  expect(boardBox!.width).toBeLessThanOrEqual(hostBox!.width + 1);
  expect(boardBox!.height).toBeLessThanOrEqual(hostBox!.height + 1);

  const todo = page.locator('[data-col-key="todo"]');
  await expect(todo).toContainText(cardTitles[0]!);
  const scrollMetrics = await todo.locator(":scope > div").last().evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  expect(scrollMetrics.overflowY).toBe("auto");

  await page.getByText(cardTitles[0]!, { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Card details" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Read-only card view", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Description", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Properties", { exact: true })).toBeVisible();
  await expect(dialog.getByPlaceholder("Add details...")).toBeVisible();
  await expect(dialog.getByTestId("host-card-supplement")).toHaveCount(0);

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(1440);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(900);

  await dialog.getByRole("button", { name: "To do", exact: true }).click();
  const statusOptions = page.getByRole("listbox");
  await expect(statusOptions).toBeVisible();
  await expect(statusOptions).toHaveClass(/jtb-scope/);
  await statusOptions.getByRole("option", { name: "Doing", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some((call) =>
          call.content.includes("status: doing"),
        ),
      ),
    )
    .toBe(true);

  const blockedByRow = dialog.getByText("Blocked by", { exact: true }).locator("..");
  await blockedByRow.getByRole("button").click();
  const relationMenu = page.getByRole("menu");
  await expect(
    relationMenu.getByText("Shared dependency · jcode/area-a/shared-dependency", { exact: true }),
  ).toBeVisible();
  await expect(
    relationMenu.getByText("Shared dependency · jcode/area-b/shared-dependency", { exact: true }),
  ).toBeVisible();
  await relationMenu
    .getByText("Shared dependency · jcode/area-a/shared-dependency", { exact: true })
    .click();
  // The multi-select intentionally stays open so several relations can be
  // toggled. Dismiss it before exercising an unrelated form.
  await expect(relationMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(relationMenu).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some((call) =>
          call.content.includes("blocked_by: [[jcode/area-a/shared-dependency]]"),
        ),
      ),
    )
    .toBe(true);

  const childInput = dialog.getByPlaceholder("+ Add sub-card");
  await childInput.fill("Package child issue");
  await childInput.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some(
          (call) =>
            call.relativePath.endsWith("/package-child-issue.md") &&
            call.content.includes("parent: [[jcode/card-0]]"),
        ),
      ),
    )
    .toBe(true);

  await childInput.fill("Failing child");
  await childInput.press("Enter");
  await expect(dialog.getByRole("alert")).toHaveText("Could not create sub-card. Try again.");
  await expect(childInput).toHaveValue("Failing child");

  await dialog.getByRole("button", { name: /Package child issue/ }).click();
  await expect(dialog.getByPlaceholder("Untitled card")).toHaveValue("Package child issue");
  await expect(dialog.getByPlaceholder("+ Add sub-card")).toHaveValue("");
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  const title = dialog.getByPlaceholder("Untitled card");
  await title.fill("Harden package card editing");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some((call) =>
          call.content.includes("title: Harden package card editing"),
        ),
      ),
    )
    .toBe(true);

  await todo.getByText("New card", { exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "New card" });
  await createDialog.getByLabel("Card title").fill("Embedded create path");
  await createDialog.getByLabel("Description").fill("Created inside a scoped host.");
  await createDialog.getByRole("button", { name: "To do", exact: true }).click();
  const createStatusOptions = page.getByRole("listbox");
  await expect(createStatusOptions).toHaveClass(/jtb-scope/);
  await createStatusOptions.getByRole("option", { name: "Backlog", exact: true }).click();
  await createDialog.getByRole("button", { name: "none", exact: true }).click();
  await page.getByRole("listbox").getByRole("option", { name: "high", exact: true }).click();
  await createDialog.getByRole("button", { name: "Create card", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some(
          (call) =>
            call.content.includes("title: Embedded create path") &&
            call.content.includes("status: backlog") &&
            call.content.includes("priority: high") &&
            call.content.includes("Created inside a scoped host."),
        ),
      ),
    )
    .toBe(true);
});

test("editable package embed adds a host supplement without replacing the native card editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?supplement=1");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await page.getByText(cardTitles[0]!, { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Card details" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Description", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Properties", { exact: true })).toBeVisible();
  await expect(dialog.getByTestId("host-card-supplement")).toContainText(
    `Cloud executions for ${cardTitles[0]}`,
  );
  await expect(dialog.getByRole("region", { name: "Additional information" })).toBeVisible();
});

test("editable package Card update failures stay visible and can be retried", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?failupdate=1");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await page.getByText(cardTitles[0]!, { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Card details" });
  await dialog.getByRole("button", { name: "To do", exact: true }).click();
  await page.getByRole("listbox").getByRole("option", { name: "Doing", exact: true }).click();

  const saveFailure = dialog.getByRole("alert");
  await expect(saveFailure).toContainText("simulated Card update failure");
  await saveFailure.getByRole("button", { name: "Retry" }).click();

  await expect(saveFailure).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BOARD_EMBED_TEST__?.saveCalls.some(
          (call) =>
            call.relativePath === "jcode/card-0.md" && call.content.includes("status: doing"),
        ),
      ),
    )
    .toBe(true);
});

test("quick-create preserves an ordinary Markdown note at the requested Card path", async ({
  page,
}) => {
  await openEmbed(page);
  const original = await page.evaluate(() =>
    window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-note.md"),
  );

  await quickCreate(page, "Collision note");

  const result = await page.evaluate(() => ({
    attempts: window.__BOARD_EMBED_TEST__?.saveAttempts
      .filter((call) => call.content.includes("title: Collision note"))
      .map((call) => ({ path: call.relativePath, createOnly: call.createOnly })),
    original: window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-note.md"),
    created: window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-note-2.md"),
  }));
  expect(result.attempts).toEqual([
    { path: "jcode/collision-note.md", createOnly: true },
    { path: "jcode/collision-note-2.md", createOnly: true },
  ]);
  expect(result.original).toBe(original);
  expect(result.created).toContain("board: b_jcode");
});

test("quick-create preserves a same-path Card owned by another board", async ({ page }) => {
  await openEmbed(page);
  const original = await page.evaluate(() =>
    window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-board.md"),
  );

  await quickCreate(page, "Collision board");

  const result = await page.evaluate(() => ({
    attempts: window.__BOARD_EMBED_TEST__?.saveAttempts
      .filter((call) => call.content.includes("title: Collision board"))
      .map((call) => ({ path: call.relativePath, createOnly: call.createOnly })),
    original: window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-board.md"),
    created: window.__BOARD_EMBED_TEST__?.contentAt("jcode/collision-board-2.md"),
  }));
  expect(result.attempts).toEqual([
    { path: "jcode/collision-board.md", createOnly: true },
    { path: "jcode/collision-board-2.md", createOnly: true },
  ]);
  expect(result.original).toBe(original);
  expect(result.original).toContain("board: b_other");
  expect(result.created).toContain("board: b_jcode");
});

test("an editable-to-readOnly transition stops a mutable batch before its next write", async ({
  page,
}) => {
  await openEmbed(page);
  await page.evaluate(() => window.__BOARD_EMBED_TEST__?.pauseNextCardWrite());

  await page.locator('[data-card-id="jcode/card-0.md"]').click({ modifiers: ["Control"] });
  await page.locator('[data-card-id="jcode/card-5.md"]').click({ modifiers: ["Control"] });
  await expect(page.getByText("2 selected")).toBeVisible();
  await page.getByLabel("Set priority").selectOption("low");
  await expect.poll(() =>
    page.evaluate(() => window.__BOARD_EMBED_TEST__?.cardWritePaused),
  ).toBe(true);

  await page.evaluate(() => window.__BOARD_EMBED_TEST__?.setReadOnly?.(true));
  await expect(page.getByText("New card", { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.__BOARD_EMBED_TEST__?.releaseCardWrite());

  await expect(page.getByText(/This board is read-only\./)).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() =>
      window.__BOARD_EMBED_TEST__?.saveAttempts.filter((call) =>
        call.relativePath === "jcode/card-0.md" || call.relativePath === "jcode/card-5.md"
      ).length,
    ),
  ).toBe(1);
});

test("an ignored controlled viewState reconciliation emits once without looping", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?controlled-view=ignored");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await expect.poll(() =>
    page.evaluate(() => window.__BOARD_EMBED_TEST__?.viewStateChanges.length),
  ).toBe(1);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__BOARD_EMBED_TEST__?.viewStateChanges.length)).toBe(1);
  expect(await page.evaluate(() =>
    window.__BOARD_EMBED_TEST__?.viewStateChanges[0]?.dismissedInboxItemKeys ?? [],
  )).toEqual([]);
});

test("a controlled viewState without a change callback remains responsive", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?controlled-view=missing");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );

  expect(consoleErrors.some((message) => message.includes("Maximum update depth"))).toBe(false);
  expect(await page.evaluate(() => window.__BOARD_EMBED_TEST__?.viewStateChanges.length)).toBe(0);
});

test("Calendar dates follow the package locale instead of the browser locale", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?locale=zh");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.getByText("周日", { exact: true })).toBeVisible();
  await expect(page.getByText(/\d{4}年\d{1,2}月/)).toBeVisible();
});

test("package personal swimlane view drives Card writes without changing the shared board", async ({
  page,
}) => {
  await openEmbed(page);
  await page.getByLabel("Swimlanes", { exact: true }).selectOption("priority");

  const card = page.locator('[data-card-id="jcode/card-0.md"]');
  const target = page.locator('[data-col-key="medium"]');
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox!.x + cardBox!.width / 2 + 8, cardBox!.y + cardBox!.height / 2, { steps: 4 });
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 80, { steps: 12 });
  await page.mouse.up();

  await expect.poll(() =>
    page.evaluate(() =>
      window.__BOARD_EMBED_TEST__?.saveCalls.some(
        (call) => call.relativePath === "jcode/card-0.md" && call.content.includes("priority: medium"),
      ),
    ),
  ).toBe(true);
  expect(await page.evaluate(() =>
    window.__BOARD_EMBED_TEST__?.saveCalls.some((call) => call.relativePath === "jcode.board"),
  )).toBe(false);
});

test("default package discovery opens a matching Card outside the board folder", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/tests/fixtures/board-react-embed.html?card=jcode-automation%2Fauto-1%2Fexec-1.md",
  );
  await expect(page.getByTestId("cloud-board-host").getByText("Jcode", { exact: true })).toBeVisible();

  const dialog = page.getByRole("dialog", { name: "Card details" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder("Untitled card")).toHaveValue(
    "Automation-created payment review",
  );
});

test("explicit Card roots keep discovery bounded", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/tests/fixtures/board-react-embed.html?limited=1&card=jcode-automation%2Fauto-1%2Fexec-1.md",
  );
  await expect(page.getByText(cardTitles[0]!, { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Card "jcode-automation/auto-1/exec-1.md" was not found on this board.',
    ),
  ).toBeVisible();
  await expect(page.getByText("Automation-created payment review", { exact: true })).toHaveCount(0);
});

test("explicit additional Card roots open an exact deep link once", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/tests/fixtures/board-react-embed.html?managed=1&intercept=1&card=jcode-automation%2Fauto-1%2Fexec-1.md",
  );
  await expect(page.getByTestId("cloud-board-host").getByText("Jcode", { exact: true })).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => window.__BOARD_EMBED_TEST__?.openedCardCount),
  ).toBe(1);
  expect(await page.evaluate(() => window.__BOARD_EMBED_TEST__?.openedCardTitle)).toBe(
    "Automation-created payment review",
  );
  await page.waitForTimeout(5_100);
  expect(await page.evaluate(() => window.__BOARD_EMBED_TEST__?.openedCardCount)).toBe(1);
});

test("editable package embed exposes a missing Card deep link", async ({ page }) => {
  await page.goto("/tests/fixtures/board-react-embed.html?card=jcode%2Fmissing.md");
  await expect(page.getByText('Card "jcode/missing.md" was not found on this board.')).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
});

test("explicit readOnly package embed keeps the non-editable detail path", async ({ page }) => {
  await openEmbed(page, { readOnly: true });

  await page.getByText(cardTitles[0]!, { exact: true }).click();
  await expect(page.getByLabel("Read-only card view")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
});

test("readOnly Card detail traps Tab, closes with Escape, and restores Card focus", async ({ page }) => {
  await openEmbed(page, { readOnly: true });

  const trigger = page.locator('[data-card-id="jcode/card-0.md"]');
  await trigger.focus();
  await trigger.click();

  const detail = page.getByRole("dialog", { name: "Read-only card view" });
  const close = detail.getByRole("button", { name: "Close" });
  await expect(detail).toBeVisible();
  await expect(detail).toHaveClass(/jtb-scope/);
  await expect(close).toBeFocused();

  for (const key of ["Tab", "Shift+Tab", "Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest('[data-testid="read-only-card-detail"]')),
        ),
      )
      .toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("readOnly package embed renders the host Card supplement without mutation affordances", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?readonly=1&supplement=1");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await page.getByText(cardTitles[0]!, { exact: true }).click();
  const detail = page.getByLabel("Read-only card view");
  await expect(detail).toBeVisible();
  await expect(detail.getByTestId("host-card-supplement")).toContainText(
    `Cloud executions for ${cardTitles[0]}`,
  );
  await expect(detail.getByRole("region", { name: "Additional information" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
});

test("host onCardOpen intercepts the built-in editable detail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?intercept=1");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await page.getByText(cardTitles[0]!, { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__BOARD_EMBED_TEST__?.openedCardTitle))
    .toBe(cardTitles[0]);
  await expect(page.getByRole("dialog", { name: "Card details" })).toHaveCount(0);
  await expect(page.getByLabel("Read-only card view")).toHaveCount(0);
});

test("host onCardOpen interception also suppresses the Card supplement", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tests/fixtures/board-react-embed.html?intercept=1&supplement=1");
  await expect(page.getByText("Jcode", { exact: true })).toBeVisible();

  await page.getByText(cardTitles[0]!, { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__BOARD_EMBED_TEST__?.openedCardTitle))
    .toBe(cardTitles[0]);
  await expect(page.getByTestId("host-card-supplement")).toHaveCount(0);
});

const cardTitles = [
  "Harden WebFetch, delegated agents, and Hooks approval boundaries",
];
