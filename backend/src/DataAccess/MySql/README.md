# PDO MySQL repositories

| Implementation | Responsibility |
| --- | --- |
| `PdoUserRepository` | Account lookup, directory, settings and profile persistence |
| `PdoCustomerRepository` | Customer records, counts and guarded deletion |
| `PdoCaseRepository` | Case storage and assignment updates |
| `PdoActivityRepository` | Case activity records |
| `PdoCommunicationRepository` | Communication records |
| `PdoAttachmentRepository` | File metadata and binary content |
| `PdoLoginAttemptRepository` | Login failure counters and expiration |
| `PdoUnitOfWork` | Transactions and nested savepoints |

Connection settings live in `config/connection.php`, and bindings in `config/data-access.php`. These implementations target the existing MySQL/MariaDB schema; they do not create tables during startup.

See the [backend guide](../../../README.md) for setup, authorization policies and tests.

Copyright © 2026 haeythamM. All rights reserved. Subject to the root [LICENSE](../../../../LICENSE).
