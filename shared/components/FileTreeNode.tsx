import { ChevronRightIcon, DocumentTextIcon, FolderIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import type { FileTreeNodeData } from "../lib/types";

export interface FileTreeNodeProps {
  node: FileTreeNodeData;
  depth: number;
  activePath: string;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNodeData) => void;
}

export function FileTreeNode({
  node,
  depth,
  activePath,
  expandedPaths,
  onSelect,
  onToggle,
  onContextMenu,
}: FileTreeNodeProps) {
  const isActive = node.path === activePath;
  const isExpanded = expandedPaths.has(node.path);
  const paddingLeft = 8 + depth * 16;

  const handleClick = () => {
    if (node.isFolder) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`tree-button ${isActive ? "tree-button-active" : ""}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e, node);
        }}
      >
        {node.isFolder && (
          <ChevronRightIcon
            className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        )}
        {node.isFolder ? (
          isExpanded ? (
            <FolderOpenIcon className="h-4 w-4 shrink-0 text-brand" />
          ) : (
            <FolderIcon className="h-4 w-4 shrink-0 text-brand-gray" />
          )
        ) : (
          <DocumentTextIcon className="h-4 w-4 shrink-0 text-stone-400" />
        )}
        <span className="min-w-0 truncate">{node.name}</span>
        {node.isFavorite && (
          <StarSolid className="ml-auto h-3 w-3 shrink-0 text-amber-400" />
        )}
      </button>
      {node.isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </>
  );
}

export interface FileTreeProps {
  nodes: FileTreeNodeData[];
  activePath: string;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNodeData) => void;
}

export function FileTree({ nodes, activePath, expandedPaths, onSelect, onToggle, onContextMenu }: FileTreeProps) {
  return (
    <div className="py-1">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          expandedPaths={expandedPaths}
          onSelect={onSelect}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
