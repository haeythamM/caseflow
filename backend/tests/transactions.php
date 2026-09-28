<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

// Checks transaction ownership without touching the existing database.
final class TransactionProbe extends PDO
{
    public array $events = [];
    private bool $active = false;
    public function __construct() {}
    public function inTransaction(): bool { return $this->active; }
    public function beginTransaction(): bool { $this->events[] = 'begin'; return $this->active = true; }
    public function commit(): bool { $this->events[] = 'commit'; $this->active = false; return true; }
    public function rollBack(): bool { $this->events[] = 'rollback'; $this->active = false; return true; }
    public function exec(string $statement): int|false { $this->events[] = $statement; return 0; }
}

$pdo = new TransactionProbe();
$work = new CaseFlow\DataAccess\MySql\PdoUnitOfWork($pdo);
if ($work->run(fn() => 42) !== 42 || $pdo->events !== ['begin', 'commit']) {
    throw new RuntimeException('Transaction must commit and preserve return values.');
}
$pdo->events = [];
$failure = new RuntimeException('Expected failure');
try {
    $work->run(function () use ($failure) { throw $failure; });
    throw new LogicException('Failure was swallowed.');
} catch (RuntimeException $error) {
    if ($error !== $failure) throw $error;
}
if ($pdo->events !== ['begin', 'rollback']) throw new LogicException('Missing rollback.');

$pdo->events = [];
$work->run(function () use ($work, $failure): void {
    try {
        $work->run(function () use ($failure) { throw $failure; });
        throw new LogicException('Nested failure was swallowed.');
    } catch (RuntimeException $error) {
        if ($error !== $failure) throw $error;
    }
});
if ($pdo->events !== ['begin', 'SAVEPOINT caseflow_uow_4', 'ROLLBACK TO SAVEPOINT caseflow_uow_4', 'RELEASE SAVEPOINT caseflow_uow_4', 'commit']) {
    throw new LogicException('Nested failure must roll back to its savepoint without rolling back the parent.');
}
echo "Passed transaction control checks (PDO probe; not database integration).\n";
