<?php
declare(strict_types=1);

namespace CaseFlow\Http;

use CaseFlow\Container;
use CaseFlow\Middleware\Authenticate;
use CaseFlow\Middleware\AuthorizeDemoViewer;
use CaseFlow\Middleware\VerifyCsrf;

final class Router
{
    private Container $container;
    private array $routes;

    public function __construct(Container $container, array $routes)
    {
        $this->container = $container;
        $this->routes = $routes;
    }

    public function dispatch(string $method, string $path, array $input)
    {
        $pathMatched = false;
        foreach ($this->routes as [$verb, $pattern, $controller, $action, $protected]) {
            if (!preg_match($pattern, $path, $params)) continue;
            $pathMatched = true;
            if ($verb !== $method) continue;
            $this->container->get(VerifyCsrf::class)->handle($method);
            $user = $protected ? $this->container->get(Authenticate::class)->handle() : null;
            if ($user !== null) $this->container->get(AuthorizeDemoViewer::class)->handle($method, $path, $user);
            return $this->container->get($controller)->$action($input, $params, $user);
        }
        throw new HttpError($pathMatched ? 405 : 404, $pathMatched ? 'Method not allowed.' : 'Endpoint not found.');
    }
}
