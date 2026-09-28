<?php

declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\UserService;

final class UserController
{
    private UserService $service;

    public function __construct(UserService $service)
    {
        $this->service = $service;
    }

    public function index(
        array $input,
        array $params,
        ?array $user
    ): array {
        return $this->service->all($user ?? []);
    }

    public function avatar(array $input, array $params, ?array $user)
    {
        $file = $this->service->avatar($params['id'], $user ?? []);
        header('Content-Type: ' . $file['mime']);
        header('Content-Disposition: inline; filename*=UTF-8\'\'' . rawurlencode($file['name']));
        header('Content-Length: ' . strlen($file['content']));
        echo $file['content'];
        return null;
    }
}
