<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface UnitOfWork
{
    /** Execute atomically on the same connection used by all bound repositories. */
    public function run(callable $operation);
}
