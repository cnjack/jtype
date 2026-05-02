export function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export function isMarkdownPath(path: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(path);
}

export function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

export function relativePathFromWorkspace(path: string, rootPath: string) {
  const root = normalizePath(rootPath);
  const normalized = normalizePath(path);
  if (!normalized.startsWith(root)) return "";
  return normalized.slice(root.length).replace(/^\/+/, "");
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

export function escapeHtml(value: string) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

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

export function truthy(value: string | undefined) {
  return ["true", "yes", "1", "published"].includes((value ?? "").toLowerCase());
}

export function isTauriRuntime() {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function flattenNodes(entries: import("./types").FileTreeNode[] = []): import("./types").FileTreeNode[] {
  const flattened: import("./types").FileTreeNode[] = [];
  for (const node of entries) {
    if (node.relativePath !== ".jtype") flattened.push(node);
    flattened.push(...flattenNodes(node.children));
  }
  return flattened;
}

export function markdownNodes(entries: import("./types").FileTreeNode[] = []) {
  return flattenNodes(entries).filter((node) => node.kind === "markdown");
}

export function iconForNode(node: import("./types").FileTreeNode) {
  if (node.kind === "folder") return ">";
  if (node.kind === "markdown") return "MD";
  return "*";
}

export function extractMarkdownLinks(content: string) {
  const links: Array<{ target: string; line: number }> = [];
  content.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      links.push({ target: match[1], line: index });
    }
    for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      links.push({ target: match[1], line: index });
    }
  });
  return links;
}

export function extractHeadings(content: string) {
  return content.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    return match ? [{ level: match[1].length, title: match[2].trim(), line: index }] : [];
  });
}
