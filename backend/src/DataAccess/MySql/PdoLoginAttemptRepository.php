<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\LoginAttemptRepository;
use PDO;

final class PdoLoginAttemptRepository implements LoginAttemptRepository
{
    public function __construct(
        private PDO $pdo
    ) {
    }

    public function countSince(string $key, int $now): int
    {
        $statement = $this->pdo->prepare(
            'SELECT attempts
             FROM login_attempts
             WHERE attempt_key = ?
               AND expires_at > FROM_UNIXTIME(?)'
        );

        $statement->execute([$key, $now]);

        $attempts = $statement->fetchColumn();

        return $attempts === false ? 0 : (int) $attempts;
    }

    public function recordFailure(string $key, int $expires): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO login_attempts (
                attempt_key,
                attempts,
                expires_at
            )
            VALUES (?, 1, FROM_UNIXTIME(?))
            ON DUPLICATE KEY UPDATE
                attempts = IF(
                    expires_at > CURRENT_TIMESTAMP,
                    attempts + 1,
                    1
                ),
                expires_at = IF(
                    expires_at > CURRENT_TIMESTAMP,
                    expires_at,
                    VALUES(expires_at)
                )'
        );

        $statement->execute([$key, $expires]);
    }

    public function clear(string $key): void
    {
        $statement = $this->pdo->prepare(
            'DELETE FROM login_attempts
             WHERE attempt_key = ?'
        );

        $statement->execute([$key]);
    }
}