import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password, hwid } = body;

  if (!username || !password || !hwid) {
    return NextResponse.json(
      { status: "error", message: "Missing username, password, or HWID" },
      { status: 400 }
    );
  }

  // Fetch user
  const [rows]: any = await pool.query(
    `SELECT u.*, p.name as plan_name, p.daily_limit as plan_limit, p.monthly_limit, p.duration_days
     FROM users u 
     JOIN plans p ON u.plan_id = p.id 
     WHERE u.username = ?`,
    [username]
  );

  const user = rows[0];

  if (!user) {
    return NextResponse.json(
      { status: "invalid", message: "Invalid username or password" },
      { status: 401 }
    );
  }

  // Verify password (supports both bcryptjs and PHP password_hash)
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    return NextResponse.json(
      { status: "invalid", message: "Invalid username or password" },
      { status: 401 }
    );
  }

  if (!user.is_active) {
    return NextResponse.json(
      { status: "revoked", message: "Account has been deactivated" },
      { status: 403 }
    );
  }

  // HWID binding
  if (!user.hwid) {
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + user.duration_days);
    await pool.query(
      "UPDATE users SET hwid = ?, activated_at = NOW(), expires_at = ? WHERE id = ?",
      [hwid, expires_at.toISOString().slice(0, 19).replace("T", " "), user.id]
    );
    user.hwid = hwid;
    user.expires_at = expires_at;
  } else if (user.hwid !== hwid) {
    return NextResponse.json(
      { status: "hwid_mismatch", message: "Account is tied to another machine" },
      { status: 403 }
    );
  }

  // Expiry check
  if (new Date(user.expires_at) < new Date()) {
    return NextResponse.json(
      { status: "expired", message: "Subscription has expired" },
      { status: 403 }
    );
  }

  // Get today's usage
  const today = new Date().toISOString().slice(0, 10);
  const [usageRows]: any = await pool.query(
    "SELECT messages_sent FROM usage_logs_v2 WHERE user_id = ? AND log_date = ?",
    [user.id, today]
  );
  const sent_today = usageRows[0]?.messages_sent || 0;

  return NextResponse.json({
    status: "success",
    username: user.username,
    plan: user.plan_name,
    daily_limit: user.custom_daily_limit ?? user.plan_limit,
    sent_today,
    expires_at: user.expires_at,
  });
}
