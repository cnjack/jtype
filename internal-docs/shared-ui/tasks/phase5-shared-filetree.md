# Phase 5: Shared File Tree Components

## Status: ⚠️ PARTIAL — Shared components complete; platform integration deferred

### QA Validation (2026-05-13)
All 14 component-level checks passed. Platform integration into Sidebar.tsx / Workspace.tsx deferred.
- `FileTreeNodeData` interface in `shared/lib/types.ts` with all 7 fields — correct
- `FileTreeNode` + `FileTree` components: all props, recursive rendering, Heroicons, no platform imports — correct
- `ContextMenu`: click-outside + Escape dismissal, correct CSS classes — correct
- Barrel exports in `shared/components/index.ts` — correct
- Desktop `Sidebar.tsx` integration: ❌ NOT DONE — still uses local types/rendering
- Web `Workspace.tsx` integration: ❌ NOT DONE — still uses local `WebTreeNode`

## Scope
Extract shared file tree and context menu components.

## Tasks

- [x] Define `FileTreeNodeData` interface in `shared/lib/types.ts`
  ```ts
  interface FileTreeNodeData {
    name: string
    path: string
    isFolder: boolean
    children?: FileTreeNodeData[]
    isExpanded?: boolean
    isFavorite?: boolean
    status?: string
  }
  ```
- [x] Create `shared/components/FileTreeNode.tsx`
  - Props: `node`, `depth`, `activePath`, `expandedPaths`, `onSelect`, `onToggle`, `onContextMenu`
  - Recursive rendering with indent; `FileTree` wrapper exported
  - Heroicons for folder/file/star icons
- [x] Create `shared/components/ContextMenu.tsx`
  - Props: `items`, `position`, `onClose`
  - Click-outside + Escape key dismissal
  - Uses `.context-menu` / `.context-menu-button` CSS
- [ ] Desktop adapter: Convert `FileTreeNode` (from types.ts) → `FileTreeNodeData`
- [ ] Web adapter: Convert REST API documents/folders → `FileTreeNodeData`
- [ ] Update Desktop `Sidebar.tsx` to use shared components
- [ ] Update Web sidebar to use shared components
- [ ] Verify both builds and interaction

## Data Adaptation Examples

### Desktop (Tauri)
```ts
function toTreeData(node: FileTreeNode): FileTreeNodeData {
  return {
    name: node.name,
    path: node.relativePath,
    isFolder: node.kind === 'folder',
    children: node.children?.map(toTreeData),
  }
}
```

### Web (REST API)
```ts
function toTreeData(doc: Document, folders: Folder[]): FileTreeNodeData {
  // Build tree from flat document list + folder list
}
```
