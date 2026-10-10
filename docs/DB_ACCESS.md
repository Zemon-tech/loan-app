# DB access and GRANT statements (task A-10)

Least-privilege DB users for the API (PRD §15.1 S9, §14.1). Three users, each with the
minimum rights it needs. Local-dev definitions live in
[`apps/api/src/db/seed/00-init.sql`](../apps/api/src/db/seed/00-init.sql); production uses the
same grants with secrets from a secrets manager.

## 1. Client DB user — `app_ro` (READ-ONLY)
Reads the client's loan data. SELECT only, on the specific tables/views the app needs. No
INSERT/UPDATE/DELETE, no DDL. The API's startup guard runs `SHOW GRANTS` for this user and
refuses to boot (in production) if it has any write privilege.

```sql
-- Local dev: whole schema. Production: prefer views (v_app_customer, v_app_loan, ...).
GRANT SELECT ON client_db.* TO 'app_ro'@'%';
-- Production example (views only):
-- GRANT SELECT ON client_db.v_app_customer TO 'app_ro'@'host';
```

> Live phase note: if the client delivers an **API** instead of direct DB access (the expected
> model — see `BACKEND_SPEC.md`), `app_ro` and `client_db` are not used in production; the
> client API credential replaces them. `app_ro` still exists locally so the read-only boot
> guard has something to check.

## 2. App runtime user — `app_rw` (DML only on `mobile_app`)
Used by the running server for OTP, sessions, devices, deletion requests, audit log. DML only —
the running app MUST NOT be able to change the schema.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON mobile_app.* TO 'app_rw'@'%';
```

## 3. Migrator user — `app_migrator` (DDL + DML on `mobile_app`)
Used ONLY by `npm run migrate:*` (Knex migrations). Separated from `app_rw` so the application
runtime never holds DDL rights. In production the migrator credential is supplied only to the
migration step/job, never to the server process.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON mobile_app.* TO 'app_migrator'@'%';
```

Env: `APP_DB_USER`/`APP_DB_PASSWORD` (runtime) and `APP_DB_MIGRATOR_USER`/
`APP_DB_MIGRATOR_PASSWORD` (migrations). The migrator falls back to the app user if unset.

## Startup guard (S10)
On boot the API checks `SHOW GRANTS` for the client (`app_ro`) user and, in production, refuses
to start if it has write/DDL privileges. Configurable warn-vs-fail in non-production.
