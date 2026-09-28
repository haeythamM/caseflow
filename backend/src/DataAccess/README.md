# Data access

Repository interfaces are in `Contracts/`; their PDO implementations are in `MySql/`. `config/data-access.php` binds users, customers, cases, activities, communications, attachments, login attempts and the unit of work to a shared PDO connection.

Services work with these interfaces rather than SQL. Repositories map database fields to the names expected by services and the API. Customer listing computes case counts through the case repository, and deletion checks for case history within a transaction. User settings and avatar references are persisted in the current mapping.

`UnitOfWork` owns transactions and nested savepoints. Keep operations that must succeed together on the same connection. The database integration tests exercise temporary copies of the real schema; they do not test foreign-key enforcement.

See the [backend guide](../../README.md) for setup, table requirements, API behavior and known limitations.

Copyright © 2026 haeythamM. All rights reserved. Subject to the root [LICENSE](../../../LICENSE).
