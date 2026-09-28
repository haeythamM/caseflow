<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\ActivityRepository;
use PDO;

final class PdoActivityRepository implements ActivityRepository
{
    public function __construct(
        private PDO $pdo
    ) {
    }

    public function all(): array
    {
        return $this->pdo->query(
            'SELECT
                id,
                case_id AS caseId,
                activity_type AS type,
                activity_text AS text,
                agent_name AS agent,
                created_at AS date
             FROM case_activities
             ORDER BY created_at ASC'
        )->fetchAll();
    }

    public function add(array $activity): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO case_activities (
                id,
                case_id,
                activity_type,
                activity_text,
                agent_name,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)'
        );

        $statement->execute([
            $activity['id'],
            $activity['caseId'],
            $activity['type'],
            $activity['text'],
            $activity['agent'],
            $activity['date'],
        ]);
    }
}