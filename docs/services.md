# JType Service Infrastructure

JType is local-first, but the service layer is prepared for sync, publishing, and AI indexing.

## Local Services

Start services, including MySQL, RustFS, and the JType web service:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

## MySQL

MySQL stores service-side metadata:

- workspaces
- documents
- publish targets
- publish revisions
- AI chunks

The initial schema lives in `infra/mysql/001_init.sql`.

Default local URL:

```text
mysql://jtype:jtype-local@127.0.0.1:3306/jtype
```

## RustFS

## JType Web

The companion website runs at:

```text
http://localhost:8080
```

Useful URLs:

```text
Health: http://localhost:8080/health
Login helper page: http://localhost:8080/login
User site: http://localhost:8080/@username
```

Run only the web service locally against a running MySQL:

```bash
npm run web:dev
```

Run web service tests:

```bash
npm run web:test
```

## RustFS

RustFS is reserved for object storage:

- exported static site assets
- publish revision bundles
- future AI embedding artifacts

Default local endpoints:

```text
S3 API: http://127.0.0.1:9000
Console: http://127.0.0.1:9001
```

The desktop app still writes local workspace data to disk. MySQL becomes active when a user logs in and syncs a workspace. RustFS is reserved for future image and attachment asset publishing.
