<?php
declare(strict_types=1);

namespace CaseFlow\Support;

final class Id
{
    public static function make(string $prefix): string
    {
        return $prefix . '-' . strtoupper(bin2hex(random_bytes(6)));
    }
}
