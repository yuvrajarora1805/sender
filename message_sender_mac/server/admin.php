<?php
require_once 'api/config.php';

session_start();

// Simple auth for admin panel
$admin_user = 'admin';
$admin_pass = 'admin123';

if (!isset($_SESSION['loggedin'])) {
    if (isset($_POST['login'])) {
        if ($_POST['username'] === $admin_user && $_POST['password'] === $admin_pass) {
            $_SESSION['loggedin'] = true;
        } else {
            $error = "Invalid credentials";
        }
    }
}

if (!isset($_SESSION['loggedin'])) {
?>
<!DOCTYPE html>
<html>
<head>
    <title>Admin Login</title>
    <style>
        body { font-family: sans-serif; background: #0a0a0f; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }
        form { background: #12121a; padding: 30px; border-radius: 10px; border: 1px solid #333; }
        input { display: block; width: 100%; margin: 10px 0; padding: 10px; background: #222; border: 1px solid #444; color: #fff; }
        button { width: 100%; padding: 10px; background: #25D366; border: none; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <form method="POST">
        <h2>Admin Login</h2>
        <?php if(isset($error)) echo "<p style='color:red'>$error</p>"; ?>
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit" name="login">Login</button>
    </form>
</body>
</html>
<?php
    exit;
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: admin.php");
    exit;
}

// Handle Add User
if (isset($_POST['add_user'])) {
    $uname = trim($_POST['new_username']);
    $upass = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
    $plan_id = $_POST['plan_id'];
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, plan_id) VALUES (?, ?, ?)");
        $stmt->execute([$uname, $upass, $plan_id]);
        $msg = "User Created: $uname";
    } catch (PDOException $e) {
        $msg = "Error: User already exists";
    }
}

// Handle Reset HWID
if (isset($_GET['reset_hwid'])) {
    $uid = $_GET['reset_hwid'];
    $pdo->prepare("UPDATE users SET hwid = NULL WHERE id = ?")->execute([$uid]);
    $msg = "HWID Reset Successful";
}

// Handle Deactivate/Activate
if (isset($_GET['toggle_active'])) {
    $uid = $_GET['toggle_active'];
    $pdo->prepare("UPDATE users SET is_active = NOT is_active WHERE id = ?")->execute([$uid]);
}

// Fetch Data
$users = $pdo->query("SELECT u.*, p.name as plan_name FROM users u JOIN plans p ON u.plan_id = p.id ORDER BY u.id DESC")->fetchAll();
$plans = $pdo->query("SELECT * FROM plans")->fetchAll();
$logs = $pdo->query("SELECT v.*, u.username FROM usage_logs_v2 v JOIN users u ON v.user_id = u.id ORDER BY v.updated_at DESC LIMIT 50")->fetchAll();

?>
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Sender Admin Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f8f9fa; }
        .sidebar { width: 260px; background: #2c3e50; color: #ecf0f1; height: 100vh; position: fixed; padding: 25px; box-sizing: border-box; }
        .sidebar h2 { color: #25D366; margin-bottom: 30px; font-size: 1.5rem; }
        .sidebar a { color: #bdc3c7; text-decoration: none; display: block; padding: 10px 0; transition: 0.3s; }
        .sidebar a:hover { color: #fff; }
        .main { margin-left: 260px; padding: 40px; }
        .card { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .card h3 { margin-top: 0; color: #34495e; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; background: #fff; }
        th, td { padding: 15px; border-bottom: 1px solid #edf2f7; text-align: left; }
        th { background: #f7fafc; color: #4a5568; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
        tr:hover { background: #f8fbff; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; }
        .status-active { background: #c6f6d5; color: #22543d; }
        .status-inactive { background: #fed7d7; color: #822727; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.2s; }
        .btn-primary { background: #25D366; color: #fff; }
        .btn-outline { background: transparent; border: 1px solid #cbd5e0; color: #4a5568; }
        .btn-outline:hover { background: #edf2f7; }
        input, select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-right: 10px; outline: none; }
        .msg { background: #ebf8ff; color: #2c5282; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3182ce; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>WA Admin</h2>
        <p style="opacity:0.7">Control Center</p>
        <hr style="border:0; border-top:1px solid #455a64; margin: 20px 0">
        <a href="admin.php">Dashboard</a>
        <a href="?logout=1" style="color:#e53e3e; margin-top: 20px">Logout</a>
    </div>

    <div class="main">
        <h1>User Management</h1>
        
        <?php if(isset($msg)): ?>
            <div class="msg"><?= $msg ?></div>
        <?php endif; ?>

        <div class="card">
            <h3>Add New User Account</h3>
            <form method="POST">
                <input type="text" name="new_username" placeholder="Username" required>
                <input type="password" name="new_password" placeholder="Password" required>
                <select name="plan_id" required>
                    <?php foreach($plans as $p): ?>
                        <option value="<?= $p['id'] ?>"><?= $p['name'] ?> (<?= $p['daily_limit'] ?>/day)</option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" name="add_user" class="btn btn-primary">Create Account</button>
            </form>
        </div>

        <div class="card">
            <h3>Registered Users</h3>
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>HWID Status</th>
                        <th>Expiry</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($users as $u): ?>
                    <tr>
                        <td><b><?= htmlspecialchars($u['username']) ?></b></td>
                        <td><?= $u['plan_name'] ?></td>
                        <td>
                            <span class="status-badge <?= $u['is_active'] ? 'status-active' : 'status-inactive' ?>">
                                <?= $u['is_active'] ? 'ACTIVE' : 'DEACTIVATED' ?>
                            </span>
                        </td>
                        <td>
                            <?php if($u['hwid']): ?>
                                <span title="<?= $u['hwid'] ?>">Locked ✅</span>
                            <?php else: ?>
                                <span style="color:#a0aec0">Not Linked</span>
                            <?php endif; ?>
                        </td>
                        <td><?= $u['expires_at'] ? date('M j, Y', strtotime($u['expires_at'])) : '-' ?></td>
                        <td>
                            <a href="?toggle_active=<?= $u['id'] ?>" class="btn btn-outline" style="text-decoration:none">
                                <?= $u['is_active'] ? 'Deactivate' : 'Activate' ?>
                            </a>
                            <a href="?reset_hwid=<?= $u['id'] ?>" class="btn btn-outline" style="text-decoration:none; margin-left:5px" onclick="return confirm('Allow user to login from a new PC?')">
                                Reset HWID
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h3>Recent Message Activity</h3>
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Date</th>
                        <th>Messages Sent</th>
                        <th>Last Active</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($logs as $log): ?>
                    <tr>
                        <td><b><?= htmlspecialchars($log['username']) ?></b></td>
                        <td><?= $log['log_date'] ?></td>
                        <td><?= $log['messages_sent'] ?></td>
                        <td><?= date('H:i:s', strtotime($log['updated_at'])) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
