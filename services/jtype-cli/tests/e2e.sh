#!/usr/bin/env bash
# End-to-end test for the jtype CLI against a live jtype-web server.
#
# Exercises every subcommand, including the real OAuth device flow (login is
# approved out-of-band with a freshly-registered user's token). Seeds a
# workspace + board via REST (the CLI intentionally has no workspace/board
# create), then drives local-first notes (bind + write-through + sync), kanban,
# and the stdio MCP bridge.
#
# Usage: bash e2e.sh [SERVER_URL]   (default http://localhost:13346)

set -uo pipefail
SERVER="${1:-${JTYPE_SERVER:-http://localhost:13346}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/target/debug/jtype"
[ -x "$BIN" ] || { echo "build first: (cd $ROOT && cargo build)"; exit 1; }

WORK="$(mktemp -d)"
export HOME="$WORK/home"; mkdir -p "$HOME"
JT() { "$BIN" --server "$SERVER" "$@"; }

PASS=0; FAIL=0
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
no(){ printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }
chk(){ local n="$1"; shift; if "$@" >"$WORK/o" 2>&1; then ok "$n"; else no "$n :: $(tail -1 "$WORK/o")"; fi; }

USER="cli$(date +%s)$$"
PW="TestPass1!"
echo "== jtype CLI e2e against $SERVER (user $USER) =="

# 0. Register a user via REST to obtain an approval token.
TOKEN=$(curl -s -X POST "$SERVER/api/register" -H 'content-type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PW\"}" | jq -r .token)
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] && ok "register $USER" || { no "register"; echo "FATAL"; exit 1; }

# 1. CLI device login (background) + out-of-band approval.
( JT login >"$WORK/login.out" 2>&1 ) & LP=$!
CODE=""
for _ in $(seq 1 40); do
  CODE=$(grep -oE 'Approve code:[[:space:]]+[0-9]+' "$WORK/login.out" 2>/dev/null | grep -oE '[0-9]+$' | head -1)
  [ -n "$CODE" ] && break
  sleep 0.5
done
if [ -n "$CODE" ]; then
  curl -s -X POST "$SERVER/api/oauth/device/approve" -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' -d "{\"userCode\":\"$CODE\"}" >/dev/null
  if wait "$LP"; then ok "device login (code $CODE)"; else no "device login poll"; fi
else
  kill "$LP" 2>/dev/null; no "device login (no code printed)"
fi
JT whoami | grep -q "$USER" && ok "whoami" || no "whoami"

# 2. Seed a workspace + board via REST.
WS=$(curl -s -X POST "$SERVER/api/v1/workspaces" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"name":"CLI E2E"}' | jq -r .id)
BOARD=$(curl -s -X POST "$SERVER/api/v1/workspaces/$WS/kanban/boards" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"name":"CLI Board"}')
BID=$(echo "$BOARD" | jq -r .id)
COL=$(echo "$BOARD" | jq -r '.columns[0].id')
COL2=$(echo "$BOARD" | jq -r '.columns[1].id')
[ -n "$WS" ] && [ "$WS" != null ] && ok "seed workspace+board" || no "seed workspace+board"

# 3. Local-first notes: bind a vault, read/write disk files, write-through to cloud.
VAULT="$WORK/vault"; mkdir -p "$VAULT"
JTV() { "$BIN" --server "$SERVER" --vault "$VAULT" "$@"; }
JT workspace list | grep -q "$WS" && ok "workspace list" || no "workspace list"
chk "bind vault → workspace" JTV bind --workspace "$WS"
JTV vault status | grep -q "$WS" && ok "vault status shows binding" || no "vault status"
chk "note create (local + write-through)" JTV note create "ideas/cli.md" --content $'# CLI\n\nMango notes live here.'
[ -f "$VAULT/ideas/cli.md" ] && ok "note written to disk" || no "note written to disk"
curl -s "$SERVER/api/v1/workspaces/$WS/documents" -H "authorization: Bearer $TOKEN" \
  | jq -e '.[]|select(.relativePath=="ideas/cli.md")' >/dev/null 2>&1 \
  && ok "note write-through reached cloud" || no "note write-through reached cloud"
JTV note list | grep -q "ideas/cli.md" && ok "note list (local)" || no "note list"
printf '{"id":"b","title":"x"}' > "$VAULT/x.board"
if JTV note list | grep -q "x.board"; then no "note list excludes .board"; else ok "note list excludes .board"; fi
JTV note get "ideas/cli.md" | grep -q "Mango" && ok "note get (local)" || no "note get"
JTV note search "Mango" | grep -q "ideas/cli.md" && ok "note search (local)" || no "note search"
chk "note update (local + write-through)" JTV note update "ideas/cli.md" --content $'# CLI v2\n\nUpdated body.'
JTV note get "ideas/cli.md" | grep -q "Updated body" && ok "note update applied (local)" || no "note update applied"

# 3b. Sync round-trip: a doc born in the cloud is pulled down into the vault.
curl -s -X POST "$SERVER/api/v1/workspaces/$WS/documents/save" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"relativePath":"from-cloud.md","content":"# Cloud\n\nborn in the cloud"}' >/dev/null
chk "sync (pull + push)" JTV sync
{ [ -f "$VAULT/from-cloud.md" ] && grep -q "born in the cloud" "$VAULT/from-cloud.md"; } \
  && ok "sync pulled cloud doc to disk" || no "sync pulled cloud doc to disk"
JTV --json sync | jq -e '.pulled.written == 0' >/dev/null 2>&1 \
  && ok "re-sync idempotent (0 written)" || no "re-sync idempotent"

# 4. Kanban.
JT board list --workspace "$WS" | grep -q "CLI Board" && ok "board list" || no "board list"
BG=$(JT board get --workspace "$WS" "$BID"); echo "$BG" | grep -q "To do" && ok "board get" || no "board get"
CID=$(JT --json card create --workspace "$WS" --board "$BID" --column "$COL" "Ship CLI" --priority high | jq -r .id)
[ -n "$CID" ] && [ "$CID" != null ] && ok "card create" || no "card create"
JT card list --workspace "$WS" --board "$BID" --column "$COL" | grep -q "Ship CLI" && ok "card list" || no "card list"
chk "card update" JT card update --workspace "$WS" "$CID" --priority urgent
chk "card move" JT card move --workspace "$WS" --board "$BID" "$CID" --to-column "$COL2"
JT card list --workspace "$WS" --board "$BID" --column "$COL2" | grep -q "Ship CLI" && ok "card moved to Doing" || no "card moved to Doing"

# 5. stdio MCP bridge.
TL=$(printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | JT mcp-stdio)
echo "$TL" | jq -e '.result.tools | length >= 14' >/dev/null 2>&1 && ok "mcp-stdio tools/list (>=14 tools)" || no "mcp-stdio tools/list"
CALLR=$(printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_workspaces","arguments":{}}}' | JT mcp-stdio)
echo "$CALLR" | grep -q "$WS" && ok "mcp-stdio tools/call list_workspaces" || no "mcp-stdio tools/call"

# 6. Scoped MCP token management.
TOK=$(JT --json token create --label e2e --ttl-days 7 | jq -r .token)
[ -n "$TOK" ] && [ "$TOK" != null ] && ok "token create" || no "token create"
JT token list | grep -q "e2e" && ok "token list" || no "token list"
curl -s -X POST "$SERVER/mcp" -H "authorization: Bearer $TOK" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq -e '.result.tools | length >= 14' >/dev/null 2>&1 \
  && ok "minted token works on /mcp" || no "minted token works on /mcp"
TID=$(JT --json token list | jq -r '.[] | select(.scope=="mcp" and .label=="e2e") | .id' | head -1)
chk "token revoke" JT token revoke "$TID"
RC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER/mcp" -H "authorization: Bearer $TOK" -H 'content-type: application/json' -d '{}')
[ "$RC" = "401" ] && ok "revoked token rejected (401)" || no "revoked token rejected (got $RC)"

# 7. Logout.
JT logout | grep -qi "Logged out" && ok "logout" || no "logout"

echo
echo "== RESULT: $PASS passed, $FAIL failed =="
rm -rf "$WORK"
[ "$FAIL" -eq 0 ]
