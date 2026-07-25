# jcode Cloud full-access OAuth

jcode Cloud can connect to JType through the device authorization flow and,
after explicit user consent, receive a 90-day `full` token. This integration is
intended for a trusted first-party jcode Cloud deployment. Public MCP clients
remain limited to the `mcp` scope.

## What the user approves

The JType consent page displays the verified client name and requested scope.
It never approves a completed code automatically. For `full`, the page warns
that the client can act with the signed-in user's existing permissions across
all cloud workspaces, including reading, creating, updating, and deleting
documents and Kanban cards. It does not grant the user new workspace or
administrator privileges.

After approval, the resulting token is still subject to normal JType RBAC. It
can be revoked from the user's token/session management UI and expires after 90
days.

## Configure both services

Generate one high-entropy secret and configure the same value on both servers.
Do not expose it to either browser frontend.

On JType:

```text
JTYPED_JCLOUD_OAUTH_CLIENT_ID=jcode-cloud
JTYPED_JCLOUD_OAUTH_CLIENT_NAME=jcode Cloud
JTYPED_JCLOUD_OAUTH_CLIENT_SECRET=<random secret>
```

On jcode Cloud:

```text
JTYPE_OAUTH_CLIENT_ID=jcode-cloud
JTYPE_OAUTH_CLIENT_SECRET=<same random secret>
```

When using the JType Helm chart, create a Kubernetes Secret and enable
`jcodeCloudOAuth`:

```bash
kubectl -n default create secret generic jtype-jcode-oauth \
  --from-literal=client-secret='<random secret>'
```

```yaml
jcodeCloudOAuth:
  enabled: true
  clientId: jcode-cloud
  clientName: jcode Cloud
  existingSecret: jtype-jcode-oauth
  secretKey: client-secret
```

If either service has no matching secret, jcode Cloud fails visibly and does
not fall back to a lower-scope token.

## Security boundaries

- On the standards-based OAuth device endpoint, `full` is available only to the
  configured confidential client. Unknown or public MCP clients receive
  `invalid_client`. JType Desktop keeps its separate first-party login flow.
- The client authenticates both when starting the flow and when exchanging the
  device code.
- Each device code is bound to its grant kind, requested scope, client ID, and
  verified display name. Desktop, MCP, and jcode Cloud codes cannot be exchanged
  through one another's token endpoint.
- Legacy device-code rows migrate to the safe `legacy` / `mcp` defaults and
  cannot be promoted to `full`.
- The browser sees the short user code and consent details, but never the client
  secret, long device code, or minted access token.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `jtype_oauth_client_not_configured` | Set `JTYPE_OAUTH_CLIENT_SECRET` on jcode Cloud. |
| `invalid_client` | The client IDs and secrets must match on both services. |
| Consent page cannot find the request | The six-digit code may be expired, consumed, or from an older deployment. Start Connect again. |
| `the jtype token is invalid or lacks access` | Reconnect after both services are deployed. Old `mcp` tokens cannot call every REST endpoint. Also verify the JType user is a member of the target cloud workspace. |
| Selectors stay empty | Confirm the connection completed with `full` scope, then verify the user can see at least one cloud workspace and board in JType. |
