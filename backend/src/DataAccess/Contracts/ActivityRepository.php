<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface ActivityRepository
{
    public function all(): array;
    public function add(array $activity): void;
}
