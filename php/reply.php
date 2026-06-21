<?php

$file = "messages.json";

$reply = $_POST['reply'];

$data = [];

if(file_exists($file)){
$data = json_decode(file_get_contents($file), true);
}

$data[] = [
"type" => "admin",
"text" => $reply
];

file_put_contents($file, json_encode($data));

echo "reply sent";

?>
