<?php
declare(strict_types=1);

namespace CaseFlow\Controllers;

use CaseFlow\Services\AttachmentService;

final class AttachmentController
{
    private AttachmentService $service;

    public function __construct(AttachmentService $service)
    {
        $this->service = $service;
    }

    public function avatar(array $input, array $params, ?array $user)
    {
        return $this->service->upload($user, null, $_FILES['file'] ?? null);
    }

    public function upload(array $input, array $params, ?array $user)
    {
        return $this->service->upload($user, $params['id'], $_FILES['file'] ?? null);
    }

    public function download(array $input, array $params, ?array $user)
    {
        $file = $this->service->download($params['id'], $user);
        header('Content-Type: ' . $file['mime']);
        header('Content-Disposition: ' . ($file['caseId'] ? 'attachment' : 'inline') . "; filename*=UTF-8''" . rawurlencode($file['name']));
        header('Content-Length: ' . $file['size']);
        echo $file['content'];
        return null;
    }

}
