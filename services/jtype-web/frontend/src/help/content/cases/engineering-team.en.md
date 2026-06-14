A six-person engineering team shipping a product launch shouldn't need five tools to keep one story straight. This team did anyway: meeting notes in a chat app, a roadmap in a wiki, tickets in a tracker, and the actual launch checklist living in someone's head. Every standup started with "wait, where's that note?" — and the AI assistant they wanted to point at the work had nothing single to point at.

They moved the whole thing into **one JType workspace**. The notes are plain Markdown in a vault on each engineer's machine; the launch board lives in the same cloud workspace; and an AI assistant reaches both over MCP. Here's how it fits together.

## The situation

The pain wasn't any one tool — it was the seams between them. The roadmap said one thing, the standup notes said another, and the board drifted from both. Nobody could ask a simple question like "what did we decide about the MCP server, and is there a card for it?" without opening three apps.

The fix was to make the notes the source of truth and keep the board next to them. Local-first Markdown means every engineer owns a real folder of files; binding that folder to a shared cloud workspace means the team — and an AI — see the same thing.

## The vault layout

The example vault ships in the repo at `examples/eng-team-vault`, so you can open it in JType and follow along. It's a normal folder of Markdown an engineer would actually write:

```text
eng-team-vault/
├── README.md                       # what this vault is + the Launch board
├── roadmap.md                      # Q3 roadmap (publish: false)
├── meetings/
│   ├── 2026-06-10-standup.md
│   └── 2026-06-14-ai-kickoff.md    # the note the AI created
├── daily/
│   └── 2026-06-14.md
└── projects/
    └── launch.md                   # the launch plan, mirrors the board
```

Nothing here is proprietary. Open it in any editor and it still makes sense; that's the point of a vault.

## The Launch board

The same cloud workspace holds a kanban board named **Launch** with three columns — **To do**, **Doing**, and **Done**. The board is where work *moves*; the notes are where work is *decided*. `projects/launch.md` keeps a human-readable mirror of the board so the plan reads top-to-bottom even when you're offline.

Anyone on the team can drive the board from the web view, the desktop app, or the CLI:

```bash
jtype board list
jtype card list --board Launch --column "To do"
jtype card create --board Launch --column "To do" "Draft launch plan" --priority high
```

## The AI triage flow over MCP

Here's the part that made the team stop dreading Mondays. They connected an AI assistant to the workspace over MCP (OAuth from the dashboard, no admin scope), then asked it to do the boring connective work: read the roadmap, write up the kickoff, and seed the board.

The assistant first orients itself, then searches the notes — it never guesses paths:

```text
list_workspaces({})
search_notes({ "query": "product roadmap", "workspace_id": "…" })
```

With the roadmap in hand, it writes the meeting summary as a real note in the vault, linking back to `roadmap.md` and naming the Q3 items it pulled in:

```text
create_note({
  "path": "meetings/2026-06-14-ai-kickoff.md",
  "title": "AI Kickoff Meeting — 2026-06-14",
  "workspace_id": "…"
})
```

Then it seeds the board so the decision has a home in the workflow, dropping a high-priority card in the first column:

```text
create_card({
  "board_id": "…",
  "column_id": "…",        // the "To do" column
  "title": "Draft launch plan",
  "priority": "high"
})
```

Because the AI's token is **mcp-scoped** — notes and kanban only, never admin — it can draft and triage but can't touch membership, billing, or settings. Every write respects the workspace role, and the team can revoke the connection any time from the AI Connections page or with `jtype token revoke`.

## The outcome

Standups now start from one note instead of a scavenger hunt. The kickoff summary the AI drafted links straight to the roadmap, and the "Draft launch plan" card it created is already sitting in **To do** when the team opens the board. Engineers edit Markdown locally, `jtype sync` pushes it to the shared workspace, and the AI keeps the board honest between meetings.

The same vault that anchors the team can later publish a release page by adding `publish: true` to a note — but that's a different story. For now: one workspace, real files, and an assistant that does the connective tissue.

## Try it yourself

- Open the example vault at `examples/eng-team-vault` in JType.
- Connect an AI assistant: [Connect your AI](/help/c/ai-mcp/connect-your-ai) and [What the AI can do](/help/c/ai-mcp/what-ai-can-do).
- Drive the board from the terminal: [Notes, bind & sync](/help/c/cli/notes-bind-sync) and [Boards & cards](/help/c/kanban/boards-and-cards).
