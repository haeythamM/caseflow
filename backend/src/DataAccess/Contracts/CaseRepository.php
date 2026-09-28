<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface CaseRepository
{
    public function find(string $id): ?array;
    public function all(): array;
    public function hasCustomerCases(string $customerId): bool;
    public function save(array $case): void;
    public function renameAgent(string $oldName, string $newName): void;
}
