<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface CommunicationRepository
{
    public function all(): array;
    public function add(array $communication): void;
}
