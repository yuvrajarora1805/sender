<?php
require_once 'config.php';

$username = $_POST['username'] ?? '';
$hwid = $_POST['hwid'] ?? '';
$count = (int)($_POST['count'] ?? 0);

if (empty($username) || empty($hwid) || $count <= 0) {
    response(['status' => 'error', 'message' => 'Invalid parameters'], 400);
}

// Validate user session
$stmt = $pdo->prepare("SELECT id, hwid, is_active, expires_at FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || $user['hwid'] !== $hwid || $user['is_active'] == 0 || new DateTime($user['expires_at']) < new DateTime()) {
    response(['status' => 'error', 'message' => 'Unauthorized usage report'], 403);
}

$today = date('Y-m-d');
// Log usage
$sql = "INSERT INTO usage_logs_v2 (user_id, log_date, messages_sent) 
        VALUES (:id, :date, :count) 
        ON DUPLICATE KEY UPDATE messages_sent = messages_sent + :count";

$stmt = $pdo->prepare($sql);
$stmt->execute(['id' => $user['id'], 'date' => $today, 'count' => $count]);

response(['status' => 'success', 'message' => 'Usage updated']);
?>
