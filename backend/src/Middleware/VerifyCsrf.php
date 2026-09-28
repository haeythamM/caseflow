<?php
declare(strict_types=1);

namespace CaseFlow\Middleware;

use CaseFlow\Authentication\Session;

final class VerifyCsrf
{
    public function handle(string $method): void
    {
        if (!in_array($method, ['GET', 'HEAD'], true)) Session::csrf();
    }
}
