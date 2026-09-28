# Database schema and initialization

`schema.sql` contains only table definitions, with no accounts, passwords or customer records. It uses InnoDB and `utf8mb4_unicode_ci` for these seven tables:

| Table | Purpose |
| --- | --- |
| `users` | Password hashes, roles, session versions and preferences |
| `customers` | Customer records and contact fields |
| `cases` | Customer-linked cases, assignments, state and resolution time |
| `case_activities` | Case history |
| `communications` | Recorded conversations and notes |
| `attachments` | File metadata and binary content |
| `login_attempts` | Failed-login counters and expiry |

## Initialize

Create a dedicated empty database and set `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER` and `MYSQLPASSWORD` in the process environment. Then, from `backend/`:

```sh
php scripts/setup-database.php
```

The initializer compares existing definitions with temporary reference tables before creating missing tables. It checks columns, defaults, nullability, indexes, constraints, engine and collation while ignoring auto-increment sequence state. It rejects incompatible tables rather than altering or dropping them. Compatible reruns preserve records. Use one initializer at a time and take a backup before targeting a populated database.

Setup requires `CREATE`, `CREATE TEMPORARY TABLES`, `REFERENCES` and sufficient access to inspect the existing table definitions. MySQL DDL commits implicitly: a failure partway through creation can leave earlier new tables in place. Fix the reported cause and rerun. This is a schema initializer, not a migration framework. Directly importing SQL bypasses its compatibility checks.

The script requires explicit configuration and does not load `.env` automatically. The API requires a non-empty database password. The initializer permits an explicitly empty password for local testing only. Errors report SQLSTATE/driver codes without echoing connection credentials.

No account is created by initialization. See [local setup](../../docs/SETUP.md) for account provisioning and role descriptions.

## Verification

```sh
php tests/mysql.php --contracts
```

This uses connection-local temporary copies of an existing schema. Those copies omit foreign keys because MariaDB does not support them on temporary tables.

`CASEFLOW_SETUP_TESTS=1 php tests/setup-database.php` additionally creates and drops its own random database to check setup idempotence, schema mismatch detection and relational constraints. On PowerShell, set `$env:CASEFLOW_SETUP_TESTS = '1'` before invoking PHP. Always configure a disposable test environment; never a production database. See [executed results](../../docs/VERIFICATION.md).
