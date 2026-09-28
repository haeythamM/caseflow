<?php
declare(strict_types=1);

namespace CaseFlow\Validation;

use CaseFlow\Http\HttpError;

final class UploadValidator
{
    public static function validate(?array $file, bool $isCaseAttachment): array
    {
        if (!$file || ($file['error'] ?? null) !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_string($file['name'] ?? null)) throw new HttpError(422, 'Upload failed. Choose a file within the size limit.');
        if (!is_uploaded_file($file['tmp_name'])) throw new HttpError(422, 'Invalid upload.');
        $size = filesize($file['tmp_name']);
        $limit = $isCaseAttachment ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
        if (!$size || $size > $limit) throw new HttpError(422, 'File exceeds the size limit or is empty.');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $allowed = $isCaseAttachment ? ['application/pdf', 'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'] : ['image/png', 'image/jpeg', 'image/gif'];
        if (!in_array($mime, $allowed, true)) throw new HttpError(422, 'File type is not allowed.');
        return [
            'name' => mb_substr(basename(str_replace('\\', '/', $file['name'])), 0, 200),
            'mime' => $mime, 'size' => $size, 'content' => file_get_contents($file['tmp_name']),
        ];
    }
}
