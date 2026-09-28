<?php
declare(strict_types=1);

namespace CaseFlow\DataAccess\Contracts;

interface AttachmentRepository
{
    /** Metadata only; never expose file contents in workspace responses. */
    public function allMetadata(): array;
    public function find(string $id): ?array;
    public function add(array $attachment): void;
}
