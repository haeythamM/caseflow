<?php

declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface UserRepository
{
    public function find(string $id): ?array;
    public function findByEmail(string $email): ?array;
    public function all(): array;
    public function emailExists(string $email, ?string $exceptId = null): bool;
    public function agentExists(string $name): bool;
    public function agentNames(): array;
    public function save(array $user): void;
}