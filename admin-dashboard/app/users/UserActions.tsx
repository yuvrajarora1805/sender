"use client";

import { useState } from "react";
import { MonitorX, Trash, ShieldBan, ShieldCheck } from "lucide-react";
import { resetHWID, deleteUser, toggleUserStatus } from "@/lib/actions";
import { toast } from "@/components/Toast";
import EditUserModal from "./EditUserModal";

export default function UserActions({ user, plans }: { user: any; plans: any[] }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <EditUserModal user={user} plans={plans} />

      <button
        onClick={async () => {
          if (confirm(`Reset device link for ${user.username}?`)) {
            setLoading(true); await resetHWID(user.id);
            toast(`Device link reset for ${user.username}`); setLoading(false);
          }
        }}
        disabled={loading}
        title="Reset Device Link (HWID)"
        className="p-1.5 text-[#a1a1aa] hover:text-white rounded-md hover:bg-[#262626] transition-colors"
      ><MonitorX size={15} strokeWidth={2} /></button>

      <button
        onClick={async () => {
          setLoading(true); await toggleUserStatus(user.id, user.is_active);
          toast(user.is_active ? `Account suspended` : `Account restored`);
          setLoading(false);
        }}
        disabled={loading}
        title={user.is_active ? "Suspend Account" : "Restore Account"}
        className={`p-1.5 rounded-md hover:bg-[#262626] transition-colors ${
          user.is_active ? 'text-[#a1a1aa] hover:text-orange-400' : 'text-[#a1a1aa] hover:text-green-400'
        }`}
      >
        {user.is_active ? <ShieldBan size={15} strokeWidth={2} /> : <ShieldCheck size={15} strokeWidth={2} />}
      </button>

      <button
        onClick={async () => {
          if (confirm(`Permanently delete account ${user.username}?`)) {
            setLoading(true); await deleteUser(user.id);
            toast(`Account deleted`, "error"); setLoading(false);
          }
        }}
        disabled={loading} title="Delete Account"
        className="p-1.5 text-[#a1a1aa] hover:text-red-500 rounded-md hover:bg-[#262626] transition-colors"
      ><Trash size={15} strokeWidth={2} /></button>
    </div>
  );
}
