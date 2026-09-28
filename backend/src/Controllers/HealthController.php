<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

final class HealthController
{
    public function show(array $input, array $params, ?array $user): array
    {
        // Liveness only. No connection attempt or claim that persistence is ready.
        return ['status' => 'ok', 'scope' => 'api'];
    }
}
