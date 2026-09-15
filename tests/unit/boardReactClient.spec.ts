import { test, expect } from "@playwright/test";
import { createJTypeClient, JTypeApiError } from "../../packages/board-react/src/client";

// Instance-client contract for jtype-board-react: constructor-injected
// baseUrl+token (no localStorage, no globals), typed error mapping that never
// leaks the token, and the post-PR-#45 live-SSE fallback semantics (an
// mcp-scoped token is rejected on the live feed → permanent, visible downgrade
// to polling).

const TOKEN = "jt_secret_token_abc123";

type Call = { url: string; init: RequestInit | undefined };

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return handler(String(input), init);
  }) as typeof fetch;
  return { f, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("runs without any localStorage (pure constructor injection)", async () => {
  // The unit runner is plain node: no window, no localStorage. If the client
  // touched either, construction or the call below would throw.
  expect(typeof globalThis.localStorage).toBe("undefined");
  const { f } = mockFetch(() => json([]));
  const client = createJTypeClient({ baseUrl: "https://jtype.example.com", token: TOKEN, fetchImpl: f });
  await expect(client.listDocuments("ws-1")).resolves.toEqual([]);
});

test("injects the token as a Bearer header and normalizes the base URL", async () => {
  const { f, calls } = mockFetch(() => json([]));
  const client = createJTypeClient({ baseUrl: "https://jtype.example.com///", token: TOKEN, fetchImpl: f });
  await client.listDocuments("ws-1");
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url).toBe("https://jtype.example.com/api/v1/workspaces/ws-1/documents");
  const headers = calls[0]!.init?.headers as Record<string, string>;
  expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  expect(headers["Content-Type"]).toBe("application/json");
});

test("maps typed server errors to JTypeApiError without leaking the token", async () => {
  const { f } = mockFetch(() => json({ error: "workspace_not_found" }, 404));
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: f });
  let err: unknown;
  try {
    await client.getDocument("ws-1", "doc-1");
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(JTypeApiError);
  const ae = err as JTypeApiError;
  expect(ae.status).toBe(404);
  expect(ae.code).toBe("workspace_not_found");
  expect(ae.message).not.toContain(TOKEN);
});

test("maps non-JSON error bodies and network failures to generic codes", async () => {
  const bad = mockFetch(() => new Response("<html>gateway…</html>", { status: 502 }));
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: bad.f });
  await expect(client.listDocuments("w")).rejects.toMatchObject({ status: 502, code: "http_502" });

  const down = mockFetch(() => {
    throw new Error(`connect ECONNREFUSED (Authorization: Bearer ${TOKEN})`);
  });
  const offline = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: down.f });
  let err: unknown;
  try {
    await offline.listDocuments("w");
  } catch (e) {
    err = e;
  }
  const ae = err as JTypeApiError;
  expect(ae.code).toBe("network_error");
  expect(ae.status).toBe(0);
  // The raw fetch error (which may embed the header) must never surface.
  expect(ae.message).not.toContain(TOKEN);
});

test("saveDocument posts the payload; deleteDocument accepts 204", async () => {
  const { f, calls } = mockFetch((url) =>
    url.endsWith("/documents/save")
      ? json({ relativePath: "b/x.md", contentHash: "h2", updatedClock: 2, mergeStatus: "accepted" })
      : new Response(null, { status: 204 }),
  );
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: f });
  const saved = await client.saveDocument("w", {
    relativePath: "b/x.md",
    content: "hi",
    baseContentHash: "h1",
    createOnly: true,
  });
  expect(saved.mergeStatus).toBe("accepted");
  expect(calls[0]!.init?.method).toBe("POST");
  expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
    relativePath: "b/x.md",
    content: "hi",
    baseContentHash: "h1",
    createOnly: true,
  });
  await expect(client.deleteDocument!("w", "doc-9")).resolves.toBeUndefined();
});

test("missing baseUrl/token fail fast with typed errors", () => {
  expect(() => createJTypeClient({ baseUrl: "", token: TOKEN })).toThrowError(/base_url_required/);
  expect(() => createJTypeClient({ baseUrl: "https://x.test", token: "" })).toThrowError(/token_required/);
});

// --- live SSE semantics (post PR #45) ---------------------------------------

test("SSE: 403 (mcp-scoped token) reports a PERMANENT downgrade — poll, don't retry", async () => {
  const { f, calls } = mockFetch(() => new Response(null, { status: 403 }));
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: f });
  const down = await new Promise<{ permanent: boolean; reason: string }>((resolve) => {
    client.subscribeBoardEvents!("w", "board-1", {
      onEvent: () => {},
      onUp: () => {},
      onDown: resolve,
    });
  });
  expect(down).toEqual({ permanent: true, reason: "live_forbidden_for_token" });
  expect(calls[0]!.url).toContain("/api/v1/workspaces/w/boards/board-1/events?token=");
});

test("SSE: data frames fire onEvent; stream end is a retryable downgrade", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(encoder.encode(': keep-alive\n\n'));
      c.enqueue(encoder.encode('data: {"type":"kanban:card-updated"}\n\n'));
      c.close();
    },
  });
  const { f } = mockFetch(() => new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }));
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: f });

  const seen: string[] = [];
  const done = new Promise<{ permanent: boolean }>((resolve) => {
    client.subscribeBoardEvents!("w", "board-1", {
      onEvent: () => seen.push("event"),
      onUp: () => seen.push("up"),
      onDown: resolve,
    });
  });
  const down = await done;
  expect(seen).toEqual(["up", "event"]); // keep-alive comment frame must NOT count as an event
  expect(down.permanent).toBe(false);
});

test("SSE: unsubscribe silences all callbacks (no leak into the component)", async () => {
  // A mocked fetch can't wire the abort signal to a hand-built Response body,
  // so this asserts the observable contract instead: after unsubscribe, later
  // stream activity (an event, then the stream ending) reaches no handler.
  let push: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      push = c;
    },
  });
  const { f } = mockFetch(() => new Response(stream, { status: 200 }));
  const client = createJTypeClient({ baseUrl: "https://x.test", token: TOKEN, fetchImpl: f });
  let calls = 0;
  const unsub = client.subscribeBoardEvents!("w", "b", {
    onEvent: () => {
      calls += 1;
    },
    onUp: () => {},
    onDown: () => {
      calls += 1;
    },
  });
  // Let the fetch + first read settle, then tear down.
  await new Promise((r) => setTimeout(r, 20));
  unsub();
  push!.enqueue(new TextEncoder().encode("data: late\n\n"));
  push!.close();
  await new Promise((r) => setTimeout(r, 20));
  expect(calls).toBe(0);
});
