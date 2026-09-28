<?php
declare(strict_types=1);

// Included by run.php; repository spies verify the narrow lookup without a DB.
$avatarUsers = new class implements \CaseFlow\DataAccess\Contracts\UserRepository {
    public array $rows = [
        '1' => ['id' => '1', 'avatarId' => 'FILE-avatar'],
        '2' => ['id' => '2', 'avatarId' => null],
        '3' => ['id' => '3', 'avatarId' => 'FILE-missing'],
    ];
    public function find(string $id): ?array { return $this->rows[$id] ?? null; }
    public function findByEmail(string $email): ?array { throw new LogicException('Unexpected lookup'); }
    public function all(): array { throw new LogicException('Unexpected listing'); }
    public function emailExists(string $email, ?string $exceptId = null): bool { return false; }
    public function agentExists(string $name): bool { return false; }
    public function agentNames(): array { return []; }
    public function save(array $user): void { throw new LogicException('Unexpected write'); }
};
$avatarFiles = new class implements \CaseFlow\DataAccess\Contracts\AttachmentRepository {
    public array $lookups = [];
    public array $file = ['id' => 'FILE-avatar', 'caseId' => null, 'userId' => '1', 'mime' => 'image/png', 'content' => "\x89PNG\0", 'name' => 'avatar.png'];
    public function allMetadata(): array { throw new LogicException('Unexpected listing'); }
    public function find(string $id): ?array {
        $this->lookups[] = $id;
        return $id === $this->file['id'] ? $this->file : null;
    }
    public function add(array $attachment): void { throw new LogicException('Unexpected write'); }
};
$avatars = new \CaseFlow\Services\UserService($avatarUsers, $avatarFiles);
$admin = ['id' => '2', 'role' => 'Admin'];
$owner = ['id' => '1', 'role' => 'Support Agent'];
check($avatars->avatar('1', $admin) === $avatarFiles->file, 'Admin reads another user avatar');
check($avatars->avatar('1', $owner) === $avatarFiles->file, 'User reads own avatar');
check($avatarFiles->lookups === ['FILE-avatar', 'FILE-avatar'], 'Only referenced avatar is loaded');
rejects(fn() => $avatars->avatar('1', ['id' => '2', 'role' => 'Support Agent']), 403);
rejects(fn() => $avatars->avatar('2', $admin), 404);
rejects(fn() => $avatars->avatar('missing', $admin), 404);
rejects(fn() => $avatars->avatar('FILE-avatar', $admin), 404);
check(count($avatarFiles->lookups) === 2, 'Denied/missing users do not load attachments');
rejects(fn() => $avatars->avatar('3', $admin), 404);
foreach (['caseId' => 'CASE-unrelated', 'userId' => '2', 'mime' => 'application/pdf'] as $field => $value) {
    $previous = $avatarFiles->file[$field];
    $avatarFiles->file[$field] = $value;
    rejects(fn() => $avatars->avatar('1', $admin), 404);
    $avatarFiles->file[$field] = $previous;
}
