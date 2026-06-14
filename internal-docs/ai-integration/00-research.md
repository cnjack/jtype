# Research: How notes & project-management tools integrate into AI agents (mid-2026)

> Input for the JType AI-integration initiative. Two domains — **files/notes**
> (Notion, Obsidian) and **project management / kanban** (Linear, Jira, GitHub
> Projects, open-source boards) — analyzed across three delivery modalities:
> **(A) online/hosted MCP server**, **(B) command-line tool / local MCP**, and
> **(C) verified Agent Skills**.

---

## 1. Files / Notes

### Notion

| Modality | What exists | Transport / Auth | Capabilities |
|---|---|---|---|
| **A. Hosted MCP** | Official `https://mcp.notion.com/mcp` | **Streamable HTTP** (SSE for compat); **OAuth 2.0 only** (no bearer; not for headless agents) | ~18 tools across 6 groups: `notion-search`, `notion-fetch`, `notion-create-pages`, `notion-update-page`, `notion-move-pages`, `notion-duplicate-page`, `notion-create-database`, `notion-update-data-source`, `notion-query-data-sources`, `notion-create/update-view`, `notion-create/get-comments`, `notion-get-teams/users/self`. Returns **Notion-flavored Markdown** for token density. |
| **B. CLI / local MCP** | Official self-host `@notionhq/notion-mcp-server`; `@notionhq/client` SDK | STDIO or Streamable HTTP; **integration token** via `NOTION_TOKEN` | ~22 tools (data-source query/create/update, page CRUD, block ops, comments, search). This is the headless/CI path. |
| **C. Skills** | Notion is an official **connector** in Claude's directory + `makenotion/claude-code-notion-plugin`; community packs `tommy-ca/notion-skills` | Skill = folder of `SKILL.md` + scripts that drive the connector/API | knowledge-capture, meeting-intelligence, research-documentation, spec-to-implementation |

### Obsidian

| Modality | What exists | Transport / Auth | Capabilities |
|---|---|---|---|
| **A. Hosted MCP** | **None official.** Community/self-hosted only. | — | — |
| **B. CLI / local MCP** | The mature path. All build on the **"Local REST API" plugin** (`127.0.0.1:27124`, bearer API key). Servers: plugin's built-in MCP (v4+, `/mcp/`, Streamable HTTP), `MarkusPfundstein/mcp-obsidian` (Python, stdio), `cyanheads/obsidian-mcp-server` (TS, stdio or HTTP) | Streamable HTTP / STDIO; **bearer API key** | list/read/write/append/**patch**/delete/move notes, frontmatter & tag management, full-text + JsonLogic search, periodic notes, command execute |
| **C. Skills** | No verified official skill. A "manage my vault" skill = `SKILL.md` of vault conventions (folder layout, frontmatter schema, tag taxonomy) that **calls an underlying Obsidian MCP/CLI** for the actual ops. |

### Common note-tool operation set (convergent)
`search` · `get/read` (returns **Markdown**, with raw/structured/section modes) · `list` · `create` · `update/write` · `append` · **`patch`** (surgical insert relative to heading/block/frontmatter — separates good servers from basic ones) · `delete` · metadata (frontmatter/tags) · schema/structure inspect · move/reparent · (optional) command execute.

**Convention:** STDIO for local; Streamable HTTP (SSE fallback) for remote. Local → **bearer/API key**; hosted multi-tenant → **OAuth 2.0** inheriting the user's existing permissions. Content returned as **Markdown** to minimize tokens.

---

## 2. Project Management / Kanban

> Note: "openclaw kanban" turned out to be agent-orchestration visualizers (ClawDeck etc.), not a PM product to integrate into — excluded.

### Hosted MCP servers (A)

| Tool | Endpoint | Transport / Auth | Representative tools |
|---|---|---|---|
| **Linear** | `https://mcp.linear.app/mcp` (SSE legacy) | Streamable HTTP; **OAuth 2.1 + DCR**, bearer fallback | ~23: `list_issues/projects/teams/users/cycles/comments/issue_labels/issue_statuses`, `get_issue/project/team/user`, `create_issue/project/comment/issue_label`, `update_issue` (status+assignee+priority+labels in one), `update_project`, `search_documentation` |
| **Atlassian (Jira/Confluence)** | `https://mcp.atlassian.com/v1/mcp/authv2` | HTTP streaming; **OAuth 2.1**, honors user perms; Cloud only | Jira: `getJiraIssue`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue`, `getVisibleJiraProjects`, `lookupJiraAccountId`; + Confluence page CRUD |
| **GitHub** | `https://api.githubcopilot.com/mcp/` (+ `/x/issues`, `/x/projects`) | Streamable HTTP / stdio; OAuth or PAT | Projects: `projects_list/get/write`; Issues: `issue_read/write`, `add_issue_comment`, `list_issues`, `search_issues`, `sub_issue_write` |

### CLIs (B)
- **Jira `jira-cli`** (ankitpokhrel, Go) — de-facto standard: `issue create/list/view/edit`, `issue move KEY "In Progress"` (transition+comment), `issue assign`, rich `list` filters, `epic`, `sprint`. Auth `JIRA_API_TOKEN`.
- **Jira `acli`** (official) — multi-site scripting; `jira workitem create/view/edit/comment`, transitions, JQL.
- **GitHub `gh`** — `gh project list/create/item-add/item-edit/field-list`; `gh issue create/list/edit/close/comment`.
- **Linear** — no official CLI; mature community ones (`Finesssee/linear-cli` Rust, OAuth+PKCE or API key).
- **OSS kanban** — Plane (REST+OAuth2, `uvx plane-mcp-server`), Kanboard CLI, Taskell (TUI), `kanban-cli` (Rust).

### Skills (C)
No standalone "triage my board" skill in `anthropics/skills`. PM ships via **`anthropics/knowledge-work-plugins`** (`product-management`, `productivity`, `customer-support`) that wire Linear/Jira/Asana/etc. as **connectors** the plugin orchestrates. Pattern: **PM integration = MCP connector + a plugin/skill that drives it.**

### Common PM-tool operation set (convergent)
1. **Hierarchy discovery (read):** list boards/projects → list columns/statuses → list cards/issues → `get_<entity>`.
2. **Card lifecycle (write):** `create_card`, `update_card` (status+assignee+labels+priority folded into one mutation — Linear/GitHub style).
3. **Move/transition:** field update (column/status id) or explicit `transition` verb where workflow is a state machine (Jira).
4. **Search:** universal powerful query (JQL / GitHub syntax / filters).
5. **Comments:** `list` + `create` (update/delete often omitted).
6. **Members lookup:** `list_users` / `lookupAccountId` so assignment has resolvable IDs.
7. **Conventions:** OAuth 2.1 over Streamable HTTP for hosted; PAT/API-key bearer for local/CI; **consolidate tools** to save context (GitHub merged CRUD into `issue_read`/`issue_write`, ~50% context cut); enforce permissions server-side.

---

## 3. Synthesis → What JType can build

JType already is *both* a note app (Markdown documents/folders) **and** a kanban app (boards/columns/cards/labels), behind one Axum service with workspaces, RBAC, sync, and — crucially — **an existing OAuth device flow** (`/api/oauth/device/{start,approve,poll}`) and bearer-token sessions. That means we can ship the *same three-modality strategy* the leaders use, reusing existing primitives:

| Modality | JType deliverable | Built on |
|---|---|---|
| **A. Online MCP server** | `POST /mcp` on jtype-web — **Streamable HTTP**, MCP auth via **OAuth (device grant, RFC 8628) + bearer**, exposing note + kanban tools that converge with the patterns above | existing Axum handlers (dispatched in-process), existing sessions table |
| **B. CLI** | `jtype` CLI, bundled with the desktop app, **device-auth login**, commands to manage documents + kanban projects, plus `obsidian enable` to bind/sync a local vault, and a `jtype mcp-stdio` bridge | existing device flow + REST API |
| **C. Skills** | Verified Agent Skills (`SKILL.md` folders) for note capture/organize and board triage, that **drive the jtype CLI/MCP** — installed & proven inside `jcode` | the CLI/MCP above |

**Tool surface (mirrors Notion notes + Linear/GitHub kanban, consolidated):**
- Notes: `list_workspaces`, `list_notes`, `get_note`, `search_notes`, `create_note`, `update_note`, `append_note`
- Kanban: `list_boards`, `get_board`, `list_cards`, `create_card`, `update_card` (status/column+assignee+labels+priority in one), `move_card`, `list_members`

This is the basis for the PRD (`01-prd.md`) and design (`02-design.md`).

### Sources
Notion: developers.notion.com/guides/mcp, notion.com/blog/notions-hosted-mcp-server-an-inside-look · Obsidian: github.com/coddingtonbear/obsidian-local-rest-api, github.com/cyanheads/obsidian-mcp-server · Linear: linear.app/docs/mcp · Atlassian: support.atlassian.com/atlassian-rovo-mcp-server · GitHub: github.com/github/github-mcp-server · Skills: github.com/anthropics/skills, github.com/anthropics/knowledge-work-plugins
