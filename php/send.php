<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Method not allowed.']);
}

$message = trim((string)($_POST['message'] ?? ''));
if ($message === '' || mb_strlen($message) > 4000) {
    respond(400, ['success' => false, 'error' => 'Message is required and must be under 4000 characters.']);
}

$botToken = getenv('TELEGRAM_BOT_TOKEN') ?: '';
$chatId = getenv('TELEGRAM_CHAT_ID') ?: '';
if ($botToken === '' || $chatId === '') {
    error_log('Telegram integration is not configured: missing server environment variables.');
    respond(503, ['success' => false, 'error' => 'Messaging service is not configured.']);
}

$url = 'https://api.telegram.org/bot' . rawurlencode($botToken) . '/sendMessage';
$payload = http_build_query(['chat_id' => $chatId, 'text' => $message]);
$options = [
    'http' => [
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => $payload,
        'timeout' => 10,
        'ignore_errors' => true
    ]
];

$response = @file_get_contents($url, false, stream_context_create($options));
if ($response === false) {
    error_log('Telegram message delivery failed.');
    respond(502, ['success' => false, 'error' => 'Message delivery failed.']);
}

$result = json_decode($response, true);
if (!is_array($result) || ($result['ok'] ?? false) !== true) {
    error_log('Telegram API returned an unsuccessful response.');
    respond(502, ['success' => false, 'error' => 'Message delivery failed.']);
}

respond(200, ['success' => true]);
?>