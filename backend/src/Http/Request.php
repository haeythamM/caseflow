<?php
declare(strict_types=1);

namespace CaseFlow\Http;

final class Request
{
    public static function input(): array
    {
        if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) return [];
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 65536) throw new HttpError(413, 'Request is too large.');
        $raw = file_get_contents('php://input', false, null, 0, 65537);
        if (strlen($raw) > 65536) throw new HttpError(413, 'Request is too large.');
        try {
            $object = json_decode($raw, false, 32, JSON_THROW_ON_ERROR);
            if (!is_object($object)) throw new HttpError(400, 'Expected a JSON object.');
            return json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new HttpError(400, 'Invalid JSON.');
        }
    }
}
