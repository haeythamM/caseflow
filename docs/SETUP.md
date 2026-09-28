# Run CaseFlow locally

Use Node.js 22.12+ (verified on Node 22), Composer, PHP with `pdo_mysql`, `mbstring` and `fileinfo`, and a MySQL-compatible database. The code declares PHP 8.0+; verification used PHP 8.2 and MariaDB 12.1. Use a maintained PHP release for hosting.

## 1. Install and check requirements

```sh
cd frontend
npm ci
cd ../backend
php -m
composer install
composer check-platform-reqs
```

If Composer reports a missing extension, enable it in the PHP CLI configuration shown by `php --ini`. On Windows, `php -d extension=pdo_mysql -m` can verify that the bundled driver loads. Do not bypass required extensions with `--ignore-platform-reqs`.

## 2. Configure a dedicated database

Create an empty `caseflow` database with `utf8mb4` encoding and a password-protected application user. Use a database administration tool to assign permissions for the seven application tables. Initial schema setup additionally needs `CREATE`, `CREATE TEMPORARY TABLES` and `REFERENCES`; normal runtime needs table read/write access.

Set these process variables before starting PHP:

| Variable | Local example / purpose |
| --- | --- |
| `MYSQLHOST` | `127.0.0.1` |
| `MYSQLPORT` | `3306` |
| `MYSQLDATABASE` | `caseflow` |
| `MYSQLUSER` | `caseflow_app` |
| `MYSQLPASSWORD` | Your private database password; required and non-empty |
| `CASEFLOW_SECURE_COOKIE` | `0` for local HTTP; `1` for hosted HTTPS |
| `CASEFLOW_SESSION_PATH` | Optional private directory; defaults to `backend/storage/sessions` |

PowerShell uses `$env:MYSQLHOST = '127.0.0.1'`; Bash uses `export MYSQLHOST=127.0.0.1`. Supply the remaining variables through the same shell or your host's secret settings. The [environment example](../backend/.env.example) is a reference, not an automatic dotenv loader. Never put secrets in `VITE_*` variables.

From `backend/`:

```sh
php scripts/setup-database.php
```

This checks schema compatibility and creates missing tables. It does not create users, seed customer records or migrate an incompatible existing database. See [schema notes](../backend/database/README.md).

## 3. Provision a local account

There is no public registration endpoint or shipped login password. Through your database administration tool, insert a record into `users` with a name, an `example.test` email, a PHP-compatible password hash and one of these roles:

- `Admin`: customer/case workflows, own settings and user directory.
- `Support Agent`: customer/case workflows and own settings.
- `Demo Viewer`: read-only dashboard, customers, cases, communications, reports and About; no writes, settings, user directory or file access.

Generate the hash locally with `password_hash($password, PASSWORD_DEFAULT)`. Use a unique 12-72 byte password, avoid storing plaintext in SQL/source/history, and parameterize the account insert. `id`, timestamps and session version have schema defaults. An unknown role is denied access. Keep real customer data out of a shared demo.

## 4. Start both services

In `backend/`, with database variables set:

```sh
composer serve
```

In `frontend/`, in another terminal:

```sh
npm run dev
```

Open `http://localhost:8443`. The frontend proxies `/api` to `http://127.0.0.1:8000`. `npm run api:serve` in `frontend/` is another API startup option. Vite binds to loopback by default.

## Tests

From `frontend/`, without a database:

```sh
npm run typecheck
npm test
npm run build
npm run api:test
```

`npm test` runs jsdom integration, server rendering and SPA fallback checks. There is no lint script. `format` exists but is not part of test verification.

From `backend/`, with a **dedicated test database** configured:

```sh
composer validate --strict
composer test
composer test:mysql
php tests/mysql.php --contracts
php tests/setup-database.php
```

The last command requires `CASEFLOW_SETUP_TESTS=1` and privileges to create/drop its own randomly named database. It checks initialization, compatibility and foreign keys. The MySQL suite shadows application tables with connection-local temporary copies; those copies omit foreign keys. Never use a production database for tests.

With Vite already running on port 8443 and Google Chrome installed:

```sh
npm run test:responsive
npm run test:dashboard-scroll
```

Run these from `frontend/`. The responsive scripts intercept API calls with synthetic fixtures; they do not verify real persistence. Set `RESPONSIVE_MOBILE=1` to repeat the responsive matrix with mobile/touch emulation. Playwright is installed by `npm ci`; these scripts use local Chrome, so no Playwright browser download is needed.

For a real browser/API workflow, start both services against a disposable database and provision a synthetic Admin account first. Set `CASEFLOW_E2E=1`, `CASEFLOW_E2E_EMAIL` (must end in `@example.test`) and `CASEFLOW_E2E_PASSWORD`, then run `npm run test:workflow`. Optional `CASEFLOW_E2E_URL` defaults to `http://127.0.0.1:8443` and must be loopback. This suite creates persistent test records; dispose of the dedicated test database after use. It does not reset existing data.

## Hosting

Serve only `backend/public/` as the PHP document root. Keep config, storage and tests private. Route same-origin `/api/*` to PHP and frontend document paths to the built SPA. Do not run Vite or PHP development servers as production servers.

`frontend/vercel.json` configures the Railway API origin used by the CaseFlow demo. Its `/api/*` rewrite forwards requests to PHP; other paths load the SPA. The [public demo](https://caseflow-customer-service-demo.vercel.app/login) is on Vercel. Deployment check results and limitations are documented in [VERIFICATION.md](VERIFICATION.md). Forks should use their own API origin and private database configuration.

Use HTTPS and `CASEFLOW_SECURE_COOKIE=1`. Sessions use the `caseflow_session` cookie. Configuration uses `CASEFLOW_*` environment variables, and backend classes use the `CaseFlow` PHP namespace. The database name is configured through `MYSQLDATABASE`.
