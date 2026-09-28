# CaseFlow verification — 2026-09-28

Results below cover automated tests, browser workflows, dependency checks and public endpoint availability as of 2026-09-28.

Test platform: Windows, Node.js 22.12, PHP 8.2.33, Composer 2.8.8, Chrome and MariaDB 12.1. Database tests used an isolated database.

## Commands and results

Frontend commands run in `frontend/`; backend commands run in `backend/` unless stated otherwise. Configuration and test prerequisites are in [SETUP.md](SETUP.md).

| Actual command/check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | PASS — clean lockfile installation, 170 packages |
| `npm ls --depth=0` | PASS — installed dependency tree matches the manifest |
| `npm audit --json` | PASS — zero reported advisories, including development dependencies, at check time |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 117 tests in 6 files; 26 page renders plus Sidebar checks; 6 SPA fallback checks |
| `npm run build` | PASS — production build |
| `npm run api:test` | PASS — 119 service/architecture checks, transaction checks, 16 HTTP boundary checks |
| `npm run test:responsive` | PASS — 300 checks, zero layout failures/page errors |
| `$env:RESPONSIVE_MOBILE='1'; npm run test:responsive` | PASS — 66 mobile/touch checks, zero failures/errors |
| `npm run test:dashboard-scroll` | PASS — 440×956, 440×800 and 390×844 |
| `npm run test:workflow` | PASS — real browser/API/isolated-database flow described below |
| `composer validate --strict` | PASS |
| `composer install --no-interaction` | PASS — installation from composer.lock |
| `composer check-platform-reqs` | PASS ? required PHP extensions available |
| `composer test` | PASS — 119 service/architecture checks and transaction probe |
| `composer test:mysql` | PASS — 157 database checks |
| `php tests/mysql.php --contracts` | PASS — 160 database/contract checks, including the preceding 157 |
| `$env:CASEFLOW_SETUP_TESTS='1'; php tests/setup-database.php` | PASS — 22 isolated schema/constraint checks |
| `node tests/http.mjs` | PASS — 16 unauthenticated HTTP boundary checks |
| `php -l` for every PHP file under `backend/` | PASS — 59 application/test files plus 10 generated Composer files |
| PowerShell `Parser.ParseFile` on `scripts/export-showcase.ps1` | PASS — syntax only; export was not run |
| Public file/credential-pattern scan and Markdown-link check | PASS — see scope below |
| `npm run lint` / PHPUnit | NOT RUN — no lint script or PHPUnit suite exists; the actual project suites above were used |

The syntax sweep was:

```powershell
$files = Get-ChildItem backend -Recurse -File -Filter '*.php'
foreach ($file in $files) {
    php -l $file.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

The workflow suite requires `CASEFLOW_E2E=1`, a synthetic `CASEFLOW_E2E_EMAIL` and `CASEFLOW_E2E_PASSWORD` set privately, and both local services running. It creates test records and requires a disposable database. See [SETUP.md](SETUP.md).

## Functional verification

The browser workflow exercised login, dashboard, customer creation/editing with persisted values, case creation/detail, close/reopen with resolution timestamps, communications and activity history, reports, profile save, schema-limit errors, CSRF rejection, genuine PNG upload/download, rejection of text disguised as PNG, logout and protected-route redirects. It completed with no unexpected browser errors. Database tests additionally exercised session expiration/version rejection, login throttling, duplicate/conflict behavior, role denials, rollback and repository/API contracts.

The responsive suite uses intercepted synthetic fixtures and therefore does not establish real database behavior. The workflow suite uses the real PHP API and isolated database.

## Public demo and deployment checks

Read-only `Invoke-WebRequest` calls returned HTTP 200 for:

- [CaseFlow login page](https://caseflow-customer-service-demo.vercel.app/login), with HTML title `CaseFlow`.
- [The demo API health endpoint](https://caseflow-customer-service-demo.vercel.app/api/health), with `status: ok` and `scope: api`.
- [Railway API health endpoint](https://caseflow-customer-service-backend-production.up.railway.app/api/health), with the same health response.

Health endpoints report API liveness, not database readiness. Authenticated hosted workflows, hosted database administration and the deployed source revision are outside this verification scope.

## Security and repository checks

- `npm audit --json` reported zero dependency advisories, including development dependencies, on the verification date.
- A pattern scan of public files, including hidden files, found no exposed credentials or unexpected contact addresses. Checks covered private-key and token formats, credential-bearing URLs, personal machine paths and non-example email addresses.
- Local Markdown links resolved successfully.
- Ignore rules exclude environment secrets, sessions, logs, databases, runtime storage, dependencies, builds and generated test output.

The credential check was a pattern scan, not a dedicated secret-scanner audit. Git history and external deployments were not included.

## Limitations

Integration checks used MariaDB 12.1; MySQL server versions and other PHP, Node.js and browser versions remain unverified. Concurrent-user and load testing, a formal accessibility audit, penetration testing and authenticated public-demo workflows are outside the recorded test coverage.

Upload validation does not include malware scanning. The application uses a shared workspace without tenant isolation. Server-side pagination, schema migrations, self-service password reset and outbound email are not implemented.
