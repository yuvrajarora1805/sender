"use server";

import pool from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const plan_id = formData.get("plan_id") as string;

  const password_hash = await bcrypt.hash(password, 10);
  
  await pool.query(
    "INSERT INTO users (username, password_hash, plan_id) VALUES (?, ?, ?)",
    [username, password_hash, plan_id]
  );
  
  revalidatePath("/users");
}

export async function updateUser(id: number, formData: FormData) {
  const plan_id = formData.get("plan_id") as string;
  const expires_at = formData.get("expires_at") as string;
  const customLimitRaw = formData.get("custom_daily_limit") as string;
  const custom_daily_limit = customLimitRaw ? parseInt(customLimitRaw) : null;

  await pool.query(
    "UPDATE users SET plan_id = ?, expires_at = ?, custom_daily_limit = ? WHERE id = ?",
    [plan_id, expires_at, custom_daily_limit, id]
  );
  
  revalidatePath("/users");
}

export async function deleteUser(id: number) {
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
  revalidatePath("/users");
}

export async function resetHWID(id: number) {
  await pool.query("UPDATE users SET hwid = NULL WHERE id = ?", [id]);
  revalidatePath("/users");
}

export async function toggleUserStatus(id: number, currentStatus: boolean) {
  await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [!currentStatus, id]);
  revalidatePath("/users");
}

export async function createPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const daily_limit = formData.get("daily_limit") as string;
  const monthly_limit = formData.get("monthly_limit") as string;
  const duration_days = formData.get("duration_days") as string;

  await pool.query(
    "INSERT INTO plans (name, daily_limit, monthly_limit, duration_days) VALUES (?, ?, ?, ?)",
    [name, daily_limit, monthly_limit, duration_days]
  );

  revalidatePath("/plans");
}

export async function deletePlan(id: number) {
  await pool.query("DELETE FROM plans WHERE id = ?", [id]);
  revalidatePath("/plans");
}
