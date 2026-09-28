<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\CommunicationRepository;
use PDO;

final class PdoCommunicationRepository implements CommunicationRepository
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
                customer_id AS customerId,
                communication_type AS type,
                subject,
                body,
                agent_name AS agent,
                created_at AS date
             FROM communications
             ORDER BY created_at DESC'
        )->fetchAll();
    }

    public function add(array $communication): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO communications (
                id,
                case_id,
                customer_id,
                communication_type,
                subject,
                body,
                agent_name,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $statement->execute([
            $communication['id'],
            $communication['caseId'],
            $communication['customerId'],
            $communication['type'],
            $communication['subject'],
            $communication['body'],
            $communication['agent'],
            $communication['date'],
        ]);
    }
}