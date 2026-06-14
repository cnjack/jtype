---
title: AI Integration Launch
type: project
status: planning
publish: false
target: Q3 2026
lead: omar
---

# AI Integration Launch

A human-readable mirror of the **Launch** kanban board, plus the plan behind it.
The board is where cards move; this note is where the plan lives. Source of
truth for scope is [../roadmap.md](../roadmap.md).

## Goal

Ship the MCP server and publicly launch the AI integration in Q3, so users can
connect an assistant to their workspace and have it read and update notes and
cards over MCP.

## Board mirror

### To do

- **Draft launch plan** _(high)_ — positioning, blog post outline, demo assets.
  Created from the 06-14 kickoff. Owner: Omar.
- Write launch blog post _(medium)_.

### Doing

- Finalize the MCP tool surface (notes + kanban) — Mei.

### Done

- OAuth 2.1 (PKCE) token flow against `localhost:13345` — verified mcp-scoped.

## Plan

1. **Foundation** — land the MCP server; freeze the 14-tool surface.
2. **Enablement** — docs for connecting an AI ([connect your AI]) and the token
   vs OAuth tradeoffs.
3. **Story** — launch blog post + a short demo that mirrors the kickoff flow:
   `list_workspaces` → `search_notes` → `create_note` → `create_card`.
4. **Ship** — flip the announcement live; keep the roadmap private.

## Driving the board from the CLI

```bash
jtype board get Launch
jtype card list --board Launch --column "Doing"
jtype card move --board Launch "Draft launch plan" --to-column Doing
```

[connect your AI]: /help/c/ai-mcp/connect-your-ai
