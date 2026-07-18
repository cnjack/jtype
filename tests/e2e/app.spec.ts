import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __E2E_FS__: Record<string, string>;
    __SYNC_REQUESTS__: unknown[];
    __SYNC_BASES__: Record<string, string>;
    __SYNC_FOLDER_BASES__: string[];
    __SYNC_PUSH_ERROR__: string | null;
    __TRASH_METADATA__: {
      lastSyncedClock: number;
      pendingTrashOps: Array<{ type: string; trashId?: string }>;
    };
    __VAULT_BINDINGS__: unknown[];
    __VAULT_SETTINGS__: Record<string, { cloudSyncEnabled: boolean; syncPromptDismissedAt: string | null; syncDisabledPermanently: boolean }>;
    __RUNTIME_CAPABILITIES__?: Record<string, unknown>;
    __EXTERNAL_VAULT_RESULT__?: Record<string, unknown>;
    __EXTERNAL_PENDING__?: boolean;
    __EXTERNAL_CONFLICTS__?: Array<{ relativePath: string; reason: string }>;
    __LAST_EXTERNAL_RESOLUTION__?: Record<string, unknown>;
    __CLOUD_PROFILE__?: Record<string, unknown>;
    __START_LISTENER_ARGS__?: Record<string, unknown>;
    __START_LISTENER_CALLS__: Record<string, unknown>[];
    __STOP_LISTENER_CALLS__: number;
    __SYNC_CLIENT_TYPES__: Array<string | null>;
    __E2E_INSTALL_BOARD__?: () => void;
    __DIALOG_OPEN_RESULT__?: string | string[] | null;
    __LAST_IMPORT_ARGS__?: Record<string, unknown>;
    __LAST_SHARE_ARGS__?: Record<string, unknown>;
    __LAST_SHARE_PDF_ARGS__?: Record<string, unknown>;
    __LAST_BINARY_WRITE_ARGS__?: Record<string, unknown>;
    __HAPTIC_STYLES__: string[];
    __INITIAL_EXTERNAL_SOURCES_JSON__?: string;
    __INITIAL_DEEP_LINKS__?: string[] | null;
    __LAST_OPEN_URL__?: string;
    __OAUTH_START_BODY__?: Record<string, unknown>;
    __OAUTH_POLL_PENDING__: boolean;
    __EMIT_TAURI_EVENT__: (event: string, payload: unknown) => number;
    __EMIT_TAURI_PLUGIN_EVENT__: (plugin: string, event: string, payload: unknown) => number;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
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
    const tauriCallbacks = new Map<number, (value: unknown) => void>();
    const eventSubscriptions = new Map<number, { event: string; handler: number }>();
    const pluginSubscriptions = new Map<number, { plugin: string; event: string; handler: number; nextIndex: number }>();
    const trashItems: Array<{ trashId: string; relativePath: string; name: string; trashedAt: number; content: string }> = [];
    const workspaceSnapshot = () => JSON.parse(JSON.stringify(workspace));
    const removeWorkspaceEntry = (entries: Array<{ relativePath: string; path: string; children: unknown[] }>, relativePath: string): boolean => {
      const index = entries.findIndex((entry) => entry.relativePath === relativePath);
      if (index >= 0) {
        entries.splice(index, 1);
        return true;
      }
      return entries.some((entry) => removeWorkspaceEntry(entry.children as Array<{ relativePath: string; path: string; children: unknown[] }>, relativePath));
    };
    const hasWorkspaceEntry = (entries: Array<{ relativePath: string; children: unknown[] }>, relativePath: string): boolean =>
      entries.some((entry) =>
        entry.relativePath === relativePath ||
        hasWorkspaceEntry(entry.children as Array<{ relativePath: string; children: unknown[] }>, relativePath),
      );
    const installBoardFixture = () => {
      if (hasWorkspaceEntry(workspace.entries, "team.board")) return;
      files["C:/workspace/team.board"] = JSON.stringify({
        id: "team",
        title: "Team board",
        groupBy: "status",
        columns: [
          { key: "todo", name: "To do" },
          { key: "done", name: "Done" },
        ],
        doneColumn: "done",
      });
      files["C:/workspace/team/plan-release.md"] =
        "---\ntitle: Plan release\nboard: team\nstatus: todo\nposition: 0\npriority: high\n---\n\nShip the mobile app.";
      workspace.entries.push(
        {
          name: "team.board",
          path: "C:/workspace/team.board",
          relativePath: "team.board",
          kind: "board",
          children: [],
        },
        {
          name: "team",
          path: "C:/workspace/team",
          relativePath: "team",
          kind: "folder",
          children: [
            {
              name: "plan-release.md",
              path: "C:/workspace/team/plan-release.md",
              relativePath: "team/plan-release.md",
              kind: "markdown",
              children: [],
            },
          ],
        },
      );
    };
    const scanBoardFixture = (boardId: string) =>
      Object.entries(files)
        .filter(([path, content]) => path.endsWith(".md") && content.includes(`board: ${boardId}`))
        .map(([path, content]) => {
          const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
          const data = Object.fromEntries(
            (match?.[1] ?? "")
              .split("\n")
              .map((line) => line.match(/^([^:]+):\s*(.*)$/))
              .filter((item): item is RegExpMatchArray => Boolean(item))
              .map((item) => [item[1].trim(), item[2].trim()]),
          );
          return {
            relativePath: path.slice("C:/workspace/".length),
            path,
            title: data.title || path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled",
            status: data.status || "todo",
            position: Number(data.position || 0),
            priority: data.priority || null,
            assignee: data.assignee || null,
            due: data.due || null,
            tags: [],
            taskDone: 0,
            taskTotal: 0,
            body: match?.[2]?.trim() || "",
            properties: data,
            blockedBy: [],
            blocks: [],
            relates: [],
            parent: null,
          };
        });

    Object.assign(window, {
      isTauri: true,
      __E2E_FS__: files,
      __SYNC_REQUESTS__: [],
      __SYNC_BASES__: {},
      __SYNC_FOLDER_BASES__: [],
      __SYNC_PUSH_ERROR__: null,
      __TRASH_METADATA__: { lastSyncedClock: 0, pendingTrashOps: [] },
      __VAULT_BINDINGS__: [],
      __SYNC_CLIENT_TYPES__: [],
      __START_LISTENER_CALLS__: [],
      __STOP_LISTENER_CALLS__: 0,
      __HAPTIC_STYLES__: [],
      __OAUTH_POLL_PENDING__: false,
      __VAULT_SETTINGS__: {
        "C:/workspace": {
          cloudSyncEnabled: true,
          syncPromptDismissedAt: new Date().toISOString(),
          syncDisabledPermanently: false,
        },
      },
      __E2E_INSTALL_BOARD__: installBoardFixture,
      __EMIT_TAURI_EVENT__: (event: string, payload: unknown) => {
        let invoked = 0;
        for (const [id, subscription] of eventSubscriptions) {
          if (subscription.event !== event) continue;
          tauriCallbacks.get(subscription.handler)?.({ event, id, payload });
          invoked += 1;
        }
        return invoked;
      },
      __EMIT_TAURI_PLUGIN_EVENT__: (plugin: string, event: string, payload: unknown) => {
        let invoked = 0;
        for (const subscription of pluginSubscriptions.values()) {
          if (subscription.plugin !== plugin || subscription.event !== event) continue;
          tauriCallbacks.get(subscription.handler)?.({
            index: subscription.nextIndex,
            message: payload,
          });
          subscription.nextIndex += 1;
          invoked += 1;
        }
        return invoked;
      },
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: (_event: string, id: number) => eventSubscriptions.delete(id),
      },
      __TAURI_INTERNALS__: {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main" },
        },
        transformCallback: (callback: (value: unknown) => void) => {
          const id = ++callbackId;
          tauriCallbacks.set(id, callback);
          return id;
        },
        unregisterCallback: (id: number) => tauriCallbacks.delete(id),
        convertFileSrc: (path: string) => path,
        invoke: async (cmd: string, args: Record<string, unknown>) => {
          if (cmd === "runtime_capabilities") {
            return window.__RUNTIME_CAPABILITIES__ ?? {
              platform: "desktop",
              clientType: "desktop",
              isMobile: false,
              isTouchPrimary: false,
              prefersCompactLayout: false,
              supportsWindowDrag: true,
              supportsUpdater: true,
              supportsProcessRestart: true,
              supportsCliInstall: true,
              supportsFileDrop: true,
              supportsExternalVault: true,
              usesAppPrivateVault: false,
            };
          }
          if (cmd === "initial_open_paths") {
            return JSON.parse((window as unknown as { __INITIAL_OPEN_PATHS_JSON__?: string }).__INITIAL_OPEN_PATHS_JSON__ ?? "[]");
          }
          if (cmd === "perform_haptic") {
            window.__HAPTIC_STYLES__.push(String(args.style));
            return true;
          }
          if (cmd === "initial_external_file_sources") {
            const sources = JSON.parse(window.__INITIAL_EXTERNAL_SOURCES_JSON__ ?? "[]");
            window.__INITIAL_EXTERNAL_SOURCES_JSON__ = "[]";
            return sources;
          }
          if (cmd === "load_cloud_profile") {
            return window.__CLOUD_PROFILE__ ?? { serverUrl: "http://localhost:13345", username: "", siteUrl: "", token: "", deviceId: "dev_e2e" };
          }
          if (cmd === "save_cloud_profile") return args.profile;
          if (cmd === "save_mobile_pending_oauth") {
            window.sessionStorage.setItem("jtype-e2e-pending-oauth", JSON.stringify(args.pending));
            return args.pending;
          }
          if (cmd === "load_mobile_pending_oauth") {
            const pending = window.sessionStorage.getItem("jtype-e2e-pending-oauth");
            return pending ? JSON.parse(pending) : null;
          }
          if (cmd === "clear_mobile_pending_oauth") {
            window.sessionStorage.removeItem("jtype-e2e-pending-oauth");
            return null;
          }
          if (cmd === "save_mobile_draft_recovery") {
            window.sessionStorage.setItem("jtype-e2e-mobile-draft", JSON.stringify(args.draft));
            return args.draft;
          }
          if (cmd === "load_mobile_draft_recovery") {
            const draft = window.sessionStorage.getItem("jtype-e2e-mobile-draft");
            return draft ? JSON.parse(draft) : null;
          }
          if (cmd === "clear_mobile_draft_recovery") {
            window.sessionStorage.removeItem("jtype-e2e-mobile-draft");
            return null;
          }
          if (cmd === "list_vault_bindings") return window.__VAULT_BINDINGS__;
          if (cmd === "bind_cloud_workspace") {
            const binding = args.binding as { workspaceId: string; localVaultPath: string };
            window.__VAULT_BINDINGS__ = [
              ...window.__VAULT_BINDINGS__
                .filter((item) => (item as { workspaceId: string }).workspaceId !== binding.workspaceId)
                .filter((item) => (item as { localVaultPath: string }).localVaultPath !== binding.localVaultPath),
              args.binding,
            ];
            return window.__VAULT_BINDINGS__;
          }
          if (cmd === "unbind_cloud_workspace") {
            window.__VAULT_BINDINGS__ = window.__VAULT_BINDINGS__.filter(
              (item) => {
                const binding = item as { workspaceId: string; localVaultPath: string };
                return !(binding.workspaceId === args.workspaceId && binding.localVaultPath === args.vaultPath);
              },
            );
            window.__SYNC_BASES__ = {};
            return null;
          }
          if (cmd === "clear_sync_bases") {
            window.__SYNC_BASES__ = {};
            return null;
          }
          if (cmd === "load_vault_settings") {
            return window.__VAULT_SETTINGS__[String(args.vaultPath)] ?? null;
          }
          if (cmd === "save_vault_settings") {
            window.__VAULT_SETTINGS__[String(args.vaultPath)] = args.settings as { cloudSyncEnabled: boolean; syncPromptDismissedAt: string | null; syncDisabledPermanently: boolean };
            return null;
          }
          if (cmd === "open_default_vault") return { ...workspaceSnapshot(), rootPath: "C:/Users/Jack/Documents/.jtype", name: ".jtype", metadataCreated: true };
          if (cmd === "initialize_external_vault") return window.__EXTERNAL_VAULT_RESULT__;
          if (cmd === "reauthorize_external_vault") {
            const external = window.__EXTERNAL_VAULT_RESULT__ as {
              provider: { accessState: string; capabilities: Record<string, boolean> };
            };
            external.provider.accessState = "ready";
            external.provider.capabilities.canWrite = true;
            external.provider.capabilities.canCreate = true;
            external.provider.capabilities.canRename = true;
            external.provider.capabilities.canDelete = true;
            return external.provider;
          }
          if (cmd === "reconcile_external_vault") {
            const external = window.__EXTERNAL_VAULT_RESULT__ as {
              provider: Record<string, unknown>;
              workspace: Record<string, unknown>;
            };
            const conflicts = window.__EXTERNAL_CONFLICTS__ ?? [];
            return {
              provider: external.provider,
              workspace: external.workspace,
              status: conflicts.length > 0 ? "conflict" : "unchanged",
              pulledFiles: 0,
              pulledDirectories: 0,
              deletedEntries: 0,
              pendingLocalChanges: 0,
              conflicts,
            };
          }
          if (cmd === "resolve_external_vault_conflict") {
            const external = window.__EXTERNAL_VAULT_RESULT__ as {
              provider: Record<string, unknown>;
              workspace: Record<string, unknown>;
            };
            window.__LAST_EXTERNAL_RESOLUTION__ = { ...args };
            window.__EXTERNAL_CONFLICTS__ = (window.__EXTERNAL_CONFLICTS__ ?? []).filter(
              (conflict) => conflict.relativePath !== args.relativePath,
            );
            return {
              provider: external.provider,
              workspace: external.workspace,
              pendingWriteBack: false,
              conflicts: window.__EXTERNAL_CONFLICTS__,
            };
          }
          if (cmd === "write_back_external_vault") {
            const external = window.__EXTERNAL_VAULT_RESULT__ as {
              provider: Record<string, unknown>;
              workspace: Record<string, unknown>;
            };
            window.__EXTERNAL_PENDING__ = false;
            return {
              provider: external.provider,
              workspace: external.workspace,
              status: "written",
              writtenFiles: 1,
              createdDirectories: 0,
              deletedEntries: 0,
              pulledBeforeWrite: 0,
              pendingJournal: false,
              conflicts: [],
            };
          }
          if (cmd === "inspect_vault_provider") {
            const rootPath = String(args.rootPath ?? "C:/workspace");
            const external = window.__EXTERNAL_VAULT_RESULT__ as {
              provider?: Record<string, unknown>;
              workspace?: { rootPath?: string };
            } | undefined;
            if (external?.provider && external.workspace?.rootPath === rootPath) {
              return { provider: external.provider, pendingWriteBack: window.__EXTERNAL_PENDING__ ?? false };
            }
            return {
              provider: {
                providerId: `local:${rootPath}`,
                kind: "localDirectory",
                displayName: rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? "Vault",
                localRootPath: rootPath,
                accessState: "ready",
                storageMode: "direct",
                capabilities: {
                  canRead: true,
                  canWrite: true,
                  canCreate: true,
                  canRename: true,
                  canDelete: true,
                  canWatch: true,
                  canReconcile: false,
                  canReauthorize: false,
                },
              },
              pendingWriteBack: false,
            };
          }
          if (cmd === "plugin:event|listen") {
            const id = ++eventId;
            eventSubscriptions.set(id, { event: String(args.event), handler: Number(args.handler) });
            return id;
          }
          if (cmd === "plugin:event|unlisten") {
            eventSubscriptions.delete(Number(args.eventId));
            return null;
          }
          if (cmd === "plugin:mobile-import|registerListener") {
            const handler = args.handler as { id: number };
            pluginSubscriptions.set(handler.id, {
              plugin: "mobile-import",
              event: String(args.event),
              handler: handler.id,
              nextIndex: 0,
            });
            return null;
          }
          if (cmd === "plugin:mobile-import|remove_listener") {
            pluginSubscriptions.delete(Number(args.channelId));
            return null;
          }
          if (cmd === "plugin:deep-link|get_current") return window.__INITIAL_DEEP_LINKS__ ?? null;
          if (cmd === "plugin:updater|check") return null;
          if (cmd === "plugin:dialog|open") {
            const options = args.options as { directory?: boolean };
            if (window.__DIALOG_OPEN_RESULT__ !== undefined) return window.__DIALOG_OPEN_RESULT__;
            return options.directory ? "C:/workspace" : "C:/workspace/intro.md";
          }
          if (cmd === "plugin:dialog|save") {
            // "Save as" used by the draft flow when no workspace is open.
            const options = args.options as { defaultPath?: string };
            const name = (options.defaultPath ?? "Untitled.md").replace(/\\/g, "/");
            const path = name.includes("/") ? `C:${name.startsWith("/") ? "" : "/"}${name}` : `C:/workspace/${name}`;
            files[path] = "";
            return path;
          }
          if (cmd === "open_workspace") return workspaceSnapshot();
          if (cmd === "read_markdown_file") return files[String(args.path)] ?? "";
          if (cmd === "write_markdown_file") {
            files[String(args.path)] = String(args.content);
            return null;
          }
          if (cmd === "share_markdown") {
            window.__LAST_SHARE_ARGS__ = args;
            return null;
          }
          if (cmd === "share_pdf") {
            window.__LAST_SHARE_PDF_ARGS__ = args;
            return null;
          }
          if (cmd === "write_binary_file") {
            window.__LAST_BINARY_WRITE_ARGS__ = args;
            return null;
          }
          if (cmd === "read_board_file") return files[String(args.path)] ?? "";
          if (cmd === "write_board_file") {
            files[String(args.path)] = String(args.content);
            return null;
          }
          if (cmd === "scan_board_cards") return scanBoardFixture(String(args.boardId));
          if (cmd === "scan_card_templates") return [];
          if (cmd === "load_sync_bases") return window.__SYNC_BASES__;
          if (cmd === "save_sync_bases") {
            const docs = args.documents as Array<{ relativePath: string; content: string }>;
            for (const doc of docs) window.__SYNC_BASES__[doc.relativePath] = doc.content;
            return null;
          }
          if (cmd === "delete_sync_bases") {
            const relativePaths = args.relativePaths as string[];
            for (const relativePath of relativePaths) delete window.__SYNC_BASES__[relativePath];
            return null;
          }
          if (cmd === "load_sync_folder_bases") return window.__SYNC_FOLDER_BASES__;
          if (cmd === "save_sync_folder_bases") {
            window.__SYNC_FOLDER_BASES__ = [...(args.folders as string[])];
            return null;
          }
          if (cmd === "delete_sync_folder_bases") {
            const relativePaths = new Set(args.relativePaths as string[]);
            window.__SYNC_FOLDER_BASES__ = window.__SYNC_FOLDER_BASES__.filter((path) => !relativePaths.has(path));
            return null;
          }
          if (cmd === "load_trash_metadata_cmd") return window.__TRASH_METADATA__;
          if (cmd === "save_trash_metadata_cmd") {
            window.__TRASH_METADATA__ = args.metadata as typeof window.__TRASH_METADATA__;
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
            return workspaceSnapshot();
          }
          if (cmd === "import_external_paths") {
            window.__LAST_IMPORT_ARGS__ = args;
            const rootPath = String(args.rootPath);
            const sourcePaths = args.sourcePaths as string[];
            const targetFolder = String(args.targetFolder ?? "").replace(/^\/+|\/+$/g, "");
            const source = sourcePaths[0] ?? "imported-file";
            const sourceLeaf = decodeURIComponent(source.split("/").pop() || "Imported Note.md");
            const fileName = /\.(md|markdown|mdown|mkd)$/i.test(sourceLeaf) ? sourceLeaf : "Imported Note.md";
            const relativePath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
            const path = `${rootPath}/${relativePath}`;
            files[path] = "# Imported Note\n\nCopied into the private vault.";
            if (!hasWorkspaceEntry(workspace.entries, relativePath)) {
              workspace.entries.push({
                name: fileName,
                path,
                relativePath,
                kind: "markdown",
                children: [],
              });
            }
            return [
              { ...workspaceSnapshot(), rootPath, name: rootPath.split("/").pop() || "vault" },
              [relativePath],
            ];
          }
          if (cmd === "rename_workspace_entry") return workspaceSnapshot();
          if (cmd === "delete_workspace_entry") return workspaceSnapshot();
          if (cmd === "trash_workspace_entry") {
            const relativePath = String(args.relativePath);
            const path = `C:/workspace/${relativePath}`;
            const content = files[path] ?? "";
            delete files[`C:/workspace/${relativePath}`];
            removeWorkspaceEntry(workspace.entries, relativePath);
            trashItems.push({
              trashId: `${Date.now()}/${relativePath}`,
              relativePath,
              name: relativePath.split("/").pop() ?? relativePath,
              trashedAt: Math.floor(Date.now() / 1000),
              content,
            });
            return workspaceSnapshot();
          }
          if (cmd === "list_workspace_trash") {
            return trashItems.map(({ content: _content, ...item }) => item);
          }
          if (cmd === "restore_workspace_trash") {
            const trashId = String(args.trashId);
            const index = trashItems.findIndex((item) => item.trashId === trashId);
            if (index >= 0) {
              const [item] = trashItems.splice(index, 1);
              const path = `C:/workspace/${item.relativePath}`;
              files[path] = item.content;
              workspace.entries.push({
                name: item.name,
                path,
                relativePath: item.relativePath,
                kind: "markdown",
                children: [],
              });
            }
            return workspaceSnapshot();
          }
          if (cmd === "empty_workspace_trash") {
            trashItems.splice(0, trashItems.length);
            return workspaceSnapshot();
          }
          if (cmd === "export_static_site") {
            return { outputDir: "C:/workspace/.jtype/dist", pages: ["intro.html", "guides/setup.html"] };
          }
          if (cmd === "validate_workspace") {
            return { errors: [], warnings: [] };
          }
          if (cmd === "plugin:opener|open_path") return null;
          if (cmd === "plugin:opener|open_url") {
            window.__LAST_OPEN_URL__ = String(args.url);
            return null;
          }
          if (cmd === "build_ai_index") {
            return { outputFile: "C:/workspace/.jtype/ai-context.jsonl", documents: 2, chunks: 2, links: 1, assets: 1 };
          }
          if (cmd === "collect_sync_documents") {
            return Object.entries(files)
              .filter(([path]) => path.startsWith("C:/workspace/") && path.endsWith(".md"))
              .map(([path, content]) => {
                const relativePath = path.slice("C:/workspace/".length);
                const title = relativePath === "intro.md" ? "Intro" : "Setup";
                return { relativePath, title, status: "published", content };
              });
          }
          if (cmd === "collect_sync_folders") {
            const collectFolders = (entries: Array<{ relativePath: string; kind: string; children: unknown[] }>): Array<{ relativePath: string }> =>
              entries.flatMap((entry) => [
                ...(entry.kind === "folder" && entry.relativePath !== ".jtype" ? [{ relativePath: entry.relativePath }] : []),
                ...collectFolders(entry.children as Array<{ relativePath: string; kind: string; children: unknown[] }>),
              ]);
            return collectFolders(workspace.entries);
          }
          if (cmd === "apply_cloud_documents") {
            const docs = args.documents as { relativePath: string; content: string }[];
            for (const doc of docs) {
              files[`C:/workspace/${doc.relativePath}`] = doc.content;
              if (!hasWorkspaceEntry(workspace.entries, doc.relativePath)) {
                workspace.entries.push({
                  name: doc.relativePath.split("/").pop() ?? doc.relativePath,
                  path: `C:/workspace/${doc.relativePath}`,
                  relativePath: doc.relativePath,
                  kind: "markdown",
                  children: [],
                });
              }
            }
            const snapshot = workspaceSnapshot();
            const rootPath = String(args.rootPath);
            return {
              workspace: {
                ...snapshot,
                rootPath,
                name: rootPath.split(/[\\/]/).pop() || snapshot.name,
              },
              writtenPaths: docs.map((doc) => doc.relativePath),
            };
          }
          if (cmd === "apply_deleted_cloud_folders") return workspaceSnapshot();
          if (cmd === "collect_asset_paths") return [];
          if (cmd === "load_asset_sync_state") return { clock: 0, bases: {} };
          if (cmd === "save_asset_sync_state") return null;
          if (cmd === "start_cloud_listener") {
            window.__START_LISTENER_ARGS__ = args;
            window.__START_LISTENER_CALLS__.push(args);
            return null;
          }
          if (cmd === "stop_cloud_listener") {
            window.__STOP_LISTENER_CALLS__ += 1;
            return null;
          }
          if (cmd === "cloud_ws_send") return null;
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
            siteUrl: "http://localhost:8080/u/jack/workspace",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/oauth/device/start")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        window.__OAUTH_START_BODY__ = body;
        const verificationUrl = new URL("http://localhost:13345/oauth/device");
        verificationUrl.searchParams.set("code", "123456");
        if (typeof body.returnUrl === "string") verificationUrl.searchParams.set("return_to", body.returnUrl);
        return new Response(
          JSON.stringify({
            deviceCode: "device-e2e",
            userCode: "123456",
            verificationUrl: verificationUrl.toString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/oauth/device/poll")) {
        if (window.__OAUTH_POLL_PENDING__) {
          return new Response("authorization pending", { status: 400 });
        }
        return new Response(
          JSON.stringify({
            token: "test-token",
            username: "jack",
            siteUrl: "http://localhost:8080/u/jack/workspace",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/v1/workspaces")) {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body ?? "{}")) as { name?: string };
          return new Response(
            JSON.stringify({
              id: "workspace-e2e",
              name: body.name || "workspace",
              slug: "workspace",
              role: "owner",
              documentCount: 0,
              storageBudgetBytes: 1073741824,
              storageUsedBytes: 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
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
            siteUrl: "http://localhost:8080/u/jack/workspace",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/pull")) {
        return new Response(
          JSON.stringify({ workspaceId: "workspace-e2e", documents: [], deletedPaths: [], conflicts: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/push")) {
        if (window.__SYNC_PUSH_ERROR__) {
          return new Response(window.__SYNC_PUSH_ERROR__, { status: 500 });
        }
        window.__SYNC_REQUESTS__.push(JSON.parse(String(init?.body)));
        window.__SYNC_CLIENT_TYPES__.push(new Headers(init?.headers).get("x-client-type"));
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            accepted: 2,
            documents: [
              {
                relativePath: "intro.md",
                title: "Intro",
                status: "published",
                content: "# Intro\n\nHello from workspace.",
                contentHash: "abc123",
                versionId: "v1",
                updatedClock: 1,
                mergeStatus: "accepted",
              },
              {
                relativePath: "guides/setup.md",
                title: "Setup",
                status: "published",
                content: "# Setup\n\nInstall and run.",
                contentHash: "def456",
                versionId: "v2",
                updatedClock: 2,
                mergeStatus: "accepted",
              },
            ],
            conflicts: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/manifest")) {
        return new Response(JSON.stringify({ documents: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.match(/\/api\/v1\/workspaces\/[^/]+\/documents$/) && (!init?.method || init.method === "GET")) {
        const documents = Object.keys(files)
          .filter((path) => path.startsWith("C:/workspace/") && path.endsWith(".md"))
          .map((path, index) => ({
            id: `doc-${index + 1}`,
            relativePath: path.slice("C:/workspace/".length),
          }));
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        url.match(/\/api\/v1\/workspaces\/[^/]+\/documents\/[^/]+\/publish$/) &&
        (!init?.method || init.method === "GET")
      ) {
        const segments = new URL(url).pathname.split("/");
        return new Response(
          JSON.stringify({
            documentId: segments.at(-2),
            isPublished: false,
            publishedAt: null,
            currentHash: "",
            publishedHash: null,
            hasUnpublishedChanges: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/blobs?sinceClock=")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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

async function openProfileSettings(page: import("@playwright/test").Page) {
  await page.locator("#sync-panel-button").click();
  await page.getByRole("menuitem", { name: "Profile" }).click();
}

// Start an in-memory draft via the command palette. We don't use Ctrl+N here
// because Chromium intercepts it as a browser-level "new window" shortcut and
// never delivers the keydown to the page. The Tauri desktop shell does not
// intercept it, so the binding itself is exercised manually.
async function createDraft(page: import("@playwright/test").Page) {
  // Wait for the app shell to render before firing the shortcut — pressing it
  // during the initial async startup (vault restore, etc.) is a no-op.
  await expect(page.locator("main")).toBeVisible();
  await page.keyboard.press("Control+Shift+P");
  const search = page.getByLabel("Search commands");
  await search.waitFor();
  await search.fill("untitled");
  await page.locator("#command-results").getByRole("button", { name: /untitled/i }).click();
}

test("keeps desktop runtime capabilities on the shared app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-jtype-platform", "desktop");
  await expect(page.locator("html")).toHaveAttribute("data-jtype-mobile", "false");
  await expect(page.locator("header")).toHaveAttribute("data-tauri-drag-region", "");
});

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

test("opens an initial markdown file passed by the OS", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __INITIAL_OPEN_PATHS_JSON__?: string }).__INITIAL_OPEN_PATHS_JSON__ = JSON.stringify(["C:/workspace/intro.md"]);
  });
  await page.reload();

  await expect(page.locator("#workspace-sidebar")).toBeHidden();
  await expect(page.locator("#app-context-title")).toHaveText("Markdown file");
  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Intro\n\nHello from workspace.");
  await expect(page.locator("#preview")).toContainText("Hello from workspace.");
});

test("opens the default vault from welcome", async ({ page }) => {
  await page.locator("#welcome-default-vault").click();
  await expect(page.locator("#workspace-name")).toHaveText(".jtype");
  await expect(page.locator("#vault-home")).toContainText("C:/Users/Jack/Documents/.jtype");
  await expect(page.locator("#operation-log")).toContainText("Default vault created");
});

test("adapts the shared welcome screen to app-private mobile storage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem("jtype-locale", "zh");
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      configurable: true,
    });
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-jtype-platform", "ios");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.locator("#welcome-private-vault-note")).toBeVisible();
  await expect(page.locator("#sync-panel-button")).toBeVisible();
  await expect(page.locator("#welcome-open-folder")).toBeHidden();
  await expect(page.locator("#welcome-open-markdown")).toBeHidden();
  await expect(page.getByText("~/Documents/Jtype Vaullt")).toBeHidden();
  const mobileShellViewport = await page.locator("#app-content-panel").evaluate((panel) => {
    const screen = panel.querySelector<HTMLElement>("#welcome-screen");
    const panelBounds = panel.getBoundingClientRect();
    return {
      panelClientWidth: panel.clientWidth,
      panelScrollWidth: panel.scrollWidth,
      panelRight: panelBounds.right,
      screenClientWidth: screen?.clientWidth ?? 0,
      screenScrollWidth: screen?.scrollWidth ?? 0,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileShellViewport.panelScrollWidth).toBeLessThanOrEqual(mobileShellViewport.panelClientWidth);
  expect(mobileShellViewport.screenScrollWidth).toBeLessThanOrEqual(mobileShellViewport.screenClientWidth);
  expect(mobileShellViewport.panelRight).toBeLessThanOrEqual(mobileShellViewport.viewportWidth);

  // Continue the broader interaction coverage in English so its established
  // accessible-name selectors remain stable after the localized shell check.
  await page.addInitScript(() => window.localStorage.setItem("jtype-locale", "en"));
  await page.reload();
  await page.evaluate(() => window.__E2E_INSTALL_BOARD__?.());

  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();

  await expect(page.locator("#vault-home")).toBeVisible();
  await expect(page.locator("#vault-home-private-note")).toBeVisible();
  await expect(page.locator("#workspace-sidebar")).toBeHidden();
  await expect(page.getByText("C:/Users/Jack/Documents/.jtype")).toBeHidden();
  const contentPanel = await page.locator("#app-content-panel").boundingBox();
  expect(contentPanel?.width).toBeGreaterThan(350);

  await page.locator("#mobile-navigation-button").click();
  await expect(page.locator("#mobile-vault-navigation")).toBeVisible();
  await expect(page.locator("#mobile-vault-navigation #workspace-sidebar")).toBeVisible();
  await page.locator("#mobile-vault-navigation").getByLabel("Actions for intro.md").click();
  await expect(page.locator("#mobile-file-actions")).toBeVisible();
  await expect(page.locator("#mobile-file-actions")).toContainText("Rename");
  await expect(page.locator("#mobile-file-actions")).toContainText("Move to...");
  await expect(page.locator("#mobile-file-actions")).toContainText("Move to trash");
  await page.locator("#mobile-file-actions").getByRole("button", { name: "Open" }).click();
  await expect(page.locator("#mobile-file-actions")).toBeHidden();
  await expect(page.locator("#mobile-vault-navigation")).toBeHidden();

  await expect(page.getByLabel("Markdown editor")).toBeVisible();
  expect(
    await page.getByLabel("Markdown editor").evaluate((editor) => Number.parseFloat(getComputedStyle(editor).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(page.locator("#preview")).toBeHidden();
  await expect(page.getByTitle("Split")).toBeHidden();
  await page.getByTitle("Preview").click();
  await expect(page.locator("#preview")).toBeVisible();
  await expect(page.locator("#preview")).toContainText("Hello from workspace.");

  await page.getByRole("button", { name: "Document info" }).click();
  await expect(page.locator("#document-panel")).toBeVisible();
  await expect(page.locator("#properties-panel")).toBeVisible();
  await page.getByLabel("title").fill("Mobile title");
  await expect(page.getByLabel("Markdown editor")).toHaveValue(/title: Mobile title/);
  await page.locator("#document-panel").getByRole("button", { name: "Hide" }).click();
  await expect(page.locator("#document-panel")).toBeHidden();

  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "team.board", exact: true }).click();
  await expect(page.locator("#mobile-vault-navigation")).toBeHidden();
  await expect(page.locator("#board-surface")).toHaveAttribute("data-compact", "true");
  await expect(page.locator("#board-surface")).toContainText("Plan release");

  await page.getByLabel("Actions for Plan release").click();
  await page.getByLabel("Move Plan release to Done").click();
  await expect.poll(() => page.evaluate(() => window.__E2E_FS__["C:/workspace/team/plan-release.md"])).toContain("status: done");

  await page.getByText("Plan release", { exact: true }).click();
  await expect(page.locator("#board-card-peek")).toBeVisible();
  const boardBox = await page.locator("#board-surface").boundingBox();
  const peekBox = await page.locator("#board-card-peek").boundingBox();
  expect(peekBox?.width).toBeCloseTo(boardBox?.width ?? 0, 0);
  await page.locator("#board-card-peek").getByTitle("Close").click();
  await expect(page.locator("#board-card-peek")).toBeHidden();

  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "New Document", exact: true }).click();
  await expect(page.locator("#new-resource-dialog")).toHaveAttribute("data-compact", "true");
  await page.locator("#new-resource-dialog").getByRole("button", { name: /Markdown document/ }).click();
  await page.getByPlaceholder("Document name").fill("Mobile Note");
  await page.locator("#new-resource-dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.locator("#mobile-vault-navigation")).toBeHidden();
  await expect(page.getByLabel("Markdown editor")).toBeVisible();
  await page.getByLabel("Markdown editor").fill("# Mobile Note\n\nSaved on device.");
  const mobileSaveButton = page.getByRole("button", { name: "Save" });
  const mobileSaveBounds = await mobileSaveButton.boundingBox();
  expect(mobileSaveBounds).not.toBeNull();
  expect((mobileSaveBounds?.x ?? 0) + (mobileSaveBounds?.width ?? 0)).toBeLessThanOrEqual(390);
  await mobileSaveButton.click();
  await expect.poll(() => page.evaluate(() => window.__E2E_FS__["C:/workspace/Mobile Note.md"])).toBe("# Mobile Note\n\nSaved on device.");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("html")).toHaveAttribute("data-jtype-layout", "compact");
  await expect(page.getByTitle("Split")).toBeHidden();
});

test("exposes accessible shared controls and hardware keyboard actions on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();

  await expect(page.locator("#sync-panel-button")).toHaveAccessibleName("Sign in");
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await expect(page.locator("#mobile-navigation-button")).toHaveAccessibleName("Documents");
  await expect(page.locator("header").getByRole("button", { name: "Quick open" })).toHaveAttribute("aria-keyshortcuts", "Control+P Meta+P");

  await page.locator("#mobile-navigation-button").click();
  await expect(page.locator("#mobile-vault-navigation").getByRole("button", { name: "Close" })).toBeVisible();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "intro.md", exact: true }).click();

  const editorView = page.getByRole("group", { name: "Editor view" });
  await expect(editorView).toBeVisible();
  await expect(editorView.getByRole("button", { name: "Write" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Bold - Ctrl+B" })).toHaveAttribute("aria-keyshortcuts", "Control+B Meta+B");
  await expect(page.locator('button[aria-keyshortcuts="Control+S Meta+S"]')).toHaveCount(1);

  const unnamedVisibleButtons = await page.locator("button:visible:not([disabled])").evaluateAll((buttons) =>
    buttons
      .filter((button) => !(
        button.getAttribute("aria-label")?.trim()
        || button.getAttribute("title")?.trim()
        || button.textContent?.trim()
      ))
      .map((button) => button.outerHTML.slice(0, 160)),
  );
  expect(unnamedVisibleButtons).toEqual([]);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const keyboardFocusedControl = page.locator(":focus");
  await expect(keyboardFocusedControl).toBeVisible();
  const focusIndicator = await keyboardFocusedControl.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
  expect(focusIndicator.style).not.toBe("none");
  expect(Number.parseFloat(focusIndicator.width)).toBeGreaterThanOrEqual(2);

  await page.emulateMedia({ contrast: "more", reducedMotion: "reduce" });
  const accessibilityPreferences = await page.locator("html").evaluate((root) => {
    const rootStyle = getComputedStyle(root);
    const buttonStyle = getComputedStyle(document.querySelector("#mobile-navigation-button")!);
    return {
      brand: rootStyle.getPropertyValue("--color-brand").trim(),
      transitionDuration: buttonStyle.transitionDuration,
    };
  });
  expect(accessibilityPreferences.brand).toBe("#006865");
  expect(Number.parseFloat(accessibilityPreferences.transitionDuration)).toBeLessThanOrEqual(0.001);

  const editor = page.getByLabel("Markdown editor");
  await editor.focus();
  await editor.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, element.value.length));
  await page.keyboard.press("Control+B");
  await expect(editor).toHaveValue("**# Intro\n\nHello from workspace.**");
  await page.keyboard.press("Meta+Z");
  await expect(editor).toHaveValue("# Intro\n\nHello from workspace.");
  await page.keyboard.press("Meta+Shift+Z");
  await expect(editor).toHaveValue("**# Intro\n\nHello from workspace.**");
});

test("reuses desktop actions for mobile hold, swipe, selection and keyboard accessory", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();
  await page.evaluate(() => window.__E2E_INSTALL_BOARD__?.());
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();

  await page.locator("#mobile-navigation-button").click();
  const introRow = page.locator("#mobile-vault-navigation").getByRole("button", { name: "intro.md", exact: true });
  const introBounds = await introRow.boundingBox();
  expect(introBounds).not.toBeNull();
  const introY = (introBounds?.y ?? 0) + (introBounds?.height ?? 0) / 2;
  await introRow.dispatchEvent("pointerdown", {
    pointerId: 41,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: (introBounds?.x ?? 0) + 220,
    clientY: introY,
  });
  await page.waitForTimeout(560);
  await expect(page.locator("#mobile-file-actions")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__HAPTIC_STYLES__)).toContain("impact");
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-file-actions")).toBeHidden();

  await introRow.dispatchEvent("pointerdown", {
    pointerId: 42,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: (introBounds?.x ?? 0) + 260,
    clientY: introY,
  });
  await introRow.dispatchEvent("pointermove", {
    pointerId: 42,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: (introBounds?.x ?? 0) + 180,
    clientY: introY + 2,
  });
  await expect(page.locator("#mobile-file-actions")).toBeVisible();
  await page.locator("#mobile-file-actions").getByRole("button", { name: "Open" }).click();

  const editor = page.getByLabel("Markdown editor");
  await editor.focus();
  const accessory = page.getByRole("toolbar", { name: "Keyboard formatting" });
  await expect(accessory).toBeVisible();
  await editor.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, element.value.length));
  await accessory.getByRole("button", { name: "Bold" }).click();
  await expect(editor).toHaveValue("**# Intro\n\nHello from workspace.**");
  await accessory.getByRole("button", { name: "Undo" }).click();
  await expect(editor).toHaveValue("# Intro\n\nHello from workspace.");
  await accessory.getByRole("button", { name: "Redo" }).click();
  await expect(editor).toHaveValue("**# Intro\n\nHello from workspace.**");
  await expect.poll(() => page.evaluate(() => window.__HAPTIC_STYLES__.filter((style) => style === "selection").length)).toBeGreaterThanOrEqual(3);
  await accessory.getByRole("button", { name: "Dismiss keyboard" }).click();
  await expect(accessory).toBeHidden();

  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "team.board", exact: true }).click();
  const card = page.locator('[data-card-id="C:/workspace/team/plan-release.md"]');
  await expect(card).toBeVisible();
  const cardBounds = await card.boundingBox();
  expect(cardBounds).not.toBeNull();
  const cardX = (cardBounds?.x ?? 0) + 120;
  const cardY = (cardBounds?.y ?? 0) + 40;
  await card.dispatchEvent("pointerdown", {
    pointerId: 43,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: cardX,
    clientY: cardY,
  });
  await page.waitForTimeout(560);
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear selection" }).click();

  await card.dispatchEvent("pointerdown", {
    pointerId: 44,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: cardX + 80,
    clientY: cardY,
  });
  await card.dispatchEvent("pointermove", {
    pointerId: 44,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: cardX,
    clientY: cardY + 2,
  });
  await expect(page.getByLabel("Move Plan release to Done")).toBeVisible();
});

test("opens an Android SAF vault through the shared desktop vault action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: true,
      usesAppPrivateVault: true,
    };
    const provider = {
      providerId: "external:saf-e2e",
      kind: "externalMirror",
      displayName: "Device Notes",
      localRootPath: "/data/user/0/net.jcode.jtype/vaults/external/saf-e2e",
      accessState: "ready",
      storageMode: "mirror",
      capabilities: {
        canRead: true,
        canWrite: true,
        canCreate: true,
        canRename: true,
        canDelete: true,
        canWatch: true,
        canReconcile: true,
        canReauthorize: true,
      },
    };
    window.__EXTERNAL_VAULT_RESULT__ = {
      provider,
      workspace: {
        rootPath: provider.localRootPath,
        name: "saf-e2e",
        entries: [],
        metadataCreated: false,
      },
      importedFiles: 2,
      importedDirectories: 1,
      importedBytes: 128,
    };
  });
  await page.reload();

  await expect(page.locator("#welcome-open-folder")).toBeVisible();
  await page.locator("#welcome-open-folder").click();
  await expect(page.locator("#vault-home h2")).toHaveText("Device Notes");
  await expect(page.locator("#external-vault-status")).toContainText("Device Notes");
  await expect(page.locator("#external-vault-status")).toContainText("selected device folder");
  await expect(page.locator("#operation-log")).toContainText("Imported 2 files");
  await page.getByRole("button", { name: "Local only" }).click();
  await expect(page.locator("#vault-home-external-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Document" }).first()).toBeEnabled();

  await page.evaluate(() => {
    window.__EMIT_TAURI_EVENT__("vault-provider-operation-progress", {
      providerId: "external:saf-e2e",
      operation: "writeBack",
      phase: "applying",
      completed: 42,
      total: 120,
      currentPath: "batch/note-042.md",
      elapsedMs: 8300,
    });
  });
  await expect(page.locator("#external-vault-status")).toContainText("Syncing 42 of 120 external changes");
  await expect(page.getByRole("progressbar", { name: "External vault operation progress" })).toHaveAttribute("aria-valuenow", "42");
  await page.evaluate(() => {
    window.__EMIT_TAURI_EVENT__("vault-provider-operation-progress", {
      providerId: "external:saf-e2e",
      operation: "writeBack",
      phase: "completed",
      completed: 120,
      total: 120,
      currentPath: null,
      elapsedMs: 15100,
    });
  });
  await expect(page.getByRole("progressbar", { name: "External vault operation progress" })).toBeHidden();

  await page.evaluate(() => {
    const external = window.__EXTERNAL_VAULT_RESULT__ as {
      provider: { accessState: string; capabilities: Record<string, boolean> };
    };
    external.provider.accessState = "authorizationRequired";
    external.provider.capabilities.canWrite = false;
    external.provider.capabilities.canCreate = false;
    external.provider.capabilities.canRename = false;
    external.provider.capabilities.canDelete = false;
    window.__EMIT_TAURI_EVENT__("vault-provider-changed", external.provider);
  });
  await expect(page.locator("#external-vault-status")).toContainText("Folder access is required");
  await expect(page.getByRole("button", { name: "New Document" }).first()).toBeDisabled();
  await page.getByRole("button", { name: "Choose folder again" }).click();
  await expect(page.locator("#external-vault-status")).toContainText("selected device folder");

  await page.evaluate(() => {
    window.__EXTERNAL_PENDING__ = true;
    const external = window.__EXTERNAL_VAULT_RESULT__ as { provider: Record<string, unknown> };
    window.__EMIT_TAURI_EVENT__("vault-provider-changed", external.provider);
  });
  await expect(page.locator("#external-vault-status")).toContainText("interrupted change");
  await page.getByRole("button", { name: "Finish interrupted changes" }).click();
  await expect(page.locator("#external-vault-status")).toContainText("selected device folder");
  await expect(page.locator("#vault-home h2")).toHaveText("Device Notes");

  await page.evaluate(() => {
    window.__EXTERNAL_CONFLICTS__ = [{ relativePath: "intro.md", reason: "bothModified" }];
  });
  await page.getByRole("button", { name: "Check external changes" }).click();
  await expect(page.locator("#external-vault-conflict-dialog")).toBeVisible();
  await expect(page.locator("#external-vault-conflict-dialog")).toContainText("intro.md");
  await expect(page.locator("#external-vault-conflict-dialog")).toContainText("Both the device folder and JType changed this path.");
  await page.getByRole("button", { name: "Keep JType version" }).click();
  await expect.poll(() => page.evaluate(() => window.__LAST_EXTERNAL_RESOLUTION__)).toEqual({
    providerId: "external:saf-e2e",
    relativePath: "intro.md",
    resolution: "useJtype",
  });
  await expect(page.locator("#external-vault-conflict-dialog")).toBeHidden();
  await expect(page.locator("#external-vault-status")).toContainText("selected device folder");

  await page.evaluate(() => {
    window.__EXTERNAL_CONFLICTS__ = [{ relativePath: "guides/setup.md", reason: "sourceModifiedMirrorDeleted" }];
  });
  await page.getByRole("button", { name: "Check external changes" }).click();
  await expect(page.locator("#external-vault-conflict-dialog")).toContainText("guides/setup.md");
  await page.getByRole("button", { name: "Keep device folder version" }).click();
  await expect.poll(() => page.evaluate(() => window.__LAST_EXTERNAL_RESOLUTION__)).toEqual({
    providerId: "external:saf-e2e",
    relativePath: "guides/setup.md",
    resolution: "useSource",
  });
  await expect(page.locator("#external-vault-conflict-dialog")).toBeHidden();
});

test("opens an iOS security-scoped vault through the shared desktop vault action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: true,
      usesAppPrivateVault: true,
    };
    const provider = {
      providerId: "external:ios-e2e",
      kind: "externalMirror",
      displayName: "iCloud Notes",
      localRootPath: "/var/mobile/Containers/Data/Application/e2e/Library/Application Support/net.jcode.jtype/vaults/external/ios-e2e",
      accessState: "ready",
      storageMode: "mirror",
      capabilities: {
        canRead: true,
        canWrite: true,
        canCreate: true,
        canRename: true,
        canDelete: true,
        canWatch: true,
        canReconcile: true,
        canReauthorize: true,
      },
    };
    window.__EXTERNAL_VAULT_RESULT__ = {
      provider,
      workspace: {
        rootPath: provider.localRootPath,
        name: "ios-e2e",
        entries: [],
        metadataCreated: false,
      },
      importedFiles: 3,
      importedDirectories: 1,
      importedBytes: 256,
    };
  });
  await page.reload();

  await expect(page.locator("#welcome-open-folder")).toBeVisible();
  await page.locator("#welcome-open-folder").click();
  await expect(page.locator("#vault-home h2")).toHaveText("iCloud Notes");
  await expect(page.locator("#external-vault-status")).toContainText("selected device folder");
  await expect(page.locator("#operation-log")).toContainText("Imported 3 files");
  await page.getByRole("button", { name: "Local only" }).click();
  await expect(page.locator("#vault-home-external-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Document" }).first()).toBeEnabled();
  await page.locator("#mobile-navigation-button").click();
  await expect(page.locator("#mobile-vault-navigation")).toBeVisible();
  await expect(page.locator("#mobile-vault-navigation").getByRole("button", { name: "New Document", exact: true })).toBeEnabled();
});

test("imports an Android content URI through the shared resource flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__DIALOG_OPEN_RESULT__ = "content://net.jcode.fixture/Imported%20Note.md";
  });
  await page.reload();

  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.locator("#vault-home").getByRole("button", { name: "New Document" }).click();
  await page.locator("#new-resource-dialog").getByRole("button", { name: /Import file/ }).click();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Imported Note\n\nCopied into the private vault.");
  await expect(page.locator("#operation-log")).toContainText("Imported Imported Note.md");
  await expect.poll(() => page.evaluate(() => window.__LAST_IMPORT_ARGS__?.sourcePaths)).toEqual([
    "content://net.jcode.fixture/Imported%20Note.md",
  ]);
});

test("imports an initial mobile open-with URL into the private vault", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      configurable: true,
    });
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__INITIAL_EXTERNAL_SOURCES_JSON__ = JSON.stringify([
      "file:///private/tmp/Shared%20Draft.md",
    ]);
  });
  await page.reload();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Imported Note\n\nCopied into the private vault.");
  await expect.poll(() => page.evaluate(() => window.__LAST_IMPORT_ARGS__?.sourcePaths)).toEqual([
    "file:///private/tmp/Shared%20Draft.md",
  ]);
  await expect(page.locator("#operation-log")).toContainText("Imported Shared Draft.md");
});

test("drains a warm Android share intent through the existing vault import", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: true,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();

  await page.evaluate(() => {
    window.__INITIAL_EXTERNAL_SOURCES_JSON__ = JSON.stringify([
      "content://com.android.externalstorage.documents/document/primary%3ADownload%2FWarm%20Share.md",
    ]);
    window.__EMIT_TAURI_PLUGIN_EVENT__("mobile-import", "shareReceived", {});
  });

  await expect.poll(() => page.evaluate(() => window.__LAST_IMPORT_ARGS__?.sourcePaths)).toEqual([
    "content://com.android.externalstorage.documents/document/primary%3ADownload%2FWarm%20Share.md",
  ]);
  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Imported Note\n\nCopied into the private vault.");
});

test("reuses the regular desktop workbench on a mobile tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-jtype-layout", "regular");
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "intro.md", exact: true }).click();

  await expect(page.getByTitle("Split")).toBeVisible();
  await expect(page.getByLabel("Markdown editor")).toBeVisible();
  await expect(page.locator("#preview")).toBeVisible();
  await expect(page.locator("#document-panel")).toBeVisible();
  await expect(page.locator("#document-panel")).toHaveJSProperty("tagName", "ASIDE");
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator("html")).toHaveAttribute("data-jtype-layout", "regular");
  await expect(page.getByTitle("Split")).toBeVisible();
});

test("edits and saves the current markdown file", async ({ page }) => {
  await openFile(page);
  await expect(page.locator("#workspace-sidebar")).toBeHidden();
  await expect(page.locator("#sync-panel-button")).toBeHidden();
  await expect(page.locator("#app-context-title")).toHaveText("Markdown file");
  await page.getByLabel("Markdown editor").fill("# Intro\n\nUpdated content.");

  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("button", { name: "No unsaved changes" })).toBeDisabled();
  await expect(page.locator("#operation-log")).toContainText("Saved intro.md.");
  const savedContent = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(savedContent).toBe("# Intro\n\nUpdated content.");
});

test("exports Markdown from the editor toolbar", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "Markdown", exact: true }).click();
  await expect(page.locator("#operation-log")).toContainText("Exported Markdown to C:/workspace/intro.md.");
});

test("keeps desktop PDF export on the save-file adapter", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();

  await expect.poll(async () => page.evaluate(() => {
    const args = window.__LAST_BINARY_WRITE_ARGS__ as { path?: string; content?: number[] } | undefined;
    return args ? {
      path: args.path,
      signature: args.content?.slice(0, 4),
      hasPdfBody: (args.content?.length ?? 0) > 500,
    } : null;
  }), { timeout: 10_000 }).toEqual({
    path: "C:/workspace/intro.pdf",
    signature: [37, 80, 68, 70],
    hasPdfBody: true,
  });
  await expect(page.locator("#operation-log")).toContainText("Exported PDF to C:/workspace/intro.pdf.");
});

test("shares the current Markdown buffer through the mobile system adapter", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();

  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "intro.md", exact: true }).click();
  await page.getByLabel("Markdown editor").fill("# Unsaved mobile share\n\nCurrent editor content.");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "Markdown", exact: true }).click();

  await expect.poll(() => page.evaluate(() => window.__LAST_SHARE_ARGS__)).toEqual({
    fileName: "intro.md",
    content: "# Unsaved mobile share\n\nCurrent editor content.",
  });
  await expect(page.locator("#operation-log")).toContainText("Opened system sharing for intro.md.");
});

test("shares a PDF rendered from the current mobile editor buffer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();

  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.locator("#mobile-navigation-button").click();
  await page.locator("#mobile-vault-navigation").getByRole("button", { name: "intro.md", exact: true }).click();
  await page.getByLabel("Markdown editor").fill("# Unsaved mobile PDF\n\nCurrent editor content.");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();

  await expect.poll(async () => page.evaluate(() => {
    const args = window.__LAST_SHARE_PDF_ARGS__ as { fileName?: string; content?: number[] } | undefined;
    return args ? {
      fileName: args.fileName,
      signature: args.content?.slice(0, 4),
      hasPdfBody: (args.content?.length ?? 0) > 500,
    } : null;
  }), { timeout: 10_000 }).toEqual({
    fileName: "intro.pdf",
    signature: [37, 80, 68, 70],
    hasPdfBody: true,
  });
  await expect(page.locator("#operation-log")).toContainText("Opened system sharing for intro.pdf.");
});

test("connects in browser and syncs a vault to the web service", async ({ page }) => {
  await openWorkspace(page);
  await openProfileSettings(page);

  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  expect(await page.evaluate(() => window.__OAUTH_START_BODY__?.returnUrl)).toBeUndefined();

  await page.locator("#account-sync").click();
  await expect(page.locator("#operation-log")).toContainText("Synced");
  await expect(page.locator("#account-site-link")).toHaveAttribute("href", "http://localhost:8080/u/jack/workspace");

  const requestCount = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  expect(requestCount).toBeGreaterThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => window.__SYNC_CLIENT_TYPES__.at(-1))).toBe("desktop");
  const bindings = await page.evaluate(() => window.__VAULT_BINDINGS__);
  expect(bindings).toEqual([
    {
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      workspaceRole: "owner",
      localVaultPath: "C:/workspace",
      lastPulledClock: 0,
    },
  ]);
});

test("returns mobile browser authorization through the registered deep link", async ({ page }) => {
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__OAUTH_POLL_PENDING__ = true;
  });
  await page.reload();
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.getByRole("button", { name: "Local vault mode" }).click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();

  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.getByText(/Waiting for browser authorization/)).toBeVisible();
  expect(await page.evaluate(() => window.__OAUTH_START_BODY__)).toMatchObject({
    deviceId: "dev_e2e",
    returnUrl: "jtype://oauth/complete",
  });
  const openedUrl = await page.evaluate(() => window.__LAST_OPEN_URL__ ?? "");
  expect(new URL(openedUrl).searchParams.get("return_to")).toBe("jtype://oauth/complete");
  expect(openedUrl).not.toContain("device-e2e");
  expect(openedUrl).not.toContain("test-token");

  await expect.poll(() => page.evaluate(() =>
    window.__EMIT_TAURI_EVENT__("deep-link://new-url", ["jtype://oauth/not-complete"]),
  )).toBeGreaterThan(0);
  await expect(page.getByText(/Waiting for browser authorization/)).toBeVisible();

  const callbackListeners = await page.evaluate(() => {
    window.__OAUTH_POLL_PENDING__ = false;
    return window.__EMIT_TAURI_EVENT__("deep-link://new-url", ["jtype://oauth/complete"]);
  });
  expect(callbackListeners).toBeGreaterThan(0);
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
});

test("restores encrypted mobile browser authorization after a cold reload", async ({ page }) => {
  await page.addInitScript(() => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: true,
      usesAppPrivateVault: true,
    };
    window.__OAUTH_POLL_PENDING__ = true;
  });
  await page.reload();
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.getByRole("button", { name: "Local vault mode" }).click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.getByText(/Waiting for browser authorization/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const encoded = window.sessionStorage.getItem("jtype-e2e-pending-oauth");
    if (!encoded) return null;
    const pending = JSON.parse(encoded) as { deviceCode: string; deviceId: string; serviceUrl: string };
    return {
      deviceCode: pending.deviceCode,
      deviceId: pending.deviceId,
      serviceUrl: pending.serviceUrl,
    };
  })).toEqual({
    deviceCode: "device-e2e",
    deviceId: "dev_e2e",
    serviceUrl: "http://localhost:13345",
  });

  // A full WebView reload models process/UI loss while the native secure-store
  // record survives. No new device code should be requested.
  await page.reload();
  await expect(page.locator("#operation-log")).toContainText("Resumed browser authorization", { timeout: 5000 });
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.getByRole("button", { name: "Local vault mode" }).click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByText(/Waiting for browser authorization/)).toBeVisible();
  await expect(page.getByText("123456", { exact: true })).toBeVisible();

  const callbackListeners = await page.evaluate(() => {
    window.__OAUTH_POLL_PENDING__ = false;
    return window.__EMIT_TAURI_EVENT__("deep-link://new-url", ["jtype://oauth/complete"]);
  });
  expect(callbackListeners).toBeGreaterThan(0);
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("jtype-e2e-pending-oauth"))).toBeNull();
});

test("identifies shared cloud sync and websocket traffic as mobile", async ({ page }) => {
  const defaultVaultPath = "C:/Users/Jack/Documents/.jtype";
  await page.addInitScript((vaultPath) => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__CLOUD_PROFILE__ = {
      serverUrl: "http://localhost:13345",
      username: "jack",
      siteUrl: "http://localhost:8080/u/jack/workspace",
      token: "test-token",
      deviceId: "mobile-e2e-device",
    };
    window.__VAULT_BINDINGS__ = [{
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      workspaceRole: "owner",
      localVaultPath: vaultPath,
      lastPulledClock: 0,
    }];
    window.__VAULT_SETTINGS__[vaultPath] = {
      cloudSyncEnabled: true,
      syncPromptDismissedAt: new Date().toISOString(),
      syncDisabledPermanently: false,
    };
  }, defaultVaultPath);
  await page.reload();

  await page.locator("#welcome-default-vault").click();
  await expect.poll(() => page.evaluate(() => window.__START_LISTENER_ARGS__?.clientType)).toBe("mobile");

  await openProfileSettings(page);
  await page.locator("#account-sync").click();
  await expect(page.locator("#operation-log")).toContainText("Synced");
  await expect.poll(() => page.evaluate(() => window.__SYNC_CLIENT_TYPES__.at(-1))).toBe("mobile");
});

test("coalesces mobile network and foreground recovery while restarting its websocket", async ({ page }) => {
  const defaultVaultPath = "C:/Users/Jack/Documents/.jtype";
  await page.addInitScript((vaultPath) => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__CLOUD_PROFILE__ = {
      serverUrl: "http://localhost:13345",
      username: "jack",
      siteUrl: "http://localhost:8080/u/jack/workspace",
      token: "test-token",
      deviceId: "mobile-recovery-device",
    };
    window.__VAULT_BINDINGS__ = [{
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      workspaceRole: "owner",
      localVaultPath: vaultPath,
      lastPulledClock: 0,
    }];
    window.__VAULT_SETTINGS__[vaultPath] = {
      cloudSyncEnabled: true,
      syncPromptDismissedAt: new Date().toISOString(),
      syncDisabledPermanently: false,
    };
  }, defaultVaultPath);
  await page.reload();
  await page.locator("#welcome-default-vault").click();
  await expect.poll(() => page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBeGreaterThan(0);

  const initialListenerStarts = await page.evaluate(() => window.__START_LISTENER_CALLS__.length);
  const initialSyncs = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBeGreaterThan(initialListenerStarts);
  await expect.poll(() => page.evaluate(() => window.__SYNC_REQUESTS__.length)).toBeGreaterThan(initialSyncs);
  await expect(page.locator("#operation-log")).toContainText("Synced");

  const afterOnlineStarts = await page.evaluate(() => window.__START_LISTENER_CALLS__.length);
  const afterOnlineSyncs = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  const stopsBeforeBackground = await page.evaluate(() => window.__STOP_LISTENER_CALLS__);
  const backgroundListenerCount = await page.evaluate(() => window.__EMIT_TAURI_EVENT__("app:lifecycle", "background"));
  expect(backgroundListenerCount).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__STOP_LISTENER_CALLS__)).toBeGreaterThan(stopsBeforeBackground);

  expect(await page.evaluate(() => window.__EMIT_TAURI_EVENT__("app:lifecycle", "active"))).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBeGreaterThan(afterOnlineStarts);
  await expect.poll(() => page.evaluate(() => window.__SYNC_REQUESTS__.length)).toBeGreaterThan(afterOnlineSyncs);

  const afterResumeStarts = await page.evaluate(() => window.__START_LISTENER_CALLS__.length);
  const afterResumeSyncs = await page.evaluate(() => window.__SYNC_REQUESTS__.length);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBe(afterResumeStarts);
  expect(await page.evaluate(() => window.__SYNC_REQUESTS__.length)).toBe(afterResumeSyncs);
});

test("keeps desktop websocket lifecycle unchanged by page visibility and online events", async ({ page }) => {
  await page.addInitScript(() => {
    window.__CLOUD_PROFILE__ = {
      serverUrl: "http://localhost:13345",
      username: "jack",
      siteUrl: "http://localhost:8080/u/jack/workspace",
      token: "test-token",
      deviceId: "desktop-recovery-control",
    };
    window.__VAULT_BINDINGS__ = [{
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      workspaceRole: "owner",
      localVaultPath: "C:/workspace",
      lastPulledClock: 0,
    }];
  });
  await page.reload();
  await openWorkspace(page);
  await expect.poll(() => page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBeGreaterThan(0);
  await page.waitForTimeout(100);

  const listenerStarts = await page.evaluate(() => window.__START_LISTENER_CALLS__.length);
  const listenerStops = await page.evaluate(() => window.__STOP_LISTENER_CALLS__);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(100);

  expect(await page.evaluate(() => window.__START_LISTENER_CALLS__.length)).toBe(listenerStarts);
  expect(await page.evaluate(() => window.__STOP_LISTENER_CALLS__)).toBe(listenerStops);
});

test("keeps an initial sync failure visible after binding", async ({ page }) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    window.__SYNC_PUSH_ERROR__ = "initial sync failed";
  });
  await openProfileSettings(page);

  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.locator("#account-sync").click();

  await expect(page.locator("#operation-log")).toContainText("initial sync failed");
  await expect(page.locator("#operation-log")).not.toContainText('Synced "workspace"');
});

test("shows sync prompt for an unconfigured vault and can keep it local", async ({ page }) => {
  await page.addInitScript(() => {
    window.__VAULT_SETTINGS__ = {};
  });
  await page.goto("/");

  await openWorkspace(page);
  await expect(page.getByRole("heading", { name: 'Sync "workspace" to cloud?' })).toBeVisible();
  await page.getByRole("button", { name: "Local only" }).click();

  await expect(page.locator("#operation-log")).toContainText("local-only");
  const settings = await page.evaluate(() => window.__VAULT_SETTINGS__["C:/workspace"]);
  expect(settings).toEqual({
    cloudSyncEnabled: false,
    syncPromptDismissedAt: null,
    syncDisabledPermanently: true,
  });
});

test("disconnects a bound cloud workspace and keeps the vault local", async ({ page }) => {
  await page.addInitScript(() => {
    window.__VAULT_BINDINGS__ = [
      {
        workspaceId: "workspace-e2e",
        workspaceName: "workspace",
        workspaceSlug: "workspace",
        localVaultPath: "C:/workspace",
        lastPulledClock: 7,
      },
    ];
    window.__SYNC_BASES__ = {
      "intro.md": "# Intro\n\nHello from workspace.",
    };
  });
  await page.goto("/");

  await openWorkspace(page);
  await openProfileSettings(page);
  await page.getByRole("button", { name: "General" }).click();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("heading", { name: "Disconnect workspace" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.locator("#operation-log")).toContainText("Disconnected cloud sync");
  const result = await page.evaluate(() => ({
    bindings: window.__VAULT_BINDINGS__,
    bases: window.__SYNC_BASES__,
    settings: window.__VAULT_SETTINGS__["C:/workspace"],
  }));
  expect(result.bindings).toEqual([]);
  expect(result.bases).toEqual({});
  expect(result.settings.cloudSyncEnabled).toBe(false);
});

test("uses command palette to run save", async ({ page }) => {
  await openFile(page);
  await page.getByLabel("Markdown editor").fill("# Intro\n\nSaved from command palette.");

  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("save");
  await page.locator("#command-results").getByRole("button", { name: /Save current file/ }).click();

  await expect(page.getByRole("button", { name: "No unsaved changes" })).toBeDisabled();
  await expect(page.locator("#operation-log")).toContainText("Saved intro.md.");
  const savedContent = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(savedContent).toBe("# Intro\n\nSaved from command palette.");
});

test("uses quick switcher to open a workspace document", async ({ page }) => {
  await openWorkspace(page);

  await page.locator("#vault-home").getByRole("button", { name: "Quick open" }).click();
  await page.getByLabel("Open or create Document").fill("setup");
  await page.locator("#quick-results").getByRole("button", { name: /setup\.md/ }).click();

  await expect(page.getByLabel("Markdown editor")).toHaveValue("# Setup\n\nInstall and run.");
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
  await page.getByRole("button", { name: "Add to favorites" }).click();

  await expect(page.locator("#favorite-list")).toContainText("intro.md");
  await expect(page.locator("#publish-panel").getByText("Publish", { exact: true })).toBeVisible();
  await expect(page.locator("#publish-panel")).toContainText("Not published");
});

test("moves the current document to trash", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();

  await page.getByRole("button", { name: "Move to trash" }).click();
  await expect(page.getByRole("heading", { name: "Move to trash" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.locator("#vault-home")).toBeVisible();
  await expect(page.locator("#operation-log")).toContainText("Moved to trash.");
  await expect(page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ })).toHaveCount(0);
  await expect(page.locator("#workspace-sidebar")).toContainText("Trash");
  await expect(page.locator("#workspace-sidebar")).toContainText("intro.md");

  await page.locator("#workspace-sidebar").getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("#operation-log")).toContainText("Restored from trash.");
  await expect(page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ })).toBeVisible();
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
  await openProfileSettings(page);
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

  await openProfileSettings(page);
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

test("pushes local deletions to cloud workspace trash", async ({ page }) => {
  await page.addInitScript(() => {
    const pushRequests: Array<{ deletedPaths?: Array<{ relativePath: string }> }> = [];
    const origFetch = window.fetch;
    window.__SYNC_BASES__ = {
      "intro.md": "# Intro\n\nHello from workspace.",
      "guides/setup.md": "# Setup\n\nInstall and run.",
    };
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/sync/pull")) {
        const { sinceClock = 0 } = JSON.parse(String(init?.body)) as { sinceClock?: number };
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            documents: sinceClock < 5
              ? [
                  {
                    relativePath: "intro.md",
                    title: "Intro",
                    status: "published",
                    content: "# Intro\n\nCloud should not resurrect this.",
                    contentHash: "cloud-intro",
                    versionId: "cloud-v1",
                    updatedClock: 5,
                  },
                ]
              : [],
            deletedPaths: [],
            conflicts: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/sync/push")) {
        const request = JSON.parse(String(init?.body)) as {
          deletedPaths?: Array<{ relativePath: string }>;
        };
        pushRequests.push(request);
        const deletedPaths = request.deletedPaths?.some(({ relativePath }) => relativePath === "intro.md")
          ? [{ relativePath: "intro.md", deletedClock: 7 }]
          : [];
        return new Response(
          JSON.stringify({
            workspaceId: "workspace-e2e",
            accepted: 2,
            documents: [],
            deletedPaths,
            conflicts: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
    Object.defineProperty(window, "__PUSH_REQUESTS__", { get: () => pushRequests, configurable: true });
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
  await openProfileSettings(page);
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.getByRole("button", { name: "Close account dialog" }).click();
  await page.waitForFunction(() =>
    window.__VAULT_BINDINGS__.some(
      (binding) => (binding as { lastPulledClock?: number }).lastPulledClock === 5,
    ),
  );

  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await expect(page.getByRole("heading", { name: "Move to trash" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  await page.waitForFunction(() =>
    (
      window as unknown as {
        __PUSH_REQUESTS__: Array<{ deletedPaths?: Array<{ relativePath: string }> }>;
      }
    ).__PUSH_REQUESTS__.some((request) =>
      request.deletedPaths?.some(({ relativePath }) => relativePath === "intro.md"),
    ),
  );
  const pushRequests = await page.evaluate(
    () =>
      (window as unknown as {
        __PUSH_REQUESTS__: Array<{ deletedPaths?: Array<{ relativePath: string }> }>;
      }).__PUSH_REQUESTS__,
  );
  expect(
    pushRequests.some((request) =>
      request.deletedPaths?.some(({ relativePath }) => relativePath === "intro.md"),
    ),
  ).toBe(true);
  await page.waitForFunction(() => window.__SYNC_BASES__["intro.md"] === undefined);
  const bases = await page.evaluate(() => window.__SYNC_BASES__);
  expect(bases["intro.md"]).toBeUndefined();
  const resurrected = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(resurrected).toBeUndefined();
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
  await openProfileSettings(page);
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });
  await page.locator("#account-sync").click();

  await page.getByRole("button", { name: "Close account dialog" }).click();
  await page.getByRole("button", { name: /1 conflict/ }).click();
  await page.getByRole("button", { name: "intro.md", exact: true }).click();
  await expect(page.getByText("Local (yours)")).toBeVisible();
  await page.getByRole("button", { name: "Accept cloud" }).click();

  await expect(page.locator("#operation-log")).toContainText("Resolved conflict in intro.md");
  const resolved = await page.evaluate(() => (window as unknown as { __CONFLICT_RESOLVED__: boolean }).__CONFLICT_RESOLVED__);
  expect(resolved).toBe(true);
  const content = await page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]);
  expect(content).toBe("# Intro\n\nCloud version.");
});

test("compares and resolves sync conflicts in the shared compact mobile UI", async ({ page }) => {
  const defaultVaultPath = "C:/Users/Jack/Documents/.jtype";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((vaultPath) => {
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "android",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: false,
      usesAppPrivateVault: true,
    };
    window.__CLOUD_PROFILE__ = {
      serverUrl: "http://localhost:13345",
      username: "jack",
      siteUrl: "http://localhost:8080/u/jack/workspace",
      token: "test-token",
      deviceId: "mobile-conflict-device",
    };
    window.__VAULT_BINDINGS__ = [{
      workspaceId: "workspace-e2e",
      workspaceName: "workspace",
      workspaceSlug: "workspace",
      workspaceRole: "owner",
      localVaultPath: vaultPath,
      lastPulledClock: 0,
    }];
    window.__VAULT_SETTINGS__[vaultPath] = {
      cloudSyncEnabled: true,
      syncPromptDismissedAt: new Date().toISOString(),
      syncDisabledPermanently: false,
    };

    const origFetch = window.fetch;
    let resolutionBody: Record<string, unknown> | null = null;
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
            conflicts: [{
              conflictId: "mobile-conflict-1",
              relativePath: "intro.md",
              localContent: "# Intro\n\nLocal mobile version.",
              cloudContent: "# Intro\n\nCloud mobile version.",
              baseContent: "# Intro\n\nOriginal.",
            }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/conflicts/mobile-conflict-1/resolve")) {
        resolutionBody = JSON.parse(String(init?.body ?? "{}"));
        return new Response(
          JSON.stringify({
            relativePath: "intro.md",
            title: "Intro",
            status: "published",
            content: "# Intro\n\nMerged on mobile.",
            contentHash: "mobile-resolved",
            versionId: "mobile-v3",
            updatedClock: 10,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    };
    Object.defineProperty(window, "__CONFLICT_RESOLUTION__", {
      get: () => resolutionBody,
      configurable: true,
    });
  }, defaultVaultPath);
  await page.reload();

  await page.locator("#welcome-default-vault").click();
  await openProfileSettings(page);
  await page.locator("#account-sync").click();
  await page.getByRole("button", { name: "Close account dialog" }).click();
  await page.getByRole("button", { name: /1 conflict/ }).click();

  await expect(page.locator("#conflict-dialog")).toHaveAttribute("data-compact", "true");
  await page.getByRole("button", { name: /intro\.md/ }).click();
  await expect(page.getByText("Local mobile version.")).toBeVisible();
  await expect(page.getByText("Cloud mobile version.")).toBeHidden();

  const cloudTab = page.getByRole("tab", { name: "Cloud (remote)" });
  await cloudTab.click();
  await expect(page.getByText("Cloud mobile version.")).toBeVisible();
  await page.getByRole("button", { name: "Use this" }).click();

  const mergedResult = page.getByLabel("Result (editable)");
  await expect(mergedResult).toHaveValue("# Intro\n\nCloud mobile version.");
  await mergedResult.fill("# Intro\n\nMerged on mobile.");

  for (const locator of [cloudTab, page.getByRole("button", { name: "Accept local" }), page.getByRole("button", { name: "Accept cloud" }), page.getByRole("button", { name: "Save merged result" })]) {
    const box = await locator.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Save merged result" }).click();
  await expect(page.locator("#operation-log")).toContainText("Resolved conflict in intro.md");
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { __CONFLICT_RESOLUTION__: Record<string, unknown> | null }).__CONFLICT_RESOLUTION__,
  )).toEqual({ resolution: "manual_merge", content: "# Intro\n\nMerged on mobile." });
  await expect.poll(() => page.evaluate(() => window.__E2E_FS__["C:/workspace/intro.md"]))
    .toBe("# Intro\n\nMerged on mobile.");
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
  await openProfileSettings(page);
  await page.getByRole("button", { name: "Connect in browser" }).click();
  await expect(page.locator("#operation-log")).toContainText("Connected as jack", { timeout: 5000 });

  await page.getByRole("button", { name: "General" }).click();
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

test("creates a draft via Cmd+N from the welcome screen", async ({ page }) => {
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await createDraft(page);
  // Draft renders the editor with an "Untitled" title instead of the welcome screen.
  await expect(page.locator("#app-context-title")).toHaveText("Untitled");
  await expect(page.getByLabel("Markdown editor")).toBeVisible();
  // No vault is open, so the sidebar stays hidden in draft mode.
  await expect(page.locator("#workspace-sidebar")).toBeHidden();
});

test("draft inside a vault shows the sidebar", async ({ page }) => {
  await openWorkspace(page);
  await createDraft(page);
  // Draft editor renders…
  await expect(page.locator("#app-context-title")).toHaveText("Untitled");
  // …and the vault sidebar stays visible so the user can browse notes.
  await expect(page.locator("#workspace-sidebar")).toBeVisible();
});

test("draft is dirty after editing and can be discarded", async ({ page }) => {
  await createDraft(page);
  await page.getByLabel("Markdown editor").fill("# Hello draft");
  // Header shows the "Unsaved" status chip while the draft has content.
  await expect(page.locator("header").getByText("Unsaved")).toBeVisible();
  // Discard via the header close button. The confirm dialog is a React
  // Headless-UI Dialog (not a native window.confirm), so click its OK button.
  await page.getByRole("button", { name: "Discard draft" }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  // After discarding we return to the welcome screen.
  await expect(page.locator("#welcome-screen")).toBeVisible();
});

test("recovers one unsaved mobile draft after a cold reload and clears it on discard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      configurable: true,
    });
    window.__RUNTIME_CAPABILITIES__ = {
      platform: "ios",
      clientType: "mobile",
      isMobile: true,
      isTouchPrimary: true,
      prefersCompactLayout: true,
      supportsWindowDrag: false,
      supportsUpdater: false,
      supportsProcessRestart: false,
      supportsCliInstall: false,
      supportsFileDrop: false,
      supportsExternalVault: true,
      usesAppPrivateVault: true,
    };
  });
  await page.reload();
  await page.locator("#welcome-default-vault").click();
  await page.getByRole("button", { name: "Local only" }).click();
  await page.locator("header").getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Markdown editor").fill("# Recovered mobile draft\n\nStill here after a process restart.");

  await expect.poll(() => page.evaluate(() => {
    const encoded = window.sessionStorage.getItem("jtype-e2e-mobile-draft");
    if (!encoded) return null;
    const draft = JSON.parse(encoded) as { content: string; workspacePath: string | null; version: number };
    return {
      content: draft.content,
      hasWorkspace: Boolean(draft.workspacePath),
      version: draft.version,
    };
  })).toEqual({
    content: "# Recovered mobile draft\n\nStill here after a process restart.",
    hasWorkspace: true,
    version: 1,
  });

  // Removing all text clears the older native snapshot, so a cold launch can
  // never resurrect content the user deliberately deleted.
  await page.getByLabel("Markdown editor").fill("");
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("jtype-e2e-mobile-draft"))).toBeNull();
  await page.getByLabel("Markdown editor").fill("# Recovered mobile draft\n\nStill here after a process restart.");
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("jtype-e2e-mobile-draft"))).not.toBeNull();

  // The native app-private record survives WebView/process loss. It restores
  // through the same shared draft/editor state and never creates a fake path.
  await page.reload();
  await expect(page.getByLabel("Markdown editor")).toHaveValue(
    "# Recovered mobile draft\n\nStill here after a process restart.",
  );
  await expect(page.locator("#operation-log")).toContainText("Recovered an unsaved mobile draft");
  await expect(page.locator("#app-context-title")).toHaveText("Untitled");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("jtype.lastFilePath") ?? '""'))).toBe("");

  await page.getByRole("button", { name: "Discard draft" }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.locator("#vault-home")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("jtype-e2e-mobile-draft"))).toBeNull();
});

test("saves a draft to the vault via the name dialog", async ({ page }) => {
  await openWorkspace(page);
  await createDraft(page);
  await page.getByLabel("Markdown editor").fill("# Draft content");
  // Trigger the "save as" flow — the save button routes drafts to the dialog.
  await page.getByRole("button", { name: "Save as…" }).click();
  // The dialog skips the kind picker and goes straight to naming.
  await expect(page.getByText("Save draft as…")).toBeVisible();
  await page.getByPlaceholder("Document name").fill("Saved Draft");
  await page.getByRole("button", { name: "Create" }).click();

  // The draft is promoted to a real file inside the vault.
  await expect(page.locator("#operation-log")).toContainText("Saved");
  const saved = await page.evaluate(() => window.__E2E_FS__["C:/workspace/Saved Draft.md"]);
  expect(saved).toBe("# Draft content");
});

test("saves a draft via OS dialog when no workspace is open", async ({ page }) => {
  await createDraft(page);
  await page.getByLabel("Markdown editor").fill("# Standalone draft");
  await page.getByRole("button", { name: "Save as…" }).click();
  // plugin:dialog|save mock returns C:/workspace/Untitled.md.
  await expect(page.locator("#operation-log")).toContainText("Saved");
  const saved = await page.evaluate(() => window.__E2E_FS__);
  expect(Object.values(saved)).toContain("# Standalone draft");
});

test("second Cmd+N focuses the existing draft instead of replacing it", async ({ page }) => {
  await createDraft(page);
  await page.getByLabel("Markdown editor").fill("keep this content");
  // Trigger the draft command again while a draft is already open.
  await createDraft(page);
  // Single-draft semantics: the existing content is preserved.
  await expect(page.getByLabel("Markdown editor")).toHaveValue("keep this content");
});

test("Cmd+/- zooms the markdown editor and resets with Cmd+0", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  const editor = page.getByLabel("Markdown editor");
  await expect(editor).toBeVisible();
  const before = await editor.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  await page.keyboard.press("Control+Equal"); // Cmd/Ctrl + = (zoom in)
  const after = await editor.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(after).toBeGreaterThan(before);

  await page.keyboard.press("Control+0"); // reset
  const reset = await editor.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(reset).toBeCloseTo(before, 0);
});

test("zoom indicator appears and its buttons change the level", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  // Zooming reveals the transient indicator.
  await page.keyboard.press("Control+Equal");
  const indicator = page.locator("#zoom-indicator");
  await expect(indicator).toBeVisible();
  // The percentage readout reflects the new level (110%).
  await expect(indicator).toContainText("110%");

  // Hover to pin it (otherwise it auto-hides), then click zoom-in again.
  await indicator.hover();
  await indicator.getByRole("button", { name: "Zoom in" }).click();
  await expect(indicator).toContainText("120%");

  // The percentage button resets to 100%.
  await indicator.getByRole("button", { name: "Reset zoom" }).first().click();
  await expect(indicator).toContainText("100%");
});

test("Cmd+F opens the find bar and highlights matches in preview", async ({ page }) => {
  await openWorkspace(page);
  await page.locator("#workspace-sidebar").getByRole("button", { name: /intro\.md/ }).click();
  // Switch to preview mode via the command palette. Control+R (the shortcut)
  // is intercepted by Chromium as page reload in the test browser, so we drive
  // the same command through the palette.
  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("preview");
  await page.locator("#command-results").getByRole("button", { name: /Toggle preview/ }).click();
  await expect(page.locator("#preview")).toContainText("Intro");

  // Chromium intercepts Ctrl+F as its own find UI, so drive the find bar via
  // the command palette instead. The Cmd+F shortcut itself is exercised in the
  // Tauri desktop shell (which doesn't ship a native find bar).
  await page.keyboard.press("Control+Shift+P");
  await page.getByLabel("Search commands").fill("find");
  await page.locator("#command-results").getByRole("button", { name: /Find in document/ }).click();
  await expect(page.locator("#find-bar")).toBeVisible();
  await page.locator("#find-input").fill("Intro");
  // At least one highlight mark should appear inside the preview.
  await expect(page.locator("#preview mark.find-highlight").first()).toBeVisible();
});
