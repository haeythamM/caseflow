<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\CommunicationService;

final class CommunicationController
{
    private CommunicationService $service;

    public function __construct(CommunicationService $service)
    {
        $this->service = $service;
    }

    public function create(array $input, array $params, ?array $user)
    {
        return $this->service->create($input, $user);
    }

}
