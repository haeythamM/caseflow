<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface LoginAttemptRepository
{
    public function countSince(string $key, int $now): int;
    /** Increment atomically, retaining the current unexpired window. */
    public function recordFailure(string $key, int $expires): void;
    public function clear(string $key): void;
}
