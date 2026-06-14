#!/usr/bin/env python3
"""Real AI ↔ JType-MCP conversation.

Uses the *same* model + API key that jcode is configured with
(``~/.jcode/config.json``), discovers the JType MCP tool catalog over Streamable
HTTP, and lets the model drive those tools via OpenAI-style function calling —
exactly how Claude / Cursor / jcode would. Captures the full transcript.

Usage:  python3 agent_loop.py "<task>"  [--save transcript.md]
"""
import json, os, sys, urllib.request, urllib.error

CFG = json.load(open(os.path.expanduser("~/.jcode/config.json")))
PROV, MODEL = CFG["model"].split("/", 1)
PC = CFG["providers"][PROV]
API_KEY, BASE = PC["api_key"], PC["base_url"].rstrip("/")
MCP = CFG["mcp_servers"]["jtype"]
MCP_URL, MCP_AUTH = MCP["url"], MCP["headers"]["Authorization"]

TRANSCRIPT = []
def log(role, text):
    print(f"\n=== {role} ===\n{text}", flush=True)
    TRANSCRIPT.append((role, text))

def http_post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST")
    req.add_header("content-type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_id = 0
def mcp(method, params=None):
    global _id; _id += 1
    _, body = http_post(MCP_URL, {"Authorization": MCP_AUTH},
                        {"jsonrpc": "2.0", "id": _id, "method": method, "params": params or {}})
    return json.loads(body)

def call_tool(name, args):
    r = mcp("tools/call", {"name": name, "arguments": args})
    res = r.get("result", {})
    return "".join(c.get("text", "") for c in res.get("content", [])) or json.dumps(r)

# 1. Discover JType tools from the MCP server, convert to OpenAI tool schema.
tools = mcp("tools/list")["result"]["tools"]
oa_tools = [{"type": "function",
             "function": {"name": t["name"], "description": t["description"],
                          "parameters": t["inputSchema"]}} for t in tools]
print(f"Discovered {len(oa_tools)} JType MCP tools: {', '.join(t['name'] for t in tools)}")

SYSTEM = ("You are an assistant with live access to the user's JType notes and kanban board "
          "through tools. Always call list_workspaces first to get a workspace_id. Use the "
          "tools to actually perform the task, then give a short final summary of what you did.")
TASK = sys.argv[1] if len(sys.argv) > 1 else "List my workspaces and summarize what you can see."
messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": TASK}]
log("USER", TASK)

# 2. Agentic loop.
for step in range(1, 17):
    st, body = http_post(BASE + "/chat/completions", {"Authorization": "Bearer " + API_KEY},
                         {"model": MODEL, "messages": messages, "tools": oa_tools,
                          "tool_choice": "auto", "temperature": 0.2})
    if st != 200:
        log("API ERROR", f"{st}: {body[:800]}")
        break
    msg = json.loads(body)["choices"][0]["message"]
    tool_calls = msg.get("tool_calls") or []
    messages.append({"role": "assistant", "content": msg.get("content") or "",
                     **({"tool_calls": tool_calls} if tool_calls else {})})
    if msg.get("content"):
        log("ASSISTANT", msg["content"])
    if not tool_calls:
        break
    for tc in tool_calls:
        fn = tc["function"]["name"]
        raw = tc["function"].get("arguments") or "{}"
        args = raw if isinstance(raw, dict) else json.loads(raw or "{}")
        log("TOOL CALL", f"{fn}({json.dumps(args, ensure_ascii=False)})")
        out = call_tool(fn, args)
        log("TOOL RESULT", out[:1500])
        messages.append({"role": "tool", "tool_call_id": tc.get("id", fn), "content": out})

# 3. Optionally persist the transcript as Markdown.
if "--save" in sys.argv:
    path = sys.argv[sys.argv.index("--save") + 1]
    with open(path, "w") as f:
        f.write(f"# Live AI ↔ JType MCP transcript\n\nModel: `{CFG['model']}` · {len(oa_tools)} tools\n\n")
        for role, text in TRANSCRIPT:
            f.write(f"### {role}\n\n```\n{text}\n```\n\n")
    print(f"\nSaved transcript → {path}")
