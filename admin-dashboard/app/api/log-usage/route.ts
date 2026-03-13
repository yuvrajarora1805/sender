import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, hwid, count } = body;

  if (!username || !hwid || !count || count <= 0) {
    return NextResponse.json(
      { status: "error", message: "Invalid parameters" },
      { status: 400 }
    );
  }

  // Validate user session
  const [rows]: any = await pool.query(
    "SELECT id, hwid, is_active, expires_at FROM users WHERE username = ?",
    [username]
  );
  const user = rows[0];

  if (
    !user ||
    user.hwid !== hwid ||
    !user.is_active ||
    new Date(user.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized usage report" },
      { status: 403 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  await pool.query(
    `INSERT INTO usage_logs_v2 (user_id, log_date, messages_sent) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE messages_sent = messages_sent + ?`,
    [user.id, today, count, count]
  );

  return NextResponse.json({ status: "success", message: "Usage updated" });
}
