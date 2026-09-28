<?php
declare(strict_types=1);

namespace CaseFlow\Middleware;

use CaseFlow\Container;
use CaseFlow\Http\HttpError;
use CaseFlow\Services\AuthService;

final class Authenticate
{
    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function handle(): array
    {
        if (!isset($_SESSION['userId']) || ($_SESSION['expires'] ?? 0) < time()) throw new HttpError(401, 'Please sign in.');
        return $this->container->get(AuthService::class)->currentUser();
    }
}
