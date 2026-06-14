# JType AI Integration — MCP + CLI + Skills

Make JType's notes **and** kanban controllable by AI agents, the way Notion /
Linear / Obsidian do — reusing JType's existing Axum service, RBAC, and OAuth
device flow.

## Deliverables in this folder

| File | What |
|---|---|
| [`00-research.md`](00-research.md) | Landscape: Notion/Obsidian + Linear/Jira/GitHub across MCP / CLI / Skills; convergent patterns |
| [`01-prd.md`](01-prd.md) | Product requirements (goals, FRs, success metrics) |
| [`02-design.md`](02-design.md) | Technical design (in-process dispatch, tool catalog, OAuth, CLI, tests) |
| [`skills/`](skills/) | `jtype-notes` + `jtype-kanban` Agent Skills (`SKILL.md`) |
| [`demo/agent_loop.py`](demo/agent_loop.py) | Real AI ↔ MCP agent loop (uses jcode's model) |
| [`demo/transcript.md`](demo/transcript.md) · [`transcript2.md`](demo/transcript2.md) | Captured live GLM-5.2 conversations |
| [`report.html`](report.html) | Self-contained slide-deck report (open in a browser) |

## Code shipped

- **MCP server** — `services/jtype-web/src/mcp/{mod,tools,oauth}.rs`, wired in
  `src/lib.rs`. `POST /mcp` (Streamable HTTP, JSON-RPC), OAuth device-grant +
  discovery, **14 tools**. Tests: `services/jtype-web/tests/{mcp_tests,oauth_mcp_tests}.rs`.
- **CLI** — `services/jtype-cli/` (Rust bin `jtype`): device-auth login,
  note/board/card commands, `obsidian` vault sync, `mcp-stdio` bridge. Tests:
  `cargo test` (vault unit) + `tests/e2e.sh` (27 checks).

## Run it

```bash
# Server (already in docker-compose; :13345)
docker compose up -d --build jtype-web

# MCP tests + OAuth tests (needs the MySQL from docker compose)
cargo test --manifest-path services/jtype-web/Cargo.toml --test mcp_tests --test oauth_mcp_tests

# CLI
cd services/jtype-cli && cargo build && cargo test         # unit
bash tests/e2e.sh http://localhost:13345                   # full e2e (device flow)

# Live AI demo (reads model+key from ~/.jcode/config.json)
python3 internal-docs/ai-integration/demo/agent_loop.py "Triage my Launch board" --save out.md
```

## Wire into an MCP client (e.g. jcode)

```jsonc
// ~/.jcode/config.json
"mcp_servers": {
  "jtype": {
    "type": "http",
    "url": "http://localhost:13345/mcp",
    "headers": { "Authorization": "Bearer <token from `jtype login`>" }
  }
}
```
Then copy `skills/jtype-notes` and `skills/jtype-kanban` into `~/.jcode/skills/`.
