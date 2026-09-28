<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Support\Id;
use CaseFlow\Validation\Validator;

final class CustomerService
{
    private CustomerRepository $customers;

    public function __construct(CustomerRepository $customers)
    {
        $this->customers = $customers;
    }

    public function save(array $input, ?string $id = null): array
    {
        $old = $id ? $this->customers->find($id) : null;
        if ($id && !$old) throw new HttpError(404, 'Customer not found.');
        $data = Validator::fields(array_merge($old ?? [], $input), ['firstName', 'lastName', 'email', 'phone', 'status'], ['address', 'city', 'province', 'postalCode', 'country', 'notes']);
        Validator::choice('status', $data['status'], ['Active', 'Inactive', 'Suspended']);
        if ($this->customers->emailExists($data['email'], $id)) throw new HttpError(422, 'Email already in use.', ['email' => 'Email already in use.']);
        $data['id'] = $id ?? Id::make('CUST');
        $data['createdDate'] = $old['createdDate'] ?? gmdate('Y-m-d H:i:s');
        $this->customers->save($data);
        return $data;
    }

    public function delete(string $id): void
    {
        if (!$this->customers->find($id)) throw new HttpError(404, 'Customer not found.');
        $this->customers->deleteWithoutCases($id);
    }
}
