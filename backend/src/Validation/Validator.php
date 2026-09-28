<?php
declare(strict_types=1);
namespace CaseFlow\Validation;

use CaseFlow\Http\HttpError;

final class Validator
{
    public static function fields(array $input, array $required, array $optional = []): array
    {
        $result = [];
        $errors = [];
        foreach (array_merge($required, $optional) as $key) {
            $value = $input[$key] ?? '';
            if (!is_string($value)) { $errors[$key] = 'Must be text.'; continue; }
            $value = trim($value);
            // Match the schema so valid-looking input cannot become a SQL error.
            $limits = ['firstName' => 100, 'lastName' => 100, 'name' => 150,
                'phone' => 50, 'city' => 100, 'province' => 100, 'country' => 100,
                'postalCode' => 30, 'customerId' => 32, 'caseId' => 32,
                'assignedAgent' => 150];
            $max = $limits[$key] ?? (in_array($key, ['body', 'description', 'notes', 'text'], true) ? 10000 : 255);
            if (in_array($key, $required, true) && $value === '') $errors[$key] = 'This field is required.';
            if (mb_strlen($value) > $max) $errors[$key] = "Maximum {$max} characters.";
            $result[$key] = $value;
        }
        if (isset($result['email']) && !filter_var($result['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
        if ($errors) throw new HttpError(422, 'Please check the form.', $errors);
        return $result;
    }

    public static function choice(string $field, string $value, array $choices): void
    {
        if (!in_array($value, $choices, true)) throw new HttpError(422, 'Please check the form.', [$field => 'Choose a valid value.']);
    }

    public static function password(string $password): void
    {
        if (strlen($password) < 12 || strlen($password) > 72) throw new HttpError(422, 'Password must contain 12–72 bytes.');
    }
}
