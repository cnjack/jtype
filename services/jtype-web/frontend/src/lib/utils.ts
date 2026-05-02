export type EditorMode = "write" | "split" | "preview";

export function fuzzyMatch(value: string, query: string) {
  if (!query) return true;
  const normalized = value.toLowerCase();
  let cursor = 0;
  for (const character of query) {
    cursor = normalized.indexOf(character, cursor);
    if (cursor === -1) return false;
    cursor += 1;
  }
  return true;
}
