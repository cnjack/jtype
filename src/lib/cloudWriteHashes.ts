/**
 * Content Hash Gate — tracks cloud-originated file writes so the file watcher
 * can distinguish cloud pulls from genuine external edits.
 */

const hashMap = new Map<string, string>();

/** Record that a cloud pull wrote a file with this content hash. */
export function markCloudWrite(fullPath: string, contentHash: string): void {
  hashMap.set(fullPath, contentHash);
}

/** Get and remove the expected hash for a path (one-time read). */
export function consumeCloudWrite(fullPath: string): string | undefined {
  const hash = hashMap.get(fullPath);
  if (hash !== undefined) {
    hashMap.delete(fullPath);
  }
  return hash;
}

/** Batch version of markCloudWrite. */
export function markCloudWriteBatch(entries: Array<{ fullPath: string; contentHash: string }>): void {
  for (const { fullPath, contentHash } of entries) {
    hashMap.set(fullPath, contentHash);
  }
}

/** Clear all entries (for cleanup). */
export function clearAll(): void {
  hashMap.clear();
}
