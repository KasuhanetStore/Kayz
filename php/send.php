<?php

$botToken = "8812331448:AAFf34rzhrwljZbB_j2UKERiLYr-lE-sLrQ";
$chatID = "6482299038";

$message = $_POST['message'];

$url = "https://api.telegram.org/bot$botToken/sendMessage";

$data = [
'chat_id' => $chatID,
'text' => $message
];

$options = [
'http' => [
'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
'method'  => 'POST',
'content' => http_build_query($data)
]
];

$context = stream_context_create($options);

file_get_contents($url, false, $context);

echo "success";

?>

<?php

$file = "messages.json";

$message = $_POST['message'];

$data = [];

if(file_exists($file)){
$data = json_decode(file_get_contents($file), true);
}

$data[] = [
"type" => "user",
"text" => $message
];

file_put_contents($file, json_encode($data));

echo "ok";

?>

