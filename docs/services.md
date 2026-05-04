# JType Service Infrastructure

JType is local-first on desktop, but the service layer supports identity, cloud workspaces, bidirectional sync, publishing, admin, custom domains, storage budgets, and future asset storage.

## Local Services

Start services:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

Check status:

```bash
docker compose ps
```

## MySQL

MySQL stores service-side metadata:

- users and sessions
- OAuth device codes
- cloud workspaces
- workspace members and invites
- documents and document versions
- sync cursors and conflicts
- publish targets and revisions
- custom domain/certificate state
- AI-ready chunks

The initial schema lives in `infra/mysql/001_init.sql`.

Default local URL:

```text
mysql://jtype:jtype-local@127.0.0.1:3306/jtype
```

## JType Web

The companion web service runs at:

```text
http://localhost:13345
```

Useful URLs:

```text
Health: http://localhost:13345/health
Landing: http://localhost:13345/
Login: http://localhost:13345/login
Dashboard: http://localhost:13345/dashboard
Published site: http://localhost:13345/u/:username
```

Run only the web service locally against a running MySQL:

```bash
npm run web:dev
```

Run web service tests:

```bash
npm run web:test
```

Run web frontend/browser tests:

```bash
npm run test:web
```

## RustFS

RustFS is reserved for object storage:

- image and attachment assets
- published static site bundles
- publish revision artifacts
- future AI embedding/index artifacts

Default local endpoints:

```text
S3 API: http://127.0.0.1:9000
Console: http://127.0.0.1:9001
```

## Desktop Relationship To Services

The desktop app still writes local vault data to disk. It can work without Docker services for local editing.

When connected to cloud:

- Desktop uses browser-based OAuth through the web service.
- Desktop stores a cloud profile and vault bindings locally.
- Desktop syncs Markdown documents through Axum HTTP APIs.
- The web service enforces membership, budget, versioning, conflict handling, and publishing permissions.

Desktop should not connect directly to MySQL or RustFS.
