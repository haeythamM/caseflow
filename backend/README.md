# CaseFlow backend

The backend provides the JSON API used by the CaseFlow frontend. It handles sessions, customers, cases, communications, account settings and attachments. PHP services contain the application rules; PDO repositories read and write MySQL/MariaDB data.

## Requirements and setup

Use PHP 8.0 or newer with `pdo_mysql`, `mbstring` and `fileinfo`; the verified PHP version is 8.2. Check the executable and enabled modules with `php -v` and `php -m`. On Windows, the PHP found on PATH may differ from XAMPP's PHP.

Database settings are in `config/connection.php`. It reads `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER` and `MYSQLPASSWORD`, with no implicit credentials or database defaults. All five variables are required. See [local setup](../docs/SETUP.md).

Run `composer install` to validate platform requirements and generate autoload metadata. The application also registers its own loader in `bootstrap.php`.

The code expects these tables:

| Table | Data |
| --- | --- |
| `users` | Accounts, password hashes, roles, session versions, avatar references and settings JSON |
| `customers` | Customer records and contact information |
| `cases` | Case details, assignment, status and resolution timestamps |
| `case_activities` | Case progress and change history |
| `communications` | Recorded conversations and notes |
| `attachments` | File metadata and binary content |
| `login_attempts` | Failed-login counters and expiry |

Initialize the seven tables with [database/schema.sql](database/schema.sql) through the CLI script described in [Railway database initialization](database/README.md). This creates no users; account provisioning remains a separate step. The initializer is not a migration tool. Passwords must be stored as PHP-compatible password hashes; account creation is not exposed by this API.

## Start the API

From this directory:

```sh
php -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8000 -t public public/index.php
```

For a Windows installation with a separate PHP executable, substitute its full path. The PHP development server is for local work only. Composer's `serve` command and the frontend's `api:serve` shortcut use the same entry point.

`bootstrap.php` registers the project's autoloader and repository bindings. Composer declares platform requirements and optional PSR-4 metadata; the application can boot through its own loader without a vendor directory.

## Request flow

```text
public/index.php
  → Router and session/CSRF middleware
  → Controller
  → Service and validation
  → Repository / UnitOfWork
  → PDO / MySQL
```

Routes are declared in `routes/api.php`. Controllers adapt request input to service calls. Services validate operations and coordinate transactions. SQL stays in `src/DataAccess/MySql/`. All repositories share the PDO connection; nested transactions use savepoints. Database names are mapped to camelCase API fields in the repositories.

## API reference

All paths below start with `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health response without requiring a database connection |
| GET | `/auth/csrf` | Establish session and obtain CSRF token |
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | End session |
| GET | `/auth/me` | Current user |
| GET | `/workspace` | User, customers, cases, communications, activities and attachment metadata |
| GET | `/users` | Read-only directory; Admin only |
| GET | `/users/:id/avatar` | Current profile image; Admin or the user themselves (Demo Viewer remains denied) |
| POST | `/customers` | Create customer |
| PATCH | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer only when no case history exists |
| POST | `/cases` | Create case |
| PATCH | `/cases/:id` | Update case |
| POST | `/cases/:id/updates` | Add progress note and optional status change |
| POST | `/communications` | Record a communication and related activity |
| PATCH | `/settings` | Update profile, password or preferences |
| POST | `/avatar` | Upload current user's profile picture |
| POST | `/cases/:id/attachments` | Upload a case attachment |
| GET | `/attachments/:id` | Download an accessible file |

Except health and the CSRF/login/logout endpoints, routes require authentication. Logout still requires CSRF. There are no separate GET customer-list or case-detail endpoints: the frontend currently obtains those records from Workspace.

`Demo Viewer` is a read-only role. Authenticated workspace reads include customers, cases, communications and activities; Dashboard and Reports use that same data. The router denies this role's application writes, attachment downloads, user management, settings and avatar access with the normal JSON HTTP 403 response. Authentication and logout require the normal CSRF checks, including HTTP 419 for an invalid or missing CSRF token. Unknown roles are rejected with HTTP 403.

The frontend hides Demo Viewer write/file controls and Users/Settings navigation, and redirects prohibited form or management routes to `/dashboard`. The backend remains the authority for direct API requests. The `users.role` column is `VARCHAR(50)` and accepts `Demo Viewer`. Demo accounts require separate provisioning.

Avatar reads return image bytes with the stored image Content-Type and inline disposition. Missing users, absent avatars and missing or invalid referenced files return 404; other users' avatars require Admin access. The endpoint resolves only the target user's current `avatar_id`, requires an owned personal image, and does not accept attachment IDs. Generic personal attachments are owner-only; case attachments follow the role policy. Frontend avatar URLs must use `/api/users/:id/avatar` for Admin cross-user display.

JSON success responses wrap their value in `data`. Errors return `message` and, where relevant, an `errors` object. Downloads return the file itself. Common error statuses are 400 for malformed JSON, 401 for missing/expired authentication, 403 for forbidden operations, 404 for missing resources, 405 for unsupported methods, 409 for conflicting operations, 413 for oversized JSON, 419 for CSRF failure, 422 for validation and 429 for too many login attempts.

## Sessions, validation and files

PHP sessions use an HttpOnly, SameSite=Lax cookie. Authenticated sessions expire after eight hours, or thirty days with Remember Me. Login regenerates the session ID and CSRF token. Password changes increment the account's session version. Failed login attempts are tracked by an IP/email-derived key; five failures trigger the current fifteen-minute limit.

Writes require an `X-CSRF-Token` header. JSON bodies must be objects and are limited to 64 KiB. Field and upload validation run in the backend independently of frontend validation.

Uploads use multipart form data. Profile pictures allow PNG, JPEG and GIF up to 2 MiB. Case attachments allow PDF, PNG, JPEG and ZIP up to 10 MiB. Files are checked by detected MIME type and stored with their metadata in the database. Personal pictures use the owner/Admin avatar policy described above; generic personal attachment downloads remain owner-only. Case attachment access follows the role policy, including Demo Viewer denial.

Available session environment settings:

| Variable | Meaning |
| --- | --- |
| `CASEFLOW_SESSION_PATH` | Override the default `storage/sessions` directory |
| `CASEFLOW_SECURE_COOKIE=1` | Set the cookie Secure flag for HTTPS deployments |

## Tests

```sh
php tests/run.php
php tests/transactions.php
node tests/http.mjs
php tests/mysql.php
php tests/mysql.php --contracts
```

- Service and architecture checks run without a database, using deliberately unbound contracts and test doubles where appropriate.
- Transaction checks use a PDO probe to verify commit, rollback and nested savepoint behavior.
- HTTP checks start a temporary local server and test unauthenticated boundaries without writing application records. Set `PHP_BINARY` if Node must use a particular PHP executable.
- MySQL checks require the actual schema and permission to create temporary tables. Connection-local copies shadow the real tables, so test writes do not alter persistent records. Foreign keys are omitted from the temporary copies because MariaDB does not support them there; these tests do not verify foreign-key enforcement.
- MySQL checks also execute `tests/demo-viewer-checks.php`: authenticated route dispatch verifies Demo Viewer read access and denials, unchanged data after prohibited requests, and Admin/Support Agent permissions. Synthetic role records exist only in the temporary tables; no real demo account is created.
- Avatar service and integration checks cover Admin/self reads, missing references, unrelated files, and generic attachment and Demo Viewer restrictions.
- Case integration checks cover customer names in repository lists, workspace and create/update responses, including multiple customers, renamed customers and broken relationships. Names are resolved from customers through a LEFT JOIN; missing relationships return an empty name without dropping the case. No customer name is stored in cases.
- `--contracts` additionally checks frontend/backend expectations, including case customer names, the dedicated avatar service and the owner-only generic personal attachment policy.

See [verification results](../docs/VERIFICATION.md) for the exercised browser and database workflows. Concurrent writes and production load remain unverified.

## Deployment notes

Serve only `public/` as web content and keep `config/`, `src/`, `storage/`, and tests outside the document root. Forward `/api` requests to the PHP entry point; frontend paths belong to the frontend SPA fallback. `public/.htaccess` supplies an Apache rewrite when the server permits it.

Use HTTPS and secure cookies, a writable private session directory, reviewed database permissions and upload limits consistent with the application. PHP logs unexpected exceptions and returns a generic JSON error. Database backup/restore procedures and environment-specific configuration must be established before production use.

## Copyright

Copyright © 2026 haeythamM. All rights reserved. The original backend, tests, configuration and documentation are proprietary. Use, execution, modification, redistribution or deployment requires prior written permission, subject to applicable law and platform terms. Third-party software remains under its own licenses. See [LICENSE](../LICENSE).
