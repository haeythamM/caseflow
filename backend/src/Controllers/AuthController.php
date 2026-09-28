<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\AuthService;

final class AuthController
{
    private AuthService $service;

    public function __construct(AuthService $service)
    {
        $this->service = $service;
    }

    public function login(array $input, array $params, ?array $user)
    {
        return $this->service->login($input);
    }

    public function me(array $input, array $params, ?array $user)
    {
        return ['user' => AuthService::publicUser($user), 'csrf' => $_SESSION['csrf']];
    }

}
