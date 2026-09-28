<?php
declare(strict_types=1);

namespace CaseFlow\Services;

use CaseFlow\DataAccess\Contracts\AttachmentRepository;
use CaseFlow\DataAccess\Contracts\UnitOfWork;
use CaseFlow\DataAccess\Contracts\UserRepository;
use CaseFlow\Http\HttpError;
use CaseFlow\Support\Id;
use CaseFlow\Validation\UploadValidator;

final class AttachmentService
{
    private AttachmentRepository $attachments;
    private UserRepository $users;
    private CaseService $cases;
    private UnitOfWork $transactions;

    public function __construct(AttachmentRepository $attachments, UserRepository $users, CaseService $cases, UnitOfWork $transactions)
    {
        $this->attachments = $attachments;
        $this->users = $users;
        $this->cases = $cases;
        $this->transactions = $transactions;
    }

    public function upload(array $user, ?string $caseId, ?array $file): array
    {
        if ($caseId) $this->cases->find($caseId);
        $data = UploadValidator::validate($file, $caseId !== null);
        $data += ['id' => Id::make('FILE'), 'caseId' => $caseId, 'userId' => $user['id'], 'date' => gmdate('Y-m-d H:i:s')];
        $this->transactions->run(function () use ($data, $caseId, $user): void {
            $this->attachments->add($data);
            if ($caseId) {
                $this->cases->activity($caseId, 'note', 'Attachment added: ' . $data['name'], $user['name']);
            } else {
                $user['avatarId'] = $data['id'];
                $this->users->save($user);
            }
        });
        return ['id' => $data['id'], 'name' => $data['name']];
    }

    public function download(string $id, array $user): array
    {
        $file = $this->attachments->find($id);
        if (!$file || (!$file['caseId'] && $file['userId'] !== $user['id'])) throw new HttpError(404, 'File not found.');
        return $file;
    }
}
