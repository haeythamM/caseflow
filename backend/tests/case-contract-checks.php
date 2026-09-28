<?php
declare(strict_types=1);

// Run only inside mysql.php's connection-local copies of the actual schema.
if (!isset($pdo, $container, $users, $user, $case)) {
    throw new RuntimeException('Run php tests/mysql.php to execute these isolated checks.');
}
$caseRepository = $container->get(\CaseFlow\DataAccess\Contracts\CaseRepository::class);
$caseRouter = new \CaseFlow\Http\Router($container, require __DIR__ . '/../routes/api.php');
$caseSession = $_SESSION ?? [];
$caseToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
$pdo->beginTransaction();
try {
    $actor = $users->find($user['id']);
    $_SESSION = ['userId' => $actor['id'], 'version' => $actor['sessionVersion'], 'expires' => time() + 3600, 'csrf' => 'case-contract'];
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'case-contract';
    $secondCustomer = array_merge($customer, ['id' => 'CUST-NAME-CONTRACT', 'firstName' => 'Sophia', 'lastName' => 'Bennett', 'email' => 'case-name@example.test']);
    $customers->save($secondCustomer);
    $expected = [];
    foreach ([$customer, $secondCustomer, $secondCustomer] as $related) {
        $input = ['customerId' => $related['id'], 'subject' => 'Name contract', 'description' => 'Preserve case fields', 'priority' => 'High', 'status' => 'Open', 'category' => 'Technical', 'assignedAgent' => ''];
        $created = $caseRouter->dispatch('POST', '/api/cases', $input + ['customerName' => 'Untrusted name']);
        $name = $related['firstName'] . ' ' . $related['lastName'];
        verify($created['customerName'] === $name, 'Create response resolves the referenced customer, ignoring supplied name.');
        foreach ($input as $field => $value) {
            verify($created[$field] === $value, 'Create preserves case field: ' . $field);
        }
        verify(isset($created['id'], $created['createdDate'], $created['lastUpdated']) && array_key_exists('resolvedAt', $created) && $created['resolvedAt'] === null, 'Create preserves generated and nullable fields.');
        $expected[$created['id']] = $created;
        $updated = $caseRouter->dispatch('PATCH', '/api/cases/' . $created['id'], ['subject' => 'Updated name contract']);
        verify($updated['customerName'] === $name && $updated['customerId'] === $related['id'], 'Update response resolves customer name.');
        $expected[$created['id']] = $updated;
        verify($caseService->find($created['id']) === $updated, 'Individual service lookup preserves the complete response.');
    }
    $assertCases = static function (array $rows, string $source) use ($expected): void {
        $byId = array_column($rows, null, 'id');
        foreach ($expected as $caseId => $record) {
            verify(isset($byId[$caseId]) && $byId[$caseId] === $record, $source . ' resolves multiple customers and retains every case field.');
        }
    };
    $assertCases($caseRepository->all(), 'Repository list');
    $assertCases($caseRouter->dispatch('GET', '/api/workspace', [])['cases'], 'Workspace payload');

    $secondCustomer['firstName'] = 'Renamed';
    $customers->save($secondCustomer);
    verify($caseRepository->find($created['id'])['customerName'] === 'Renamed Bennett', 'Names reflect customer edits without updating cases.');

    // Temporary tables deliberately omit foreign keys, allowing orphan coverage.
    $orphan = array_merge($created, ['id' => 'CASE-ORPHAN-CONTRACT', 'customerId' => 'CUST-MISSING-CONTRACT']);
    $caseRepository->save($orphan);
    $orphan['customerName'] = '';
    verify($caseRepository->find($orphan['id']) === $orphan, 'Broken relationship preserves the case and returns an empty display name.');
    foreach ([$caseRepository->all(), $caseRouter->dispatch('GET', '/api/workspace', [])['cases']] as $rows) {
        $byId = array_column($rows, null, 'id');
        verify($byId[$orphan['id']] === $orphan, 'Lists and workspace retain orphan cases with empty names.');
        foreach ($expected as $caseId => $record) {
            $name = $record['customerId'] === $secondCustomer['id'] ? 'Renamed Bennett' : $customer['firstName'] . ' ' . $customer['lastName'];
            verify($byId[$caseId]['customerName'] === $name, 'Lists resolve current names for the correct customer IDs.');
        }
    }
    verify($caseRepository->find('CASE-NOT-FOUND-CONTRACT') === null, 'Missing case lookup remains null.');
} finally {
    $pdo->rollBack();
    $_SESSION = $caseSession;
    if ($caseToken === null) unset($_SERVER['HTTP_X_CSRF_TOKEN']);
    else $_SERVER['HTTP_X_CSRF_TOKEN'] = $caseToken;
}
