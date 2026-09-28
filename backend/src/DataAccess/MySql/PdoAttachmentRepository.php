<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\AttachmentRepository;
use PDO;

final class PdoAttachmentRepository implements AttachmentRepository
{
    public function __construct(
        private PDO $pdo
    ) {
    }

    public function allMetadata(): array
    {
        return $this->pdo->query(
            'SELECT
                id,
                case_id AS caseId,
                CAST(user_id AS CHAR) AS userId,
                file_name AS name,
                mime_type AS mime,
                file_size AS size,
                created_at AS date
             FROM attachments
             ORDER BY created_at DESC'
        )->fetchAll();
    }

    public function find(string $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                id,
                case_id AS caseId,
                CAST(user_id AS CHAR) AS userId,
                file_name AS name,
                mime_type AS mime,
                file_size AS size,
                file_content AS content,
                created_at AS date
             FROM attachments
             WHERE id = ?
             LIMIT 1'
        );

        $statement->execute([$id]);

        $attachment = $statement->fetch();

        return $attachment === false ? null : $attachment;
    }

    public function add(array $attachment): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO attachments (
                id,
                case_id,
                user_id,
                file_name,
                mime_type,
                file_size,
                file_content,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $statement->bindValue(1, $attachment['id']);
        $statement->bindValue(
            2,
            $attachment['caseId'],
            $attachment['caseId'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $statement->bindValue(3, $attachment['userId']);
        $statement->bindValue(4, $attachment['name']);
        $statement->bindValue(5, $attachment['mime']);
        $statement->bindValue(6, $attachment['size'], PDO::PARAM_INT);
        $statement->bindValue(7, $attachment['content'], PDO::PARAM_LOB);
        $statement->bindValue(8, $attachment['date']);

        $statement->execute();
    }
}