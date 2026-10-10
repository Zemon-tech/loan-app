-- Local-dev MySQL bootstrap (FAKE data only — never real customer data).
-- Runs automatically on first container start via docker-entrypoint-initdb.d.
--
-- Creates the two schemas and the least-privilege users the API expects:
--   client_db   + app_ro        (SELECT only)   — mirrors the client's read-only DB
--   mobile_app  + app_rw        (DML only)       — the app RUNTIME user (OTP/sessions/etc.)
--   mobile_app  + app_migrator  (DDL + DML)      — runs Knex migrations ONLY
--
-- Why a separate migrator: migrations need DDL (CREATE/ALTER/INDEX), but the running app
-- must not be able to change the schema (least privilege, PRD 15.1 S9). In production the
-- migrator credential is used only by the migrate step/job, never by the server process.
--
-- Passwords here are LOCAL-DEV ONLY. Production uses a secrets manager (PRD 15.1 S2).

-- --- Schemas -------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS client_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS mobile_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --- Users (created for any host inside the Docker/WSL network) -----------
-- Pin the auth plugin to caching_sha2_password (fully supported by mysql2).
-- Without this, the user can inherit a server default such as auth_gssapi_client,
-- which mysql2 cannot speak ("unknown plugin auth_gssapi_client").
CREATE USER IF NOT EXISTS 'app_ro'@'%' IDENTIFIED WITH caching_sha2_password BY 'ro_pass';
CREATE USER IF NOT EXISTS 'app_rw'@'%' IDENTIFIED WITH caching_sha2_password BY 'rw_pass';
CREATE USER IF NOT EXISTS 'app_migrator'@'%' IDENTIFIED WITH caching_sha2_password BY 'migrate_pass';

-- If the users already exist with the wrong plugin, force them back onto the right one.
ALTER USER 'app_ro'@'%' IDENTIFIED WITH caching_sha2_password BY 'ro_pass';
ALTER USER 'app_rw'@'%' IDENTIFIED WITH caching_sha2_password BY 'rw_pass';
ALTER USER 'app_migrator'@'%' IDENTIFIED WITH caching_sha2_password BY 'migrate_pass';

-- --- Grants (least privilege, PRD 14.1 / docs/DB_ACCESS.md) --------------
-- Read-only user: SELECT only on the client DB. The API's startup guard runs
-- `SHOW GRANTS` for this user and refuses to boot if it has write access.
GRANT SELECT ON client_db.* TO 'app_ro'@'%';

-- App RUNTIME user: DML only on the app-owned schema (no DDL, no access to client_db).
GRANT SELECT, INSERT, UPDATE, DELETE ON mobile_app.* TO 'app_rw'@'%';

-- Migrator: DDL + DML on the app-owned schema only, for running Knex migrations.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON mobile_app.* TO 'app_migrator'@'%';

FLUSH PRIVILEGES;
