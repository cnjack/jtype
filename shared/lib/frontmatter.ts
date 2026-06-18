import type { FrontmatterParse } from "./types";

export function parseFrontmatter(content: string): FrontmatterParse {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { data: {}, body: content, hasFrontmatter: false };
  }
  const normalized = content.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: content, hasFrontmatter: false };

  const yaml = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  const data: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const index = line.indexOf(":");
    if (index > 0) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      data[key] = value;
    }
  }
  return { data, body, hasFrontmatter: true };
}

/**
 * Number of source lines the frontmatter block (incl. the blank line after it)
 * occupies before the document body begins. The preview renders only the body,
 * so scroll-sync uses this to translate body-relative line numbers back to the
 * editor's full-content line numbers.
 */
export function frontmatterLineCount(content: string): number {
  const parsed = parseFrontmatter(content);
  if (!parsed.hasFrontmatter) return 0;
  const normalized = content.replace(/\r\n/g, "\n");
  // body is a suffix of the normalized content, so everything before it is the
  // frontmatter region (delimiters + keys + the trailing blank line).
  const before = normalized.slice(0, normalized.length - parsed.body.length);
  return (before.match(/\n/g) ?? []).length;
}

export function writeFrontmatter(content: string, nextData: Record<string, string>) {
  const parsed = parseFrontmatter(content);
  const merged = { ...parsed.data, ...nextData };
  const yaml = Object.entries(merged)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${parsed.body.trimStart()}`;
}

export function titleFromMarkdown(content: string, fallback: string) {
  const parsed = parseFrontmatter(content);
  if (parsed.data.title) return parsed.data.title;
  const match = parsed.body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}
