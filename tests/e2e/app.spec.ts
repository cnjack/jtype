import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __E2E_FS__: Record<string, string>;
    __SYNC_REQUESTS__: unknown[];
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
      if (url.endsWith("/api/sync/workspace")) {
        window.__SYNC_REQUESTS__.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
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
  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("open markdown");
  await page.getByRole("button", { name: /Open Markdown file/ }).click();
}

test("opens a workspace and renders a markdown file", async ({ page }) => {
  await expect(page.locator("#welcome-screen")).toContainText("Open a workspace or edit a Markdown file");
  await openWorkspace(page);
  await expect(page.locator("#workspace-name")).toHaveText("workspace");
  await expect(page.locator("#open-folder")).toBeHidden();

  await page.getByRole("button", { name: /MD intro\.md/ }).click();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Intro\n\nHello from workspace.");
  await expect(page.locator("#preview")).toContainText("Hello from workspace.");
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

  await page.locator("#publish-panel").getByRole("button", { name: "Export preview" }).click();
  await expect(page.locator("#operation-log")).toContainText("Exported 2 page");
});

test("registers and syncs a workspace to the web service", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#sync-panel-button").click();
  await page.getByLabel("Account username").fill("jack");
  await page.getByLabel("Account password").fill("secret123");

  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.locator("#operation-log")).toContainText("Registered as jack");

  await page.locator("#account-sync").click();
  await expect(page.locator("#operation-log")).toContainText("Synced 2 document");
  await expect(page.locator("#account-site-link")).toHaveAttribute("href", "http://localhost:8080/@jack");

  const requestCount = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  expect(requestCount).toBe(1);
});

test("uses command palette to run save", async ({ page }) => {
  await openFile(page);
  await page.getByLabel("Markdown editor").fill("# Intro\n\nSaved from command palette.");

  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("save");
  await page.getByRole("button", { name: /Save current file/ }).click();

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
  await page.getByRole("button", { name: /MD intro\.md/ }).click();
  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Intro\n\nHello from workspace.");

  await page.locator("#properties-panel").getByLabel("title").fill("Intro Title");
  await page.locator("#properties-panel").getByLabel("title").blur();

  await expect(page.getByLabel("Markdown editor")).toHaveValue(/title: Intro Title/);

  await expect(page.locator("#outline-panel")).toContainText("Intro");
});

test("toggles favorite and renders document publish panel", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: /MD intro\.md/ }).click();
  await page.getByRole("button", { name: "Star" }).click();

  await expect(page.locator("#favorite-list")).toContainText("intro.md");
  await expect(page.locator("#publish-panel")).toContainText("Publish flow");
});

test("supports split preview, formulas, mermaid, and table editing", async ({ page }) => {
  await openFile(page);
  await page.getByLabel("Markdown editor").fill("# Diagram\n\n$E = mc^2$\n\n```mermaid\nflowchart TD\n  A --> B\n```\n");

  await expect(page.locator("#preview")).toContainText("Diagram");
  await expect(page.locator("#preview .katex")).toBeVisible();
  await expect(page.locator("#preview svg")).toBeVisible();

  await page.keyboard.press("Control+Shift+T");
  await expect(page.getByLabel("Markdown editor")).toHaveValue(/\| Column\s+\| Value/);

  await page.getByLabel("Markdown editor").click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Add table row below" }).click();
  await expect(page.getByLabel("Markdown editor")).toHaveValue(/\| Column\s+\| Value\s+\|[\s\S]+\|\s+\|\s+\|[\s\S]+\| Item\s+\| Detail\s+\|/);
});
