<?php
require_once 'config.php';

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$hwid = $_POST['hwid'] ?? '';

if (empty($username) || empty($password) || empty($hwid)) {
    response(['status' => 'error', 'message' => 'Missing username, password, or HWID'], 400);
}

// Fetch user
$stmt = $pdo->prepare("
    SELECT u.*, p.name as plan_name, p.daily_limit, p.monthly_limit, p.duration_days
    FROM users u 
    JOIN plans p ON u.plan_id = p.id 
    WHERE u.username = ?
");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    response(['status' => 'invalid', 'message' => 'Invalid username or password'], 401);
}

if ($user['is_active'] == 0) {
    response(['status' => 'revoked', 'message' => 'Account has been deactivated'], 403);
}

// HWID binding
if (empty($user['hwid'])) {
    // First login activation
    $expires_at = date('Y-m-d H:i:s', strtotime("+{$user['duration_days']} days"));
    $update = $pdo->prepare("UPDATE users SET hwid = ?, activated_at = NOW(), expires_at = ? WHERE id = ?");
    $update->execute([$hwid, $expires_at, $user['id']]);
    $user['hwid'] = $hwid;
    $user['expires_at'] = $expires_at;
} elseif ($user['hwid'] !== $hwid) {
    response(['status' => 'hwid_mismatch', 'message' => 'Account is tied to another machine'], 403);
}

// Expiry check
if (new DateTime($user['expires_at']) < new DateTime()) {
    response(['status' => 'expired', 'message' => 'Subscription has expired'], 403);
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
