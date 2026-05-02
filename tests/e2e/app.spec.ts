import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __E2E_FS__: Record<string, string>;
    __SYNC_REQUESTS__: unknown[];
    __VAULT_BINDINGS__: unknown[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const files: Record<string, string> = {
      "C:/workspace/intro.md": "# Intro\n\nHello from workspace.",
      "C:/workspace/guides/setup.md": "# Setup\n\nInstall and run.",
    };

    const workspace = {
      rootPath: "C:/workspace",
      name: "workspace",
      metadataCreated: false,
      entries: [
        {
          name: ".jtype",
          path: "C:/workspace/.jtype",
          relativePath: ".jtype",
          kind: "folder",
          children: [],
        },
        {
          name: "guides",
          path: "C:/workspace/guides",
          relativePath: "guides",
          kind: "folder",
          children: [
            {
              name: "setup.md",
              path: "C:/workspace/guides/setup.md",
              relativePath: "guides/setup.md",
              kind: "markdown",
              children: [],
            },
          ],
        },
        {
          name: "intro.md",
          path: "C:/workspace/intro.md",
          relativePath: "intro.md",
          kind: "markdown",
          children: [],
        },
      ],
    };

    let callbackId = 0;
    let eventId = 0;

    Object.assign(window, {
      isTauri: true,
      __E2E_FS__: files,
      __SYNC_REQUESTS__: [],
      __VAULT_BINDINGS__: [],
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: () => undefined,
      },
      __TAURI_INTERNALS__: {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main" },
        },
        transformCallback: () => ++callbackId,
        unregisterCallback: () => undefined,
        convertFileSrc: (path: string) => path,
        invoke: async (cmd: string, args: Record<string, unknown>) => {
          if (cmd === "initial_open_paths") return [];
          if (cmd === "load_cloud_profile") {
            return { serverUrl: "http://localhost:13345", username: "", siteUrl: "", token: "", deviceId: "dev_e2e" };
          }
          if (cmd === "save_cloud_profile") return args.profile;
          if (cmd === "list_vault_bindings") return window.__VAULT_BINDINGS__;
          if (cmd === "bind_cloud_workspace") {
            window.__VAULT_BINDINGS__ = [args.binding];
            return window.__VAULT_BINDINGS__;
          }
          if (cmd === "open_default_vault") return { ...workspace, rootPath: "C:/Users/Jack/Documents/.jtype", name: ".jtype", metadataCreated: true };
          if (cmd === "plugin:event|listen") return ++eventId;
          if (cmd === "plugin:dialog|open") {
            const options = args.options as { directory?: boolean };
            return options.directory ? "C:/workspace" : "C:/workspace/intro.md";
          }
          if (cmd === "open_workspace") return workspace;
          if (cmd === "read_markdown_file") return files[String(args.path)] ?? "";
          if (cmd === "write_markdown_file") {
            files[String(args.path)] = String(args.content);
            return null;
          }
          if (cmd === "create_workspace_entry") {
            const relativePath = String(args.relativePath);
            const path = `C:/workspace/${relativePath}`;
            files[path] = "";
            workspace.entries.push({
              name: relativePath.split("/").pop() ?? relativePath,
              path,
              relativePath,
              kind: "markdown",
              children: [],
            });
            return workspace;
          }
          if (cmd === "rename_workspace_entry") return workspace;
          if (cmd === "delete_workspace_entry") return workspace;
          if (cmd === "export_static_site") {
            return { outputDir: "C:/workspace/.jtype/dist", pages: ["intro.html", "guides/setup.html"] };
          }
          if (cmd === "validate_workspace") {
            return { errors: [], warnings: [] };
          }
          if (cmd === "plugin:opener|open_path") return null;
          if (cmd === "plugin:opener|open_url") return null;
          if (cmd === "build_ai_index") {
            return { outputFile: "C:/workspace/.jtype/ai-context.jsonl", documents: 2, chunks: 2, links: 1, assets: 1 };
          }
          if (cmd === "collect_sync_documents") {
            return [
              {
                relativePath: "intro.md",
                title: "Intro",
                status: "published",
                content: files["C:/workspace/intro.md"],
              },
              {
                relativePath: "guides/setup.md",
                title: "Setup",
                status: "published",
                content: files["C:/workspace/guides/setup.md"],
              },
            ];
          }
          if (cmd === "apply_cloud_documents") {
            const docs = args.documents as { relativePath: string; content: string }[];
            for (const doc of docs) {
              files[`C:/workspace/${doc.relativePath}`] = doc.content;
            }
            return workspace;
          }
          throw new Error(`Unhandled invoke: ${cmd}`);
        },
      },
    });

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/register") || url.endsWith("/api/login")) {
        return new Response(
          JSON.stringify({
            token: "test-token",
            username: "jack",
            siteUrl: "http://localhost:8080/@jack",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/oauth/device/start")) {
        return new Response(
          JSON.stringify({
            deviceCode: "device-e2e",
            userCode: "123456",
            verificationUrl: "http://localhost:13345/oauth/device?code=123456",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/oauth/device/poll")) {
        return new Response(
          JSON.stringify({
            token: "test-token",
            username: "jack",
            siteUrl: "http://localhost:8080/@jack",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/v1/workspaces")) {
        return new Response(JSON.stringify({ workspaces: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/sync/workspace")) {
        window.__SYNC_REQUESTS__.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            workspaceName: "workspace",
            documentCount: 2,
            siteUrl: "http://localhost:8080/@jack",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unhandled fetch: ${url}`);
    };
  });

  await page.goto("/");
});

async function openWorkspace(page: import("@playwright/test").Page) {
  await page.locator("#welcome-open-folder").click();
}

async function openFile(page: import("@playwright/test").Page) {
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("open markdown");
  await page.locator("#command-results").getByRole("button", { name: /Open Markdown file/ }).click();
}

test("opens a workspace and renders a markdown file", async ({ page }) => {
  await expect(page.locator("#welcome-screen")).toContainText("Create a vault or edit one Markdown file");
  await openWorkspace(page);
  await expect(page.locator("#workspace-name")).toHaveText("workspace");
  await expect(page.locator("#vault-home")).toBeVisible();
  await expect(page.locator("#open-folder")).toBeHidden();

  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Intro\n\nHello from workspace.");
  await expect(page.locator("#preview")).toContainText("Hello from workspace.");
});

test("opens the default vault from welcome", async ({ page }) => {
  await page.locator("#welcome-default-vault").click();
  await expect(page.locator("#workspace-name")).toHaveText(".jtype");
  await expect(page.locator("#workspace-path")).toHaveText("C:/Users/Jack/Documents/.jtype");
  await expect(page.locator("#operation-log")).toContainText("Default vault created");
});

test("edits and saves the current markdown file", async ({ page }) => {
  await openFile(page);
  await expect(page.locator("#workspace-sidebar")).toBeHidden();
  await expect(page.locator("#sync-panel-button")).toBeHidden();
  await expect(page.locator("#app-context-title")).toHaveText("Markdown file");
  await page.getByLabel("Markdown editor").fill("# Intro\n\nUpdated content.");

  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.locator("#file-state")).toHaveText("Saved");
  const savedContent = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(savedContent).toBe("# Intro\n\nUpdated content.");
});

test("runs export from the document info panel", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();

  await page.locator("#publish-panel").getByRole("button", { name: "Export preview" }).click();
  await expect(page.locator("#operation-log")).toContainText("Exported 2 page");
});

test("connects in browser and syncs a vault to the web service", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#sync-panel-button").click();

  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });

  await page.locator("#account-sync").click();
  await expect(page.locator("#operation-log")).toContainText("Synced 2 document");
  await expect(page.locator("#account-site-link")).toHaveAttribute("href", "http://localhost:8080/u/jack");

  const requestCount = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  expect(requestCount).toBe(1);
  const bindings = await page.evaluate(() => window.__VAULT_BINDINGS__);
  expect(bindings).toEqual([
    {
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      localVaultPath: "C:/workspace",
      lastPulledClock: 0,
    },
  ]);
});

test("uses command palette to run save", async ({ page }) => {
  await openFile(page);
  await page.getByLabel("Markdown editor").fill("# Intro\n\nSaved from command palette.");

  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("save");
  await page.locator("#command-results").getByRole("button", { name: /Save current file/ }).click();

  await expect(page.locator("#file-state")).toContainText("Saved");
  const savedContent = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(savedContent).toBe("# Intro\n\nSaved from command palette.");
});

test("uses quick switcher to open a workspace document", async ({ page }) => {
  await openWorkspace(page);

  await page.keyboard.press("Control+O");
  await page.getByLabel("Open or create note").fill("setup");
  await page.locator("#quick-results").getByRole("button", { name: /setup\.md/ }).click();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Setup\n\nInstall and run.");
  await expect(page.locator("#document-breadcrumbs")).toContainText("guides/setup.md");
});

test("edits frontmatter properties and shows outline", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Intro\n\nHello from workspace.");

  await page.locator("#properties-panel").getByLabel("title").fill("Intro Title");
  await page.locator("#properties-panel").getByLabel("title").blur();

  await expect(page.getByLabel("Markdown editor")).toHaveValue(/title: Intro Title/);

  await expect(page.locator("#outline-panel")).toContainText("Intro");
});

test("toggles favorite and renders document publish panel", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  await page.getByRole("button", { name: "Star" }).click();

  await expect(page.locator("#favorite-list")).toContainText("intro.md");
  await expect(page.locator("#publish-panel")).toContainText("Publish flow");
});

test("supports split preview, formulas, mermaid, and table editing", async ({ page }) => {
  await openFile(page);
  const editor = page.getByLabel("Markdown editor");
  await editor.click();
  await editor.fill("# Diagram\n\n$E = mc^2$\n\n```mermaid\nflowchart TD\n  A --> B\n```\n");
  await editor.press("End");

  await expect(page.locator("#preview")).toContainText("Diagram");
  await expect(page.locator("#preview .katex")).toBeVisible();
  await expect(page.locator("#preview svg")).toBeVisible();

  const beforeTable = await editor.inputValue();
  expect(beforeTable).toContain("A --> B");

  await page.keyboard.press("Control+Shift+T");
  await expect(editor).toHaveValue(/\| Column\s+\| Value/);

  const afterTable = await editor.inputValue();
  expect(afterTable).toContain("| Column | Value |");
  expect(afterTable).toContain("| --- | --- |");

  await editor.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Add table row below" }).click();
  await expect(editor).toHaveValue(/\| Column\s+\| Value\s+\|[\s\S]+\|\s+\|\s+\|[\s\S]+\| Item\s+\| Detail\s+\|/);
});

test("pulls cloud edits into local vault after sync", async ({ page }) => {
  await page.addInitScript(() => {
    window.__VAULT_BINDINGS__ = [
      {
        workspaceId: "workspace-e2e",
        workspaceName: "workspace",
        workspaceSlug: "workspace",
        localVaultPath: "C:/workspace",
        lastPulledClock: 0,
      },
    ];
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/sync/pull")) {
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            documents: [
              {
                relativePath: "intro.md",
                title: "Intro",
                status: "published",
                content: "# Intro\n\nUpdated from cloud.",
                contentHash: "abc123",
                versionId: "v1",
                updatedClock: 5,
              },
              {
                relativePath: "cloud-note.md",
                title: "Cloud Note",
                status: "published",
                content: "# Cloud Note\n\nCreated on web.",
                contentHash: "def456",
                versionId: "v2",
                updatedClock: 6,
              },
            ],
            conflicts: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/push")) {
        return new Response(
          JSON.stringify({ workspaceId: "workspace-e2e", accepted: 2, documents: [], conflicts: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
  });
  await page.goto("/");

  await openWorkspace(page);
  await page.locator("#sync-panel-button").click();
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.locator("#account-sync").click();

  await expect(page.locator("#operation-log")).toContainText("Synced");
  const cloudContent = await page.evaluate(() => window.__E2E_FS__["C:/workspace/cloud-note.md"]);
  expect(cloudContent).toBe("# Cloud Note\n\nCreated on web.");
  const updatedIntro = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(updatedIntro).toBe("# Intro\n\nUpdated from cloud.");
});

test("pushes desktop edits to cloud workspace", async ({ page }) => {
  await page.addInitScript(() => {
    let pushReceived: unknown = null;
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/sync/pull")) {
        return new Response(
          JSON.stringify({ workspaceId: "workspace-e2e", documents: [], conflicts: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/push")) {
        pushReceived = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ workspaceId: "workspace-e2e", accepted: 2, documents: [], conflicts: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
    Object.defineProperty(window, "__PUSH_RECEIVED__", { get: () => pushReceived, configurable: true });
    window.__VAULT_BINDINGS__ = [
      {
        workspaceId: "workspace-e2e",
        workspaceName: "workspace",
        workspaceSlug: "workspace",
        localVaultPath: "C:/workspace",
        lastPulledClock: 0,
      },
    ];
  });
  await page.goto("/");

  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  await page.getByLabel("Markdown editor").fill("# Intro\n\nEdited locally for push.");
  await page.getByRole("button", { name: "Save" }).click();

  await page.locator("#sync-panel-button").click();
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.locator("#account-sync").click();

  await expect(page.locator("#operation-log")).toContainText("Synced");
  const pushData = await page.evaluate(() => (window as unknown as { __PUSH_RECEIVED__: { documents: { relativePath: string }[] } }).__PUSH_RECEIVED__);
  expect(pushData).toBeTruthy();
  expect(pushData.documents.length).toBeGreaterThanOrEqual(1);
  const introDoc = pushData.documents.find((d: { relativePath: string }) => d.relativePath === "intro.md");
  expect(introDoc).toBeTruthy();
});

test("shows and resolves sync conflicts", async ({ page }) => {
  await page.addInitScript(() => {
    const origFetch = window.fetch;
    let conflictResolved = false;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/sync/pull")) {
        return new Response(
          JSON.stringify({ workspaceId: "workspace-e2e", documents: [], conflicts: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/push")) {
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            accepted: 1,
            documents: [],
            conflicts: [
              {
                conflictId: "conflict-1",
                relativePath: "intro.md",
                localContent: "# Intro\n\nLocal version.",
                cloudContent: "# Intro\n\nCloud version.",
                baseContent: "# Intro\n\nOriginal.",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/conflicts/conflict-1/resolve")) {
        conflictResolved = true;
        return new Response(
          JSON.stringify({
            relativePath: "intro.md",
            title: "Intro",
            status: "published",
            content: "# Intro\n\nCloud version.",
            contentHash: "resolved123",
            versionId: "v3",
            updatedClock: 10,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
    Object.defineProperty(window, "__CONFLICT_RESOLVED__", { get: () => conflictResolved, configurable: true });
    window.__VAULT_BINDINGS__ = [
      {
        workspaceId: "workspace-e2e",
        workspaceName: "workspace",
        workspaceSlug: "workspace",
        localVaultPath: "C:/workspace",
        lastPulledClock: 0,
      },
    ];
  });
  await page.goto("/");

  await openWorkspace(page);
  await page.locator("#sync-panel-button").click();
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.locator("#account-sync").click();

  await expect(page.locator("#account-conflict-list")).toContainText("intro.md");
  await page.locator("#account-conflict-list").getByRole("button", { name: "Accept cloud" }).click();

  await expect(page.locator("#operation-log")).toContainText("Resolved conflict in intro.md");
  const resolved = await page.evaluate(() => (window as unknown as { __CONFLICT_RESOLVED__: boolean }).__CONFLICT_RESOLVED__);
  expect(resolved).toBe(true);
  const content = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(content).toBe("# Intro\n\nCloud version.");
});

test("accepts workspace invite and creates local vault binding", async ({ page }) => {
  await page.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/workspaces")) {
        return new Response(
          JSON.stringify({
            workspaces: [
              {
                id: "ws-invited",
                name: "Team Docs",
                slug: "team-docs",
                role: "editor",
                documentCount: 3,
                storageBudgetBytes: 1073741824,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
  });
  await page.goto("/");

  await openWorkspace(page);
  await page.locator("#sync-panel-button").click();
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });

  await expect(page.locator("#account-workspace-list")).toContainText("Team Docs");
  await expect(page.locator("#account-workspace-list")).toContainText("editor");

  await page.locator("#account-workspace-list").getByRole("button", { name: "Team Docs" }).click();
  const bindings = await page.evaluate(() => window.__VAULT_BINDINGS__);
  expect(bindings).toEqual([
    expect.objectContaining({
      workspaceId: "ws-invited",
      workspaceName: "Team Docs",
      localVaultPath: "C:/workspace",
    }),
  ]);
});
