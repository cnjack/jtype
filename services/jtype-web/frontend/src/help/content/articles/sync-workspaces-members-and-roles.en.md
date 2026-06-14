A solo vault has no members — it's just you and your files. The moment you want to write alongside other people, you invite them into a **cloud workspace**, and roles decide who can do what. Everything you share lives inside that one workspace and nowhere else.

## Inviting members

From the web service, open your workspace and invite people by the account they sign in with. They join with a role you pick, and they can immediately bind the workspace to a vault on their own machine — see [Cloud workspaces & binding](/help/c/sync-workspaces/cloud-workspaces). Once they sync, your shared notes and boards show up in their vault.

You can list the people in a workspace anytime, including from an AI assistant via the `list_members` tool over MCP.

## The roles

JType uses a simple owner / admin / member model. Higher roles include everything the lower ones can do.

| Role | Notes & sync | Kanban | Invite & manage members | Workspace settings & billing |
|------|--------------|--------|-------------------------|------------------------------|
| **Owner** | Full | Full | Yes | Yes |
| **Admin** | Full | Full | Yes | Limited |
| **Member** | Read & write the notes they can access | Create & move cards | No | No |

- An **owner** is the workspace's ultimate authority — typically whoever created it — and the only role that controls billing and can hand off ownership.
- An **admin** runs the day-to-day: they invite teammates, manage members, and have full access to notes and boards.
- A **member** does the actual work: writing notes, syncing, and moving [cards on boards](/help/c/kanban/boards-and-cards). They don't manage other people or workspace settings.

> Read-only access matters for sync: a member without write access to a path can pull it but not push changes to it. The CLI tells these apart so you see "read-only" rather than a confusing failure.

## Sharing is scoped to the workspace

This is the key boundary: **sharing happens per workspace, never across your whole account.** Inviting someone to your "Team Docs" workspace gives them nothing in your "Personal" vault. If you keep private notes in a separate, unbound vault — or in a workspace with no other members — they stay yours alone.

This is why many people run more than one workspace: one private, one or two shared. Each has its own members, its own boards, and its own published site.

## A note on storage budget

Each workspace carries a **storage budget** — an allowance for the notes and attachments it holds. It's a property of the workspace, not of any one member, so the whole team draws from the same pool. If a workspace is getting full, an owner or admin can prune notes or look at the workspace's plan on the web. Day to day, plain Markdown is tiny, so most teams never think about it.

## AI and roles

When you connect an AI assistant, it acts within your role — it can read and write notes and move cards exactly where you can, and never more. Admin actions like inviting members are never available to an AI token. See [What AI can do](/help/c/ai-mcp/what-ai-can-do).
