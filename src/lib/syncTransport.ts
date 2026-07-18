import { httpRequest } from "@shared/lib/http";
import type { SyncPushRequest } from "./types";

export const SYNC_PUSH_BATCH_SIZE = 50;
export const SYNC_PUSH_BATCH_MAX_BYTES = 1_000_000;
export const DEFAULT_SYNC_RETRY_DELAYS_MS = [350, 1_000] as const;

type SyncPushRequestInput = Omit<SyncPushRequest, "requestId">;

type RetryContext = {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  status?: number;
  error?: unknown;
};

type SyncRetryOptions = {
  delaysMs?: readonly number[];
  sleep?: (delayMs: number) => Promise<void>;
  onRetry?: (context: RetryContext) => void;
};

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get("Retry-After")?.trim();
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds * 1_000, 30_000));
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, Math.min(dateMs - Date.now(), 30_000));
}

export function isRetryableSyncStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Retry only transport failures and transient HTTP responses. The caller owns
 * the request body, so every attempt sends the same requestId and can be safely
 * replayed by a server that supports sync-push idempotency.
 */
export async function requestWithSyncRetry(
  request: () => Promise<Response>,
  options: SyncRetryOptions = {},
) {
  const delaysMs = options.delaysMs ?? DEFAULT_SYNC_RETRY_DELAYS_MS;
  const wait = options.sleep ?? sleep;
  const maxAttempts = delaysMs.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await request();
      if (!isRetryableSyncStatus(response.status) || attempt === maxAttempts) return response;
      const delayMs = retryAfterMs(response) ?? delaysMs[attempt - 1];
      options.onRetry?.({ attempt: attempt + 1, maxAttempts, delayMs, status: response.status });
      await wait(delayMs);
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delayMs = delaysMs[attempt - 1];
      options.onRetry?.({ attempt: attempt + 1, maxAttempts, delayMs, error });
      await wait(delayMs);
    }
  }

  throw new Error("Sync retry loop exhausted unexpectedly.");
}

export function createSyncRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Packs sync work in a stable order and bounded request size. Folder creates
 * precede documents; folder deletions and trash mutations remain at the tail.
 * This preserves the existing desktop semantics while avoiding one giant body.
 */
export function createSyncPushBatches(
  input: SyncPushRequestInput,
  syncRunId: string,
  batchSize = SYNC_PUSH_BATCH_SIZE,
  maxBatchBytes = SYNC_PUSH_BATCH_MAX_BYTES,
): SyncPushRequest[] {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Sync batch size must be a positive integer.");
  }
  if (!Number.isFinite(maxBatchBytes) || maxBatchBytes < 1) {
    throw new Error("Sync batch byte limit must be positive.");
  }

  const batches: Array<Omit<SyncPushRequest, "requestId" | "deviceId">> = [];
  let current: Omit<SyncPushRequest, "requestId" | "deviceId"> = {
    folders: [],
    documents: [],
    deletedPaths: [],
    deletedFolders: [],
    trashOperations: [],
  };
  let currentSize = 0;
  let currentBytes = 0;

  const flush = () => {
    if (currentSize === 0) return;
    batches.push(current);
    current = { folders: [], documents: [], deletedPaths: [], deletedFolders: [], trashOperations: [] };
    currentSize = 0;
    currentBytes = 0;
  };
  const append = <K extends keyof typeof current>(key: K, values: (typeof current)[K]) => {
    for (const value of values) {
      const valueBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
      if (currentSize === batchSize || (currentSize > 0 && currentBytes + valueBytes > maxBatchBytes)) flush();
      (current[key] as Array<typeof value>).push(value);
      currentSize += 1;
      currentBytes += valueBytes;
    }
  };

  append("folders", input.folders);
  append("documents", input.documents);
  append("deletedPaths", input.deletedPaths);
  append("deletedFolders", input.deletedFolders);
  append("trashOperations", input.trashOperations);
  flush();

  if (batches.length === 0) {
    batches.push(current);
  }

  return batches.map((batch, index) => ({
    requestId: `${syncRunId}:${String(index + 1).padStart(4, "0")}`,
    deviceId: input.deviceId,
    ...batch,
  }));
}

export function postSyncPush(url: string, headers: HeadersInit, body: SyncPushRequest) {
  return httpRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
