<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Authentication\Session;

final class SessionController
{
    public function csrf(array $input, array $params, ?array $user): array
    {
        return ['csrf' => $_SESSION['csrf']];
    }

    public function logout(array $input, array $params, ?array $user): array
    {
        Session::logout();
        return ['message' => 'Signed out.'];
    }
}
