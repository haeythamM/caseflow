<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface CustomerRepository
{
    public function find(string $id): ?array;
    public function all(): array;
    public function emailExists(string $email, ?string $exceptId = null): bool;
    public function save(array $customer): void;
    /** Must atomically refuse deletion when related cases exist (HTTP 409). */
    public function deleteWithoutCases(string $id): void;
}
