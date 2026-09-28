<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\ActivityRepository;
use CaseFlow\DataAccess\Contracts\AttachmentRepository;
use CaseFlow\DataAccess\Contracts\CaseRepository;
use CaseFlow\DataAccess\Contracts\CommunicationRepository;
use CaseFlow\DataAccess\Contracts\CustomerRepository;
use CaseFlow\DataAccess\Contracts\UserRepository;

final class WorkspaceService
{
    private CustomerRepository $customers;
    private CaseRepository $cases;
    private CommunicationRepository $communications;
    private ActivityRepository $activities;
    private AttachmentRepository $attachments;
    private UserRepository $users;

    public function __construct(CustomerRepository $customers, CaseRepository $cases, CommunicationRepository $communications, ActivityRepository $activities, AttachmentRepository $attachments, UserRepository $users)
    {
        $this->customers = $customers;
        $this->cases = $cases;
        $this->communications = $communications;
        $this->activities = $activities;
        $this->attachments = $attachments;
        $this->users = $users;
    }

    public function read(array $user): array
    {
        $activities = [];
        foreach ($this->activities->all() as $row) $activities[$row['caseId']][] = $row;
        return [
            'user' => AuthService::publicUser($user),
            'customers' => $this->customers->all(),
            'cases' => $this->cases->all(),
            'communications' => $this->communications->all(),
            'caseActivities' => (object) $activities,
            'agents' => $this->users->agentNames(),
            'categories' => CaseService::CATEGORIES,
            'attachments' => $this->attachments->allMetadata(),
        ];
    }
}
