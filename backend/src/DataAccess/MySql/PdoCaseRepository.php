<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\CaseRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use PDO;

final class PdoCaseRepository implements CaseRepository
{
    private PDO $pdo;
    private UnitOfWork $transactions;

    private const COLUMNS = '
        c.id,
        c.customer_id AS customerId,
        TRIM(CONCAT_WS(" ", customer.first_name, customer.last_name)) AS customerName,
        c.subject,
        c.description,
        c.priority,
        c.status,
        c.category,
        COALESCE(c.assigned_agent, "") AS assignedAgent,
        c.created_at AS createdDate,
        c.updated_at AS lastUpdated,
        c.resolved_at AS resolvedAt
    ';

    public function __construct(PDO $pdo, UnitOfWork $transactions)
    {
        $this->pdo = $pdo;
        $this->transactions = $transactions;
    }

    public function find(string $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT ' . self::COLUMNS . '
             FROM cases c
             LEFT JOIN customers customer ON customer.id = c.customer_id
             WHERE c.id = ?
             LIMIT 1'
        );

        $statement->execute([$id]);

        $case = $statement->fetch();

        return $case === false ? null : $case;
    }

    public function all(): array
    {
        return $this->pdo
            ->query(
                'SELECT ' . self::COLUMNS . '
                 FROM cases c
                 LEFT JOIN customers customer ON customer.id = c.customer_id
                 ORDER BY c.created_at DESC'
            )
            ->fetchAll();
    }

    public function hasCustomerCases(string $customerId): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT 1
             FROM cases
             WHERE customer_id = ?
             LIMIT 1'
        );

        $statement->execute([$customerId]);

        return $statement->fetchColumn() !== false;
    }

    public function save(array $case): void
    {
        $this->transactions->run(function () use ($case): void {

            $statement = $this->pdo->prepare(
                'INSERT INTO cases (
                    id,
                    customer_id,
                    subject,
                    description,
                    priority,
                    status,
                    category,
                    assigned_agent,
                    created_at,
                    updated_at,
                    resolved_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE
                    subject = VALUES(subject),
                    description = VALUES(description),
                    priority = VALUES(priority),
                    status = VALUES(status),
                    category = VALUES(category),
                    assigned_agent = VALUES(assigned_agent),
                    updated_at = VALUES(updated_at),
                    resolved_at = VALUES(resolved_at)'
            );

            $statement->execute([
                $case['id'],
                $case['customerId'],
                $case['subject'],
                $case['description'],
                $case['priority'],
                $case['status'],
                $case['category'],
                $case['assignedAgent'] !== ''
                    ? $case['assignedAgent']
                    : null,
                $case['createdDate'],
                $case['lastUpdated'],
                $case['resolvedAt'],
            ]);
        });
    }

    public function renameAgent(string $oldName, string $newName): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE cases
             SET assigned_agent = ?
             WHERE assigned_agent = ?'
        );

        $statement->execute([$newName, $oldName]);
    }
}
