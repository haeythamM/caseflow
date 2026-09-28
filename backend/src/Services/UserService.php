<?php

declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\DataAccess\Contracts\AttachmentRepository;
use CaseFlow\Http\HttpError;

final class UserService
{
    private UserRepository $users;
    private AttachmentRepository $attachments;

    public function __construct(UserRepository $users, AttachmentRepository $attachments)
    {
        $this->users = $users;
        $this->attachments = $attachments;
    }

    public function avatar(string $id, array $currentUser): array
    {
        $target = $this->users->find($id);
        if (!$target) throw new HttpError(404, 'User not found.');
        if (($currentUser['role'] ?? '') !== 'Admin'
            && ($currentUser['id'] ?? null) !== $target['id']) {
            throw new HttpError(403, 'You may only view your own avatar.');
        }

        $avatarId = $target['avatarId'] ?? null;
        $file = $avatarId ? $this->attachments->find($avatarId) : null;
        // Only the current profile image, never a case file or another owner's file.
        if (!$file || $file['caseId'] !== null || $file['userId'] !== $target['id']
            || !in_array($file['mime'], ['image/png', 'image/jpeg', 'image/gif'], true)) {
            throw new HttpError(404, 'Avatar not found.');
        }
        return $file;
    }

    public function all(array $currentUser): array
    {
        if (($currentUser['role'] ?? '') !== 'Admin') {
            throw new HttpError(
                403,
                'Administrator access is required.'
            );
        }

        return $this->users->all();
    }
}
