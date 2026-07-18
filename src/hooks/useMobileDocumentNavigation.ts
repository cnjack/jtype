import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isDiagramTextPath } from "@shared/lib/fileTypes";
import { useAppDispatch, useAppState } from "../app/AppState";
import { useRuntimeCapabilities } from "../app/RuntimeCapabilities";
import {
  mobileDocumentRouteFromNotification,
  isMobileNotificationTap,
  parseMobileDocumentRouteUrl,
  parseMobileNotificationPreviewUrl,
  type MobileDocumentRoute,
} from "../lib/mobileNavigation";
import {
  mobileCollaborationPreviewDelayMs,
  consumeLatestMobileCollaborationRoute,
  showMobileCollaborationNotification,
} from "../lib/mobileNotifications";
import { workspaceIndexFor } from "../lib/workspaceIndex";
import { isTauriRuntime } from "../lib/utils";
import type { FileTreeNode, WorkspaceSnapshot } from "../lib/types";
import { workspaceSnapshotIsPartial } from "../lib/workspacePagination";
import { resolveWorkspaceEntry } from "../lib/workspaceResolver";

type MobileDocumentNavigationOperations = {
  ready: boolean;
  openWorkspace: (path: string) => Promise<WorkspaceSnapshot | null>;
  openMarkdownFile: (path: string, relativePath?: string) => Promise<void>;
  openDiagramFile: (path: string, relativePath?: string) => Promise<void>;
  pullOnly: (options?: { full?: boolean; reason?: string }) => Promise<void>;
};

type PendingRoute = MobileDocumentRoute & {
  pulled: boolean;
  nativeResolved: boolean;
  resolvedNode: FileTreeNode | null;
};

/**
 * Mobile entry adapter for deep links and notification taps. It never owns a
 * second navigation stack: once the target binding is resolved, it calls the
 * same vault/document operations used by Desktop Sidebar and Quick Open.
 */
export function useMobileDocumentNavigation({
  ready,
  openWorkspace,
  openMarkdownFile,
  openDiagramFile,
  pullOnly,
}: MobileDocumentNavigationOperations): void {
  const capabilities = useRuntimeCapabilities();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState<PendingRoute | null>(null);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const operationInFlightRef = useRef(false);

  const queueRoute = (route: MobileDocumentRoute) => {
    setPending({ ...route, pulled: false, nativeResolved: false, resolvedNode: null });
  };

  useEffect(() => {
    if (!capabilities.isMobile || !isTauriRuntime()) return;

    let disposed = false;
    let unlistenDeepLink: (() => void) | null = null;
    let notificationListener: { unregister: () => Promise<void> } | null = null;

    const handleUrls = async (urls: string[] | null) => {
      for (const candidate of urls ?? []) {
        const route = parseMobileDocumentRouteUrl(candidate);
        if (route) {
          queueRoute(route);
          continue;
        }

        const preview = parseMobileNotificationPreviewUrl(candidate);
        if (!preview) continue;
        const debugEnabled = await invoke<boolean>("mobile_notification_debug_enabled").catch(() => false);
        if (!debugEnabled || disposed) continue;
        const shown = await showMobileCollaborationNotification(capabilities.platform, {
          ...preview,
          // Keep preview delivery off the first WebView paint on both mobile
          // platforms. The notification adapter owns iOS scheduler correction.
          delayMs: mobileCollaborationPreviewDelayMs(capabilities.platform),
        }).catch(() => false);
        if (!shown && !disposed) {
          dispatch({ type: "SET_STATUS", message: "Notification permission is required for this simulator check." });
        }
      }
    };

    void Promise.all([
      import("@tauri-apps/plugin-deep-link"),
      import("@tauri-apps/plugin-notification"),
    ]).then(async ([deepLink, notification]) => {
      unlistenDeepLink = await deepLink.onOpenUrl((urls) => { void handleUrls(urls); });
      notificationListener = await notification.onAction((payload) => {
        if (!isMobileNotificationTap(payload)) return;
        const route = mobileDocumentRouteFromNotification(payload)
          ?? consumeLatestMobileCollaborationRoute();
        if (route) queueRoute(route);
      });
      const current = await deepLink.getCurrent().catch(() => null);
      if (!disposed) await handleUrls(current);
      if (disposed) {
        unlistenDeepLink();
        unlistenDeepLink = null;
        await notificationListener.unregister();
        notificationListener = null;
      }
    }).catch(() => undefined);

    return () => {
      disposed = true;
      unlistenDeepLink?.();
      void notificationListener?.unregister();
    };
  }, [capabilities.isMobile, capabilities.platform, dispatch]);

  useEffect(() => {
    if (!capabilities.isMobile || !ready || !pending || operationInFlightRef.current) return;

    const binding = state.vaultBindings.find((item) => item.workspaceId === pending.workspaceId);
    if (!binding) {
      setPending(null);
      dispatch({
        type: "SET_STATUS",
        message: "This cloud workspace is not connected to a vault on this device.",
      });
      dispatch({ type: "SET_ACCOUNT_DIALOG", open: true, section: "workspace" });
      return;
    }

    if (state.workspace?.rootPath !== binding.localVaultPath) {
      operationInFlightRef.current = true;
      void openWorkspace(binding.localVaultPath)
        .then((workspace) => {
          if (!workspace) {
            setPending(null);
            dispatch({ type: "SET_STATUS", message: `Unable to open the vault connected to ${binding.workspaceName}.` });
          }
        })
        .finally(() => {
          operationInFlightRef.current = false;
          setNavigationRevision((value) => value + 1);
        });
      return;
    }

    const loadedNode = workspaceIndexFor(state.workspace.entries).allNodes.find(
      (item) => item.relativePath === pending.relativePath,
    );
    if (!loadedNode && workspaceSnapshotIsPartial(state.workspace) && !pending.nativeResolved) {
      operationInFlightRef.current = true;
      void resolveWorkspaceEntry(state.workspace, pending.relativePath)
        .then((resolvedNode) => {
          setPending((current) => current
            && current.workspaceId === pending.workspaceId
            && current.relativePath === pending.relativePath
            ? { ...current, nativeResolved: true, resolvedNode }
            : current);
        })
        .catch(() => {
          setPending((current) => current
            && current.workspaceId === pending.workspaceId
            && current.relativePath === pending.relativePath
            ? { ...current, nativeResolved: true, resolvedNode: null }
            : current);
        })
        .finally(() => {
          operationInFlightRef.current = false;
          setNavigationRevision((value) => value + 1);
        });
      return;
    }

    const node = loadedNode ?? pending.resolvedNode;
    if (!node && !pending.pulled && state.syncToken) {
      operationInFlightRef.current = true;
      setPending({ ...pending, pulled: true, nativeResolved: false, resolvedNode: null });
      void pullOnly({ full: true, reason: "mobile-document-route" })
        .catch(() => undefined)
        .finally(() => {
          operationInFlightRef.current = false;
          setNavigationRevision((value) => value + 1);
        });
      return;
    }

    if (!node) {
      setPending(null);
      dispatch({ type: "SET_STATUS", message: `${pending.relativePath} is not available in this vault.` });
      return;
    }

    setPending(null);
    if (node.kind === "markdown") {
      void openMarkdownFile(node.path, node.relativePath);
    } else if (node.kind === "diagram" || isDiagramTextPath(node.relativePath)) {
      void openDiagramFile(node.path, node.relativePath);
    } else if (node.kind === "board") {
      dispatch({ type: "SELECT_TREE_NODE", node });
      dispatch({ type: "SET_STATUS", message: `Opened ${node.relativePath}.` });
    } else {
      dispatch({ type: "SET_STATUS", message: `${node.relativePath} cannot be opened from a collaboration notification.` });
    }
  }, [
    capabilities.isMobile,
    dispatch,
    navigationRevision,
    openDiagramFile,
    openMarkdownFile,
    openWorkspace,
    pending,
    pullOnly,
    ready,
    state.syncToken,
    state.vaultBindings,
    state.workspace,
  ]);
}
