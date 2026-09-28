<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\WorkspaceService;

final class WorkspaceController
{
    private WorkspaceService $service;

    public function __construct(WorkspaceService $service)
    {
        $this->service = $service;
    }

    public function show(array $input, array $params, ?array $user)
    {
        return $this->service->read($user);
    }

}
