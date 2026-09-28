<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\ActivityRepository;
use CaseFlow\DataAccess\Contracts\CaseRepository;
use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Support\Id;
use CaseFlow\Validation\Validator;

final class CaseService
{
    public const STATUSES = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
    public const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
    public const CATEGORIES = ['Technical', 'Billing', 'Account Access', 'Feature Request', 'Onboarding', 'Localization', 'General Inquiry'];

    private CaseRepository $cases;
    private CustomerRepository $customers;
    private UserRepository $users;
    private ActivityRepository $activities;
    private UnitOfWork $transactions;

    public function __construct(CaseRepository $cases, CustomerRepository $customers, UserRepository $users, ActivityRepository $activities, UnitOfWork $transactions)
    {
        $this->cases = $cases;
        $this->customers = $customers;
        $this->users = $users;
        $this->activities = $activities;
        $this->transactions = $transactions;
    }

    public function find(string $id): array
    {
        $case = $this->cases->find($id);
        if (!$case) throw new HttpError(404, 'Case not found.');
        return $case;
    }

    public function activity(string $id, string $type, string $text, string $agent): void
    {
        $this->activities->add(['id' => Id::make('ACT'), 'caseId' => $id, 'type' => $type, 'text' => $text, 'agent' => $agent, 'date' => gmdate('Y-m-d H:i:s')]);
    }

    public function save(array $input, array $user, ?string $id = null): array
    {
        $old = $id ? $this->find($id) : null;
        $data = Validator::fields(array_merge($old ?? [], $input), ['customerId', 'subject', 'description', 'priority', 'status'], ['category', 'assignedAgent']);
        $data['category'] = $data['category'] ?: 'General Inquiry';
        Validator::choice('status', $data['status'], self::STATUSES);
        Validator::choice('priority', $data['priority'], self::PRIORITIES);
        Validator::choice('category', $data['category'], self::CATEGORIES);
        if (!$this->customers->find($data['customerId'])) throw new HttpError(422, 'Select an existing customer.', ['customerId' => 'Customer not found.']);
        if ($data['assignedAgent'] !== '' && !$this->users->agentExists($data['assignedAgent'])) throw new HttpError(422, 'Select an existing agent.');
        if ($old && $old['customerId'] !== $data['customerId']) throw new HttpError(422, 'A case cannot be moved to another customer.');

        return $this->transactions->run(function () use ($data, $old, $id, $user): array {
            $data['id'] = $id ?? Id::make('CASE');
            $data['createdDate'] = $old['createdDate'] ?? gmdate('Y-m-d H:i:s');
            $data['lastUpdated'] = gmdate('Y-m-d H:i:s');
            $data['resolvedAt'] = in_array($data['status'], ['Resolved', 'Closed'], true) ? ($old['resolvedAt'] ?? $data['lastUpdated']) : null;
            $this->cases->save($data);
            if (!$old) {
                $this->activity($data['id'], 'created', 'Case created.', $user['name']);
            } else {
                foreach (['status', 'assignedAgent', 'priority', 'subject', 'category', 'description'] as $field) {
                    if ($old[$field] !== $data[$field]) $this->activity($data['id'], $field === 'status' ? 'status_change' : ($field === 'assignedAgent' ? 'assigned' : 'note'), $field . ' updated to: ' . $data[$field], $user['name']);
                }
            }
            return $this->find($data['id']);
        });
    }

    public function update(string $id, array $input, array $user): void
    {
        $case = $this->find($id);
        $data = Validator::fields($input, ['text'], ['status']);
        if ($data['status']) Validator::choice('status', $data['status'], self::STATUSES);
        $this->transactions->run(function () use ($case, $data, $user): void {
            $case['lastUpdated'] = gmdate('Y-m-d H:i:s');
            $this->activity($case['id'], 'note', $data['text'], $user['name']);
            if ($data['status']) {
                $case['status'] = $data['status'];
                $case['resolvedAt'] = in_array($data['status'], ['Resolved', 'Closed'], true) ? ($case['resolvedAt'] ?? $case['lastUpdated']) : null;
                $this->activity($case['id'], 'status_change', 'Status changed to ' . $data['status'], $user['name']);
            }
            $this->cases->save($case);
        });
    }
}
