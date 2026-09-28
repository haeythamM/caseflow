<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\SettingsService;

final class SettingsController
{
    private SettingsService $service;

    public function __construct(SettingsService $service)
    {
        $this->service = $service;
    }

    public function update(array $input, array $params, ?array $user)
    {
        $this->service->save($input, $user);
        return ['message' => 'Settings saved.'];
    }

}
