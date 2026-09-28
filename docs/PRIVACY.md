# Security and public data

Public source consists of application code, schema-only SQL, synthetic fixtures, tests and documentation. `.gitignore` excludes secrets, sessions, logs, dependencies, generated bundles, browser artifacts, local verification databases.

Fixture names are explicitly synthetic (`SampleOne Customer`, `Demo Agent One`), emails use `example.test`, phone numbers use 555-01xx and addresses are fictional. Screenshots use synthetic data. No login password is shipped. Public deployment URLs identify the demo services; they contain no credentials. The `.env.example` password is a placeholder, not a credential.

## Controls present in code

- PHP password hashing/verification; HttpOnly, SameSite=Lax sessions; configurable Secure cookies; session-ID regeneration and expiration.
- CSRF tokens on writes and IP/email-based failed-login throttling.
- Server-side role checks; unknown roles denied; Demo Viewer writes and file access denied.
- Prepared PDO statements, schema-aligned field limits and transactions.
- File-size and detected MIME-type checks, private database storage and authorized downloads.
- Generic public exception responses; internal errors go to private server logs.

This is a shared workspace: authorized agents can see customer and case records across the workspace. It is not a multi-tenant access model. A read-only demo still exposes the data it can read, so deploy only invented records. Email communications are logged; email delivery and self-service password reset are not implemented. Upload validation is not antivirus scanning.

## Public contributions and deployments

Keep credentials in private environment settings. Commit only placeholder values in configuration examples, and use fictional records in fixtures, screenshots and public demos. Exclude database exports, session files and server logs from public contributions.

Use HTTPS with `CASEFLOW_SECURE_COOKIE=1` for hosted deployments. Serve only `backend/public/` as the PHP document root and keep configuration and runtime storage private. See [SETUP.md](SETUP.md) for configuration and [VERIFICATION.md](VERIFICATION.md) for security check results and limitations.
