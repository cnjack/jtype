export type AICommandScope = "selection" | "document" | "folder" | "workspace";

export type FilePatch = {
  path: string;
  before: string;
  after: string;
};

export type AICommandProposal = {
  id: string;
  name: string;
  scope: AICommandScope;
  explanation: string;
  proposedChanges: FilePatch[];
};

export type DiffLine = {
  kind: "context" | "added" | "removed";
  content: string;
};

export function createLineDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  if (before === after) {
    return beforeLines.map((content) => ({ kind: "context", content }));
  }

  return [
    ...beforeLines.map((content) => ({ kind: "removed" as const, content })),
    ...afterLines.map((content) => ({ kind: "added" as const, content })),
  ];
}

export function proposalHasChanges(proposal: AICommandProposal): boolean {
  return proposal.proposedChanges.some((patch) => patch.before !== patch.after);
}
