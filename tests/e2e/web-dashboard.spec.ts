import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for the JType web frontend (management dashboard).
 * These mock all /api/* calls so no real backend is required.
 */

function mockApi(page: Page, options: { emptyWorkspaces?: boolean; workspaceRole?: "owner" | "editor" | "viewer"; ticketKey?: string; outOfFolderCard?: boolean; cardFetchDelayMs?: number; createCollisionOnce?: boolean } = {}) {
  const workspaceRole = options.workspaceRole ?? "owner";
  const documents = [
    { id: "doc-1", relativePath: "intro.md", title: "Intro", status: "published", contentHash: "abc", updatedClock: 5, versionId: "v1" },
    { id: "doc-2", relativePath: "guides/setup.md", title: "Setup Guide", status: "draft", contentHash: "def", updatedClock: 3, versionId: "v2" },
    { id: "doc-board", relativePath: "infra-web.board", title: "infra-web", status: "draft", contentHash: "board-hash", updatedClock: 8, versionId: "v-board" },
    { id: "doc-card", relativePath: "infra-web/todo-card.md", title: "Todo card", status: "draft", contentHash: "card-hash", updatedClock: 9, versionId: "v-card" },
  ];
  if (options.outOfFolderCard) {
    documents.push({ id: "doc-shared-card", relativePath: "shared/cross-card.md", title: "Cross folder card", status: "draft", contentHash: "shared-hash", updatedClock: 10, versionId: "v-shared" });
  }
  const folders = [
    { id: "folder-1", relativePath: "guides", updatedClock: 2 },
  ];
  const trashItems: Array<Record<string, string>> = [];
  let cardContent = "---\nboard: infra-web\nstatus: todo\nposition: 0\ntitle: Todo card\npriority: high\nassignee: testuser\ntags: frontend\ndue: 2026-08-02\nblocked_by: dependency\n---\n\nVerify the pull cursor.";
  let boardContent = JSON.stringify({
    id: "infra-web",
    title: "Infra Web",
    columns: [
      { key: "todo", name: "Todo" },
      { key: "done", name: "Done" },
    ],
    doneColumn: "done",
    ...(options.ticketKey ? { ticketKey: options.ticketKey } : {}),
  });
  let createCollisionReturned = false;

  return page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const body = route.request().postDataJSON();

    // Auth
    if (url.endsWith("/api/register") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "tok_test",
          username: body?.username || "testuser",
          siteUrl: "http://localhost:13345/u/testuser",
          role: "admin",
        }),
      });
    }
    if (url.endsWith("/api/login") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "tok_test",
          username: body?.username || "testuser",
          siteUrl: "http://localhost:13345/u/testuser",
          role: "admin",
        }),
      });
    }
    if (url.endsWith("/api/me") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "tok_test",
          username: "testuser",
          siteUrl: "http://localhost:13345/u/testuser",
          role: "admin",
        }),
      });
    }

    // Profile
    if (url.endsWith("/api/me/profile") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          username: "testuser",
          role: "admin",
          displayName: "Test User",
          email: "test@example.com",
          siteTitle: "My Site",
          enabled: true,
          storageBudgetBytes: 1073741824,
        }),
      });
    }
    if (url.endsWith("/api/me/profile") && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          username: "testuser",
          role: "admin",
          displayName: body?.displayName || "Test User",
          email: body?.email || "test@example.com",
          siteTitle: "My Site",
          enabled: true,
          storageBudgetBytes: 1073741824,
        }),
      });
    }
    if (url.endsWith("/api/me/site") && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          username: "testuser",
          role: "admin",
          displayName: "Test User",
          email: "test@example.com",
          siteTitle: body?.siteTitle || "My Site",
          enabled: true,
          storageBudgetBytes: 1073741824,
        }),
      });
    }
    if (url.endsWith("/api/me/storage")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalBudgetBytes: 1073741824,
          totalUsedBytes: 52428800,
          workspaces: [
            { workspaceId: "ws-1", workspaceName: "notes", budgetBytes: 536870912, usedBytes: 52428800 },
          ],
        }),
      });
    }
    if (url.endsWith("/api/me/devices")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { deviceId: "dev-abc123", workspaceId: "ws-1", workspaceName: "notes", lastSeenClock: 10, updatedAt: "2025-01-01T00:00:00Z" },
        ]),
      });
    }

    // Admin
    if (url.endsWith("/api/admin/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalUsers: 5,
          totalWorkspaces: 12,
          totalDocuments: 89,
          totalStorageBytes: 262144000,
          totalDomains: 2,
        }),
      });
    }
    if (url.endsWith("/api/admin/users") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "user-1",
            username: "admin",
            role: "admin",
            siteTitle: "Admin",
            displayName: "Admin User",
            email: "admin@jtype.app",
            enabled: true,
            workspaceCount: 3,
            storageUsedBytes: 10485760,
            storageBudgetBytes: 1073741824,
            createdAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "user-2",
            username: "alice",
            role: "user",
            siteTitle: "Alice's Blog",
            displayName: "Alice",
            email: "alice@example.com",
            enabled: true,
            workspaceCount: 1,
            storageUsedBytes: 5242880,
            storageBudgetBytes: 536870912,
            createdAt: "2024-06-15T00:00:00Z",
          },
        ]),
      });
    }
    if (url.includes("/api/admin/users/") && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-2",
          username: "alice",
          role: "user",
          siteTitle: "Alice's Blog",
          displayName: "Alice",
          email: "alice@example.com",
          enabled: body?.enabled ?? true,
          workspaceCount: 1,
          storageUsedBytes: 5242880,
          storageBudgetBytes: 536870912,
          createdAt: "2024-06-15T00:00:00Z",
        }),
      });
    }
    if (url.endsWith("/api/admin/workspaces")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "ws-1", name: "notes", slug: "notes", ownerUsername: "admin", memberCount: 2, documentCount: 45, storageBudgetBytes: 536870912, storageUsedBytes: 10485760 },
          { id: "ws-2", name: "blog", slug: "blog", ownerUsername: "alice", memberCount: 1, documentCount: 12, storageBudgetBytes: 536870912, storageUsedBytes: 5242880 },
        ]),
      });
    }
    if (url.endsWith("/api/admin/domains")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "dom-1", domain: "alice.dev", username: "alice", status: "verified", sslStatus: "active" },
          { id: "dom-2", domain: "bob.io", username: "bob", status: "pending", sslStatus: null },
        ]),
      });
    }

    // Workspaces
    if (url.endsWith("/api/v1/workspaces") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          workspaces: options.emptyWorkspaces
            ? []
            : [
                { id: "ws-1", name: "notes", slug: "notes", publishTitle: "Notes", role: workspaceRole, documentCount: 5, storageBudgetBytes: 536870912, storageUsedBytes: 52428800 },
                { id: "ws-2", name: "blog", slug: "blog", publishTitle: "Blog", role: "editor", documentCount: 3, storageBudgetBytes: 536870912, storageUsedBytes: 10485760 },
              ],
        }),
      });
    }
    if (url.endsWith("/api/v1/workspaces") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "ws-new",
          name: body?.name || "new-workspace",
          slug: (body?.name || "new-workspace").toLowerCase().replace(/\s+/g, "-"),
          publishTitle: body?.name || "new-workspace",
          role: "owner",
          documentCount: 0,
          storageBudgetBytes: 536870912,
          storageUsedBytes: 0,
        }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+$/) && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "ws-1",
          name: "notes",
          slug: body?.slug || "notes",
          publishTitle: body?.publishTitle || "Notes",
          role: "owner",
          documentCount: 2,
          storageBudgetBytes: body?.storageBudgetBytes || 536870912,
          storageUsedBytes: 52428800,
        }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "ws-1",
          name: "notes",
          slug: "notes",
          publishTitle: "Notes",
          role: workspaceRole,
          documentCount: 2,
          storageBudgetBytes: 536870912,
          storageUsedBytes: 52428800,
        }),
      });
    }

    // Domains
    if (url.endsWith("/api/v1/domains") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.endsWith("/api/v1/domains") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "dom-new",
          domain: body?.domain,
          workspaceId: body?.workspaceId || null,
          workspaceName: body?.workspaceId ? "notes" : null,
          verificationToken: "verify",
          dnsTxtRecord: "jtype-verify=verify",
          status: "pending",
          verifiedAt: null,
          sslStatus: null,
          sslExpiresAt: null,
        }),
      });
    }
    if (url.match(/\/api\/v1\/domains\/[^/]+\/binding$/) && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "dom-new",
          domain: "docs.example.com",
          workspaceId: body?.workspaceId || null,
          workspaceName: body?.workspaceId ? "notes" : null,
          verificationToken: "verify",
          dnsTxtRecord: "jtype-verify=verify",
          status: "pending",
          verifiedAt: null,
          sslStatus: null,
          sslExpiresAt: null,
        }),
      });
    }

    // Documents
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/folders$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folders),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/members$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { userId: "user-1", username: "testuser", role: "owner", joinedAt: "2025-01-01T00:00:00Z" },
        ]),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/tickets$/) && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/boards\/[^/]+\/cards$/) && method === "GET") {
      if (options.cardFetchDelayMs) await new Promise((resolve) => setTimeout(resolve, options.cardFetchDelayMs));
      const boardCards = [
        {
          documentId: "doc-card",
          relativePath: "infra-web/todo-card.md",
          title: "Todo card",
          isPublished: false,
          content: cardContent,
          contentHash: "card-hash",
          versionId: "v-card",
          updatedClock: 9,
        },
      ];
      if (options.outOfFolderCard) {
        boardCards.push({
          documentId: "doc-shared-card",
          relativePath: "shared/cross-card.md",
          title: "Cross folder card",
          isPublished: false,
          content: "---\nboard: infra-web\nstatus: todo\nposition: 1\ntitle: Cross folder card\n---\n\nShared across project folders.",
          contentHash: "shared-hash",
          versionId: "v-shared",
          updatedClock: 10,
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(boardCards) });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/folders$/) && method === "POST") {
      const folder = {
        id: `folder-${folders.length + 1}`,
        relativePath: body?.relativePath || "New Folder",
        updatedClock: 20 + folders.length,
      };
      folders.push(folder);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folder),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/folders\/[^/]+$/) && method === "DELETE") {
      const folderId = url.split("/").pop();
      const index = folders.findIndex((folder) => folder.id === folderId);
      if (index >= 0) folders.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(documents),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents$/) && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          relativePath: body?.relativePath || "new.md",
          title: body?.title || "New",
          status: "draft",
          content: body?.content || "",
          contentHash: "new123",
          versionId: "v-new",
          updatedClock: 10,
        }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+$/) && method === "GET") {
      const docId = url.split("/").pop();
      if (docId === "doc-board") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            relativePath: "infra-web.board",
            title: "infra-web",
            status: "draft",
            content: boardContent,
            contentHash: "board-hash",
            versionId: "v-board",
            updatedClock: 8,
          }),
        });
      }
      if (docId === "doc-card") {
        if (options.cardFetchDelayMs) await new Promise((resolve) => setTimeout(resolve, options.cardFetchDelayMs));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            relativePath: "infra-web/todo-card.md",
            title: "Todo card",
            status: "draft",
            content: cardContent,
            contentHash: "card-hash",
            versionId: "v-card",
            updatedClock: 9,
          }),
        });
      }
      if (docId === "doc-shared-card") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            relativePath: "shared/cross-card.md",
            title: "Cross folder card",
            status: "draft",
            content: "---\nboard: infra-web\nstatus: todo\nposition: 1\ntitle: Cross folder card\n---\n\nShared across project folders.",
            contentHash: "shared-hash",
            versionId: "v-shared",
            updatedClock: 10,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          relativePath: "intro.md",
          title: "Intro",
          status: "published",
          content: "# Intro\n\nHello from cloud.",
          contentHash: "abc",
          versionId: "v1",
          updatedClock: 5,
        }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/save$/) && method === "POST") {
      const relativePath = body?.relativePath || "new.md";
      if (options.createCollisionOnce && body?.createOnly === true && relativePath === "infra-web/collision-card.md" && !createCollisionReturned) {
        createCollisionReturned = true;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "document path already exists; retry with another path" }),
        });
      }
      if (relativePath === "infra-web.board") boardContent = body?.content || boardContent;
      if (relativePath === "infra-web/todo-card.md") cardContent = body?.content || cardContent;
      const existing = documents.find((doc) => doc.relativePath === relativePath);
      const saved = {
        id: existing?.id || `doc-${documents.length + 1}`,
        relativePath,
        title: body?.title || relativePath.replace(/\.[^.]+$/, ""),
        status: "draft",
        contentHash: "new123",
        updatedClock: 10,
        versionId: "v-new",
      };
      if (!existing) documents.push(saved);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...saved, content: body?.content || "" }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+\/activity\?/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: [
            {
              id: "event-1",
              kind: "card.status_changed",
              at: "2026-08-11T09:30:00Z",
              actor: { kind: "user", id: "user-1", label: "Test User" },
              client: { kind: "mcp" },
              token: { id: "token-1", label: "Roadmap automation" },
              changes: [{ field: "status", before: "todo", after: "doing" }],
            },
          ],
          nextSequence: 1,
          hasMore: false,
        }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/webhooks$/) && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/boards\/[^/]+\/events\/pull\?/) && method === "GET") {
      const afterSequence = Number(new URL(url).searchParams.get("afterSequence") || "0");
      const events = afterSequence === 0
        ? [
            { sequence: 1, event: "kanban:card-created", workspaceId: "ws-1", board: "infra-web", card: { path: "infra-web/todo-card.md", title: "Todo card", status: "todo" }, editedBy: "testuser", updatedClock: 9 },
            { sequence: 2, event: "kanban:card-updated", workspaceId: "ws-1", board: "infra-web", card: { path: "infra-web/todo-card.md", title: "Todo card", status: "done" }, editedBy: "testuser", updatedClock: 10 },
          ]
        : afterSequence === 2
          ? [
              { sequence: 3, event: "kanban:card-updated", workspaceId: "ws-1", board: "infra-web", card: { path: "infra-web/todo-card.md", title: "Todo card", status: "todo" }, editedBy: "testuser", updatedClock: 11 },
            ]
          : [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ events, nextSequence: afterSequence === 0 ? 2 : afterSequence === 2 ? 3 : afterSequence, hasMore: afterSequence === 0 }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+$/) && method === "DELETE") {
      const docId = url.split("/").pop();
      const index = documents.findIndex((doc) => doc.id === docId);
      if (index >= 0) {
        const [doc] = documents.splice(index, 1);
        trashItems.push({
          id: `trash-${doc.id}`,
          documentId: doc.id,
          relativePath: doc.relativePath,
          title: doc.title,
          contentHash: doc.contentHash,
          deletedByUserId: "user-1",
          deletedAt: "2025-01-02T00:00:00Z",
          expiresAt: "2025-02-01T00:00:00Z",
        });
      }
      return route.fulfill({ status: 204 });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/trash$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(trashItems),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/trash$/) && method === "DELETE") {
      trashItems.splice(0, trashItems.length);
      return route.fulfill({ status: 204 });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/trash\/[^/]+\/restore$/) && method === "POST") {
      const parts = url.split("/");
      const trashId = parts[parts.length - 2];
      const index = trashItems.findIndex((item) => item.id === trashId);
      if (index >= 0) {
        const [item] = trashItems.splice(index, 1);
        documents.push({
          id: item.documentId,
          relativePath: item.relativePath,
          title: item.title,
          status: "draft",
          contentHash: item.contentHash,
          updatedClock: 7,
          versionId: "v-restored",
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ relativePath: "intro.md", title: "Intro", status: "draft", content: "# Intro", contentHash: "abc", versionId: "v-restored", updatedClock: 7 }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/trash\/[^/]+$/) && method === "DELETE") {
      const trashId = url.split("/").pop();
      const index = trashItems.findIndex((item) => item.id === trashId);
      if (index >= 0) trashItems.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+\/status$/) && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "doc-1", relativePath: "intro.md", title: "Intro", status: body?.status || "draft", contentHash: "abc", updatedClock: 6, versionId: "v1" }),
      });
    }
    if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+\/versions$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "v1", parentVersionId: null, source: "sync", contentHash: "abc", content: "# Intro\n\nVersion 1.", createdAt: "2025-01-01T00:00:00Z" },
        ]),
      });
    }

    // Fallback - 404
    return route.fulfill({ status: 404, body: JSON.stringify({ error: "not found" }) });
  });
}

async function loginAs(page: Page, username = "testuser", password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/workspaces(\/ws-1)?$/);
}

test.describe("Landing page", () => {
  test("shows landing and navigates to login", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("JType");
    await page.getByRole("link", { name: "Start writing" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("shows persisted login state and can sign out", async ({ page }) => {
    await mockApi(page);
    await loginAs(page);

    const reopened = await page.context().newPage();
    await mockApi(reopened);
    await reopened.goto("/");

    await expect(reopened.getByText("Signed in as testuser")).toBeVisible();
    await expect(reopened.getByRole("link", { name: "Open dashboard" })).toBeVisible();
    await expect(reopened.getByRole("link", { name: "Sign in" })).toHaveCount(0);

    await reopened.getByRole("button", { name: "Sign out" }).click();
    await expect(reopened.getByRole("link", { name: "Sign in" })).toBeVisible();
    expect(await reopened.evaluate(() => localStorage.getItem("jtype.token"))).toBeNull();
    expect(await reopened.evaluate(() => localStorage.getItem("jtype.username"))).toBeNull();
  });
});

test.describe("Authentication", () => {
  test("login flow", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Password").fill("password123");
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/workspaces(\/ws-1)?$/);
  });

  test("register flow", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByRole("button", { name: "Register" }).first().click();
    await page.getByLabel("Username").fill("newuser");
    await page.getByLabel("Password").fill("strongpassword");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/workspaces(\/ws-1)?$/);
  });

  test("shows error on failed login", async ({ page }) => {
    await page.route("**/api/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid credentials" }),
      }),
    );
    await page.goto("/login");
    await page.getByLabel("Username").fill("bad");
    await page.getByLabel("Password").fill("bad");
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
  });

  test("opens the first workspace", async ({ page }) => {
    await expect(page).toHaveURL(/\/workspaces\/ws-1/);
    await expect(page.getByRole("heading", { name: "notes" })).toBeVisible();
  });

  test("creates a new workspace", async ({ page }) => {
    await page.getByRole("button", { name: /notes 2 documents/ }).click();
    await page.getByPlaceholder("New cloud workspace").fill("my-project");
    await page.getByRole("button", { name: "New", exact: true }).click();
    await expect(page).toHaveURL(/\/workspaces\/ws-new/);
  });

  test("switches workspace from the workspace menu", async ({ page }) => {
    await page.getByRole("button", { name: /notes 2 documents/ }).click();
    await page.getByRole("menuitem", { name: /B blog 3 documents/i }).click();
    await expect(page).toHaveURL(/\/workspaces\/ws-2/);
  });
});

test.describe("Workspace Documents", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");
  });

  test("lists documents", async ({ page }) => {
    await expect(page.getByRole("button", { name: "intro.md", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /guides\/setup guides\/setup\.md Markdown/ })).toBeVisible();
  });

  test("opens a document for editing", async ({ page }) => {
    await page.getByRole("button", { name: "intro.md", exact: true }).click();
    await expect(page.locator("textarea")).toHaveValue("# Intro\n\nHello from cloud.");
  });

  test("creates a new document", async ({ page }) => {
    await page.getByRole("button", { name: "New Document" }).first().click();
    await page.getByRole("button", { name: /Markdown document/ }).click();
    await page.getByPlaceholder("Document name").fill("new-note");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("button", { name: "new-note.md", exact: true })).toBeVisible();
  });

  test("creates an empty folder without gitkeep placeholder", async ({ page }) => {
    await page.getByRole("button", { name: "New folder" }).click();
    await page.getByRole("dialog").locator("input").fill("Research");
    await page.getByRole("button", { name: "OK" }).click();

    await expect(page.getByRole("button", { name: /Research/ })).toBeVisible();
    await expect(page.getByText(".gitkeep")).toHaveCount(0);
  });

  test("deletes a document", async ({ page }) => {
    await page.getByRole("button", { name: "intro.md", exact: true }).click();
    await page.getByRole("button", { name: "Move to trash" }).click();
    await expect(page.getByRole("button", { name: "intro.md", exact: true })).toHaveCount(0);
  });

  test("restores a document from trash", async ({ page }) => {
    await page.getByRole("button", { name: "intro.md", exact: true }).click();
    await page.getByRole("button", { name: "Move to trash" }).click();
    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("No deleted documents.")).toBeVisible();
    await expect(page.getByRole("button", { name: "intro.md", exact: true })).toBeVisible();
  });
});

test.describe("Kanban sequence pull", () => {
  test("quick create uses create-only writes and retries a path collision without overwriting", async ({ page }) => {
    const creates: Array<{ relativePath: string; createOnly?: boolean }> = [];
    page.on("request", (request) => {
      if (!request.url().endsWith("/documents/save") || request.method() !== "POST") return;
      const payload = request.postDataJSON();
      if (payload?.createOnly) creates.push({ relativePath: payload.relativePath, createOnly: payload.createOnly });
    });
    await mockApi(page, { createCollisionOnce: true });
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");
    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    await page.getByRole("button", { name: "New card" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New card" });
    await dialog.getByRole("textbox", { name: "Card title" }).fill("Collision card");
    await dialog.getByRole("button", { name: "Create card" }).click();

    await expect.poll(() => creates.length).toBe(2);
    expect(creates[0]).toEqual({ relativePath: "infra-web/collision-card.md", createOnly: true });
    expect(creates[1]?.createOnly).toBe(true);
    expect(creates[1]?.relativePath).not.toBe(creates[0]?.relativePath);
  });

  test("keeps persisted Inbox dismissals while a Card snapshot is still loading", async ({ page }) => {
    await mockApi(page, { cardFetchDelayMs: 250 });
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
      localStorage.setItem(
        "jtype.board-view.v1:testuser:ws-1:infra-web",
        JSON.stringify({ version: 1, scope: "inbox", dismissedInboxItemKeys: ["infra-web/todo-card.md:due:2026-08-02"] }),
      );
    });
    await page.goto("/workspaces/ws-1");
    await page.getByRole("button", { name: /infra-web\.board/ }).click();

    await expect(page.getByText("Inbox zero")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("jtype.board-view.v1:testuser:ws-1:infra-web") ?? "{}").dismissedInboxItemKeys))
      .toEqual(["infra-web/todo-card.md:due:2026-08-02"]);
  });

  test("projects matching Markdown Cards from outside the board-named folder", async ({ page }) => {
    await mockApi(page, { outOfFolderCard: true });
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");

    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    await expect(page.getByText("Cross folder card")).toBeVisible();
    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.getByRole("button", { name: /Cross folder card/ })).toBeVisible();
  });

  test("uses vertical swimlanes and the filter toolbar in the real web board", async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");

    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    const swimlanes = page.getByLabel("Swimlanes", { exact: true });
    await expect(swimlanes.locator('option[value="status"]')).toHaveText("Swimlanes: Status");
    await expect(swimlanes.locator('option[value="custom"]')).toHaveText("Swimlanes: Custom");

    await page.getByRole("button", { name: "Manage statuses" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage statuses" });
    await dialog.getByRole("button", { name: "Add status" }).click();
    await dialog.getByRole("textbox", { name: "Status name" }).fill("Review");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog.getByText("Review", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();

    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("checkbox", { name: "high" }).click();
    await page.getByRole("checkbox", { name: "My cards" }).click();
    await expect(page.getByText("1 of 1 cards shown")).toBeVisible();

    await page.getByRole("checkbox", { name: "high" }).click();
    await page.getByRole("checkbox", { name: "My cards" }).click();
    await page.getByRole("button", { name: "Filters" }).click();
    await swimlanes.selectOption("priority");
    await expect(swimlanes).toHaveValue("priority");
    const card = page.locator('[data-card-id="infra-web/todo-card.md"]');
    const cardShell = card.locator("..");
    const target = page.locator('[data-col-key="urgent"]');
    const cardBox = await card.boundingBox();
    const targetBox = await target.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    const cardSave = page.waitForRequest((request) => {
      if (!request.url().includes("/documents/save") || request.method() !== "POST") return false;
      const payload = request.postDataJSON();
      return payload?.relativePath === "infra-web/todo-card.md";
    });

    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(cardBox!.x + cardBox!.width / 2 + 8, cardBox!.y + cardBox!.height / 2, { steps: 4 });
    await expect(cardShell).toHaveClass(/opacity-40/);
    await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 80, { steps: 12 });
    await expect(target).toHaveClass(/border-brand\/40/);
    await page.mouse.up();

    expect((await cardSave).postDataJSON()?.content).toContain("priority: urgent");
    await expect(target).toContainText("Todo card");
  });

  test("keeps a viewer read-only while persisting personal views and exposing audited activity", async ({ page }) => {
    const mutationRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/api/v1/workspaces/ws-1/") &&
        request.method() !== "GET"
      ) {
        mutationRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    await mockApi(page, { workspaceRole: "viewer", ticketKey: "OCCSV" });
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");

    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    await expect(page.getByText("Todo card")).toBeVisible();
    await expect(page.getByRole("button", { name: "Project settings" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Manage statuses" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New card" })).toHaveCount(0);

    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() =>
      page.evaluate(() => {
        const key = Object.keys(localStorage).find((item) => item.startsWith("jtype.board-view.v1:testuser:ws-1:"));
        return key ? JSON.parse(localStorage.getItem(key) ?? "{}").viewType : null;
      }),
    ).toBe("table");

    await page.reload();
    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    await expect(page.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Todo card/ }).click();
    const detail = page.getByRole("dialog", { name: "Card details" });
    await expect(detail.getByPlaceholder("Untitled card")).toHaveAttribute("readonly", "");
    await expect(detail.getByRole("button", { name: "Delete card" })).toHaveCount(0);
    await expect(detail.getByText("Changed status")).toBeVisible();
    await expect(detail.getByText("Test User")).toBeVisible();
    await expect(detail.getByText("MCP", { exact: true })).toBeVisible();
    await expect(detail.getByText("Roadmap automation")).toBeVisible();
    expect(mutationRequests).toEqual([]);
  });

  test("continues from the last successful sequence", async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem("jtype.token", "tok_test");
      localStorage.setItem("jtype.username", "testuser");
    });
    await page.goto("/workspaces/ws-1");

    await page.getByRole("button", { name: /infra-web\.board/ }).click();
    await expect(page.getByText("Todo card")).toBeVisible();
    await page.getByRole("button", { name: "Board settings" }).click();
    await page.getByRole("button", { name: "Pull", exact: true }).click();
    await expect(page.locator('input[readonly]').first()).toHaveValue(/\/boards\/infra-web\/events\/pull\?afterSequence=0&limit=100$/);

    const firstRequest = page.waitForRequest((request) => request.url().includes("/events/pull?afterSequence=0&limit=100"));
    await page.getByRole("button", { name: "Pull once" }).click();
    await firstRequest;
    await expect(page.getByText("cursor: 2 · more events available")).toBeVisible();
    await expect(page.getByText(/\"sequence\":2/)).toBeVisible();

    const secondRequest = page.waitForRequest((request) => request.url().includes("/events/pull?afterSequence=2&limit=100"));
    await page.getByRole("button", { name: "Pull next page" }).click();
    await secondRequest;
    await expect(page.getByText("cursor: 3", { exact: true })).toBeVisible();
    await expect(page.getByText(/\"sequence\":3/)).toBeVisible();
    await expect(page.getByText("more events available")).toHaveCount(0);
  });
});

test.describe("Help center", () => {
  test("documents vertical swimlanes and lightweight filters", async ({ page }) => {
    await page.goto("/help/c/kanban/web-board-view");

    await expect(page.getByRole("heading", { name: "Manage the status workflow" })).toBeVisible();
    await expect(page.getByText("Each status has a stable internal ID.")).toBeVisible();
    await expect(page.getByText(/Swimlanes.*choose the one vertical dimension/)).toBeVisible();
  });

  test("publishes the Kanban automation guide in app", async ({ page }) => {
    await page.goto("/help/c/kanban");

    await page.getByRole("link", { name: /Automate a board/ }).click();
    await expect(page).toHaveURL("/help/c/kanban/automate-a-board");
    await expect(page.getByRole("heading", { name: "Choose a delivery mode" })).toBeVisible();
    await expect(page.getByText("nextSequence", { exact: true })).toBeVisible();
  });
});

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
  });

  test("shows profile information", async ({ page }) => {
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await expect(page.getByLabel("Username")).toHaveValue("testuser");
    await expect(page.getByLabel("Display name")).toHaveValue("Test User");
    await page.getByRole("button", { name: "Email", exact: true }).click();
    await expect(page.getByLabel("Email address")).toHaveValue("test@example.com");
  });

  test("updates profile", async ({ page }) => {
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await page.getByLabel("Display name").fill("New Name");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
  });

  test("shows storage usage", async ({ page }) => {
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await expect(page.getByText("50.0 MB")).toBeVisible();
    await expect(page.getByText("1.0 GB")).toBeVisible();
  });

  test("shows connected devices", async ({ page }) => {
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await expect(page.getByText("dev-abc1")).toBeVisible();
    await expect(page.getByLabel("Settings").getByText("notes")).toBeVisible();
  });
});

test.describe("Admin Panel", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Admin", exact: true }).click();
  });

  test("shows stats overview", async ({ page }) => {
    await expect(page.getByText("5", { exact: true })).toBeVisible(); // Users
    await expect(page.getByText("12", { exact: true })).toBeVisible(); // Workspaces
    await expect(page.getByText("89", { exact: true })).toBeVisible(); // Documents
  });

  test("shows users table", async ({ page }) => {
    await expect(page.getByRole("cell", { name: "admin" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "alice" })).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
  });

  test("toggles user enabled status", async ({ page }) => {
    await page.getByRole("button", { name: "Disable" }).first().click();
    // After toggle, the UI updates locally
    await expect(page.getByText("Disabled")).toBeVisible();
  });

  test("switches to workspaces tab", async ({ page }) => {
    await page.getByRole("button", { name: "Cloud workspaces" }).click();
    await expect(page.getByRole("cell", { name: "notes" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "blog" })).toBeVisible();
  });

  test("switches to domains tab", async ({ page }) => {
    await page.getByRole("button", { name: "domains" }).click();
    await expect(page.getByText("alice.dev")).toBeVisible();
    await expect(page.getByText("verified")).toBeVisible();
    await expect(page.getByText("pending")).toBeVisible();
  });
});

test.describe("Sidebar navigation", () => {
  test("navigates between pages", async ({ page }) => {
    await mockApi(page);
    await loginAs(page);

    await expect(page).toHaveURL(/\/workspaces\/ws-1/);

    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).last().click();

    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Admin", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).last().click();
    await expect(page).toHaveURL(/\/workspaces\/ws-1/);
  });

  test("sign out clears session", async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });
});
