import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, hwid } = body;

  if (!username || !hwid) {
    return NextResponse.json(
      { status: "error", message: "Missing username or HWID" },
      { status: 400 }
    );
  }

  const [rows]: any = await pool.query(
    `SELECT u.*, p.name as plan_name, p.daily_limit as plan_limit, p.monthly_limit
     FROM users u 
     JOIN plans p ON u.plan_id = p.id 
     WHERE u.username = ?`,
    [username]
  );

  const user = rows[0];

  if (!user) {
    return NextResponse.json({ status: "invalid", message: "User not found" }, { status: 404 });
  }

  if (!user.is_active) {
    return NextResponse.json({ status: "revoked", message: "Account deactivated" }, { status: 403 });
  }

  if (user.hwid !== hwid) {
    return NextResponse.json({ status: "hwid_mismatch", message: "HWID mismatch" }, { status: 403 });
  }

  if (new Date(user.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired", message: "Subscription expired" }, { status: 403 });
  }

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
