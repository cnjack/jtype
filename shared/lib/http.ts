let requestCounter = 0;

export async function httpRequest(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const id = ++requestCounter;
  const method = init.method ?? (input instanceof Request ? input.method : "GET");
  const url = input instanceof Request ? input.url : input.toString();
  const startedAt = performance.now();

  console.info(`[http_client] → ${method.toUpperCase()} ${url} #${id}`);
  try {
    const response = await fetch(input, init);
    const durationMs = Math.round(performance.now() - startedAt);
    const log = response.ok ? console.info : console.warn;
    log(`[http_client] ← ${method.toUpperCase()} ${url} ${response.status} ${durationMs}ms #${id}`);
    return response;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error(`[http_client] × ${method.toUpperCase()} ${url} ${durationMs}ms #${id}`, error);
    throw error;
  }
}
