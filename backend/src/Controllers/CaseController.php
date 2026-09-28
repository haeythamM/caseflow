<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\CaseService;

final class CaseController
{
    private CaseService $service;

    public function __construct(CaseService $service)
    {
        $this->service = $service;
    }

    public function create(array $input, array $params, ?array $user)
    {
        return $this->service->save($input, $user);
    }

    public function update(array $input, array $params, ?array $user)
    {
        return $this->service->save($input, $user, $params['id']);
    }

    public function progress(array $input, array $params, ?array $user)
    {
        $this->service->update($params['id'], $input, $user);
        return ['message' => 'Update saved.'];
    }

}
