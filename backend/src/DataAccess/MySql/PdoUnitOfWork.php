<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\MySql;

use CaseFlow\DataAccess\Contracts\UnitOfWork;
use PDO;
use Throwable;

final class PdoUnitOfWork implements UnitOfWork
{
    private PDO $pdo;
    private int $sequence = 0;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function run(callable $operation)
    {
        $nested = $this->pdo->inTransaction();
        $savepoint = 'caseflow_uow_' . ++$this->sequence;
        if ($nested) {
            $this->pdo->exec('SAVEPOINT ' . $savepoint);
        } else {
            $this->pdo->beginTransaction();
        }

        try {
            $result = $operation();
            if ($nested) {
                $this->pdo->exec('RELEASE SAVEPOINT ' . $savepoint);
            } else {
                $this->pdo->commit();
            }
            return $result;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) {
                if ($nested) {
                    $this->pdo->exec('ROLLBACK TO SAVEPOINT ' . $savepoint);
                    $this->pdo->exec('RELEASE SAVEPOINT ' . $savepoint);
                } else {
                    $this->pdo->rollBack();
                }
            }
            throw $error;
        }
    }
}
