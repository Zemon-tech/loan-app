# DB access and GRANT statements (task A-10)

Document the **exact least-privilege GRANTs** for both DB users here (PRD S9, 14.1).

## Client DB user (READ-ONLY)
```sql
-- SELECT only, on the specific tables/views the app needs. No INSERT/UPDATE/DELETE, no DDL.
-- TODO: fill in once DB_MAPPING.md is known. Prefer views (v_app_customer, v_app_loan, ...).
-- GRANT SELECT ON client_db.v_app_customer TO 'app_ro'@'%';
```

## App DB user (READ/WRITE on mobile_app schema only)
```sql
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mobile_app.* TO 'app_rw'@'%';
```

Startup guard (S10): the API checks `SHOW GRANTS` for the client user and refuses to boot
(configurable) if it has write privileges.
