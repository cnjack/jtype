export type EditorMode = "write" | "split" | "preview";

export interface FrontmatterParse {
  data: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
}

export interface FileTreeNodeData {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNodeData[];
  isExpanded?: boolean;
  isFavorite?: boolean;
  status?: string;
}
