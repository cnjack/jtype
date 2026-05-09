import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for the JType web frontend (management dashboard).
 * These mock all /api/* calls so no real backend is required.
 */

function mockApi(page: Page) {
  const documents = [
    { id: "doc-1", relativePath: "intro.md", title: "Intro", status: "published", contentHash: "abc", updatedClock: 5, versionId: "v1" },
    { id: "doc-2", relativePath: "guides/setup.md", title: "Setup Guide", status: "draft", contentHash: "def", updatedClock: 3, versionId: "v2" },
  ];
  const folders = [
    { id: "folder-1", relativePath: "guides", updatedClock: 2 },
  ];
  const trashItems: Array<Record<string, string>> = [];

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
          workspaces: [
            { id: "ws-1", name: "notes", slug: "notes", publishTitle: "Notes", role: "owner", documentCount: 5, storageBudgetBytes: 536870912, storageUsedBytes: 52428800 },
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
          role: "owner",
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
  await page.getByRole("button", { name: "Sign in" }).click();
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
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/workspaces(\/ws-1)?$/);
  });

  test("register flow", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByRole("button", { name: "Register" }).click();
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
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
  });

  test("shows workspaces list", async ({ page }) => {
    await expect(page.getByText("notes")).toBeVisible();
    await expect(page.getByText("blog")).toBeVisible();
    await expect(page.getByText("5 docs")).toBeVisible();
  });

  test("creates a new workspace", async ({ page }) => {
    await page.getByPlaceholder("New workspace name").fill("my-project");
    await page.getByRole("button", { name: "Create" }).click();
    // After creation, the workspace list is refetched (mock returns same list)
    await expect(page.getByText("notes")).toBeVisible();
  });

  test("navigates to workspace detail", async ({ page }) => {
    await page.getByText("notes").click();
    await expect(page).toHaveURL(/\/workspaces\/ws-1/);
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
    await expect(page.getByText("intro.md")).toBeVisible();
    await expect(page.getByText("guides/setup.md")).toBeVisible();
  });

  test("opens a document for editing", async ({ page }) => {
    await page.getByText("intro.md").click();
    await expect(page.locator("textarea")).toHaveValue("# Intro\n\nHello from cloud.");
  });

  test("creates a new document", async ({ page }) => {
    await page.getByPlaceholder("path/to/doc.md").fill("new-note.md");
    await page.getByRole("button", { name: "+" }).click();
    // After creation, docs are refreshed
    await expect(page.getByText("intro.md")).toBeVisible();
  });

  test("creates an empty folder without gitkeep placeholder", async ({ page }) => {
    await page.getByRole("button", { name: "New folder" }).click();
    await page.getByRole("dialog").locator("input").fill("Research");
    await page.getByRole("button", { name: "OK" }).click();

    await expect(page.getByRole("button", { name: /Research/ })).toBeVisible();
    await expect(page.getByText(".gitkeep")).toHaveCount(0);
  });

  test("deletes a document", async ({ page }) => {
    await page.getByRole("button", { name: "Move intro.md to trash" }).click();
    await expect(page.getByText("intro.md")).toHaveCount(0);
  });

  test("restores a document from trash", async ({ page }) => {
    await page.getByRole("button", { name: "Move intro.md to trash" }).click();
    await page.getByRole("button", { name: "Trash", exact: true }).click();
    await expect(page.getByText("intro.md")).toBeVisible();

    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Trash is empty.")).toBeVisible();

    await page.getByRole("button", { name: "Documents", exact: true }).click();
    await expect(page.getByText("intro.md")).toBeVisible();
  });
});

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
  });

  test("shows profile information", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel("Username")).toHaveValue("testuser");
    await expect(page.getByLabel("Display Name")).toHaveValue("Test User");
    await expect(page.getByLabel("Email")).toHaveValue("test@example.com");
  });

  test("updates profile", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByLabel("Display Name").fill("New Name");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
  });

  test("shows storage usage", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByText("50.0 MB")).toBeVisible();
    await expect(page.getByText("1.0 GB")).toBeVisible();
  });

  test("shows connected devices", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByText("dev-abc1")).toBeVisible();
    await expect(page.getByText("notes")).toBeVisible();
  });
});

test.describe("Admin Panel", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
    await page.getByRole("link", { name: "Admin" }).click();
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
    await page.getByRole("button", { name: "workspaces" }).click();
    await expect(page.getByText("notes")).toBeVisible();
    await expect(page.getByText("blog")).toBeVisible();
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

    // Dashboard is visible
    await expect(page.getByText("Workspaces")).toBeVisible();

    // Go to Settings
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");

    // Go to Admin
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL("/admin");

    // Back to Dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("sign out clears session", async ({ page }) => {
    await mockApi(page);
    await loginAs(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });
});
