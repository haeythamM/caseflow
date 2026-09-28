<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\CommunicationRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\Support\Id;
use CaseFlow\Validation\Validator;

final class CommunicationService
{
    private CommunicationRepository $communications;
    private CaseService $cases;
    private UnitOfWork $transactions;

    public function __construct(CommunicationRepository $communications, CaseService $cases, UnitOfWork $transactions)
    {
        $this->communications = $communications;
        $this->cases = $cases;
        $this->transactions = $transactions;
    }

    public function create(array $input, array $user): array
    {
        $data = Validator::fields($input, ['caseId', 'type', 'subject', 'body']);
        Validator::choice('type', $data['type'], ['Email', 'Phone', 'Internal Note', 'Customer Message']);
        $case = $this->cases->find($data['caseId']);
        return $this->transactions->run(function () use ($data, $case, $user): array {
            $data += ['id' => Id::make('COMM'), 'customerId' => $case['customerId'], 'agent' => $user['name'], 'date' => gmdate('Y-m-d H:i:s')];
            $this->communications->add($data);
            $this->cases->activity($case['id'], 'communication', $data['type'] . ': ' . $data['subject'], $user['name']);
            return ['id' => $data['id']];
        });
    }
}
