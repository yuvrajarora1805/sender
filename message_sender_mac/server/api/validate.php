<?php
require_once 'config.php';

$username = $_POST['username'] ?? '';
$hwid = $_POST['hwid'] ?? '';

if (empty($username) || empty($hwid)) {
    response(['status' => 'error', 'message' => 'Missing username or HWID'], 400);
}

// Check user status
$stmt = $pdo->prepare("
    SELECT u.*, p.name as plan_name, p.daily_limit, p.monthly_limit 
    FROM users u 
    JOIN plans p ON u.plan_id = p.id 
    WHERE u.username = ?
");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    response(['status' => 'invalid', 'message' => 'User not found'], 404);
}

if ($user['is_active'] == 0) {
    response(['status' => 'revoked', 'message' => 'Account deactivated'], 403);
}

if ($user['hwid'] !== $hwid) {
    response(['status' => 'hwid_mismatch', 'message' => 'HWID mismatch'], 403);
}

// Expiry check
if (new DateTime($user['expires_at']) < new DateTime()) {
    response(['status' => 'expired', 'message' => 'Subscription expired'], 403);
}

// Get usage for today
$today = date('Y-m-d');
$usage_stmt = $pdo->prepare("SELECT messages_sent FROM usage_logs_v2 WHERE user_id = ? AND log_date = ?");
$usage_stmt->execute([$user['id'], $today]);
$usage = $usage_stmt->fetch();
$sent_today = $usage ? $usage['messages_sent'] : 0;

response([
    'status' => 'success',
    'username' => $user['username'],
    'plan' => $user['plan_name'],
    'daily_limit' => (int)$user['daily_limit'],
    'sent_today' => (int)$sent_today,
    'expires_at' => $user['expires_at']
]);
?>
