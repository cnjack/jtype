Board events let another service react when a card is created or changed. You can notify a deployment system, feed an agent, update a dashboard, or run any other workflow without repeatedly scanning every card.

Open the board in the web app, select **Board settings** (the gear in the board toolbar), then choose **Webhooks**. Every address shown there is already scoped to the board you opened.

## Choose a delivery mode

- **Push (HTTP)** sends a signed request to your HTTPS endpoint as soon as a card changes. Choose it when your service has a stable public endpoint and you want low latency.
- **Pull by sequence** lets your service ask for changes on its own schedule. Choose it for jobs, agents, private networks, and workflows that must recover cleanly after downtime.
- **Live SSE** holds a browser-style connection open and shows new events immediately. It is useful for connected dashboards and testing, but it is not a durable recovery cursor. Use sequence pull after a disconnect if every event matters.

Push and pull are alternatives for delivering the same card events. You do not need to enable a push webhook before using pull.

## Pull reliably with a sequence cursor

In the **Pull** tab, JType shows a sequence pull endpoint and a **Pull once** button. A production automation should follow the same cycle:

1. Start with `afterSequence=0`, or load the last cursor your automation saved.
2. Send the request with `Authorization: Bearer <session or MCP token>`.
3. Process the returned `events` in order.
4. Only after the whole batch succeeds, save `nextSequence` as the next cursor.
5. If `hasMore` is true, pull the next page immediately with the new cursor.
6. If processing fails, keep the old cursor and retry from it.

Retries can return an event you already saw. Make the receiving action idempotent—for example, record each event's `sequence` before starting the same deployment twice.

> Sequence numbers belong to the workspace, while the endpoint filters to one board. Gaps are normal: a missing number can belong to another board and does not mean an event was lost.

The button in Board settings is also a quick diagnostic. Create or edit a card, select **Pull once**, and check that the event appears and the displayed cursor advances. If more than one page is waiting, the button changes to **Pull next page**.

## Understand card events

- `kanban:card-created` is recorded when a card is saved for the first time.
- `kanban:card-updated` is recorded after later edits, including moving the card to another column.

Each event includes the board, card path, title, status, editor, and sequence. Optional card fields such as priority, assignee, and due date are included when present.

## Use Push (HTTP)

In **Push (HTTP)**, enter a name and an HTTPS target, select the event types, then choose **Create**. Copy the signing secret immediately—it is shown only once. Verify the HMAC-SHA256 signature in your receiver before acting on a request.

The webhook row shows the most recent delivery state. A failed delivery is visible there; JType does not report a successful automation when the endpoint could not be notified.

## Use Live SSE

Select **Connect & test** to watch events while the settings dialog is open. SSE uses a session token in the URL because the browser's `EventSource` API cannot attach an authorization header. Treat a URL containing that token like a password, and do not paste it into logs or tickets.

The server can close an idle stream. Reconnect for new live events; use sequence pull to recover events that may have happened while disconnected.

## Keep credentials safe

An MCP token generated from **Board settings → MCP access** is bound to that board on the server. It works only at the displayed pinned MCP address, cannot be reused for another board or the REST API, and stops working if the board or your workspace membership is removed. Store tokens and webhook signing secrets in your secret manager and rotate exposed credentials.
