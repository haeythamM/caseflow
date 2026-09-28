<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\CustomerService;

final class CustomerController
{
    private CustomerService $service;

    public function __construct(CustomerService $service)
    {
        $this->service = $service;
    }

    public function create(array $input, array $params, ?array $user)
    {
        return $this->service->save($input);
    }

    public function update(array $input, array $params, ?array $user)
    {
        return $this->service->save($input, $params['id']);
    }

    public function delete(array $input, array $params, ?array $user)
    {
        $this->service->delete($params['id']);
        return ['message' => 'Customer deleted.'];
    }

}
