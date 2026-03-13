"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { updateUser } from "@/lib/actions";
import { toast } from "@/components/Toast";

export default function EditUserModal({ user, plans }: { user: any; plans: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await updateUser(user.id, new FormData(e.currentTarget));
    toast(`Configuration updated for ${user.username}`);
    setLoading(false);
    setOpen(false);
  }

  // Format datetime-local string (YYYY-MM-DDTHH:mm)
  const defaultDate = new Date(user.expires_at).toISOString().slice(0, 16);

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        title="Edit Configuration"
        className="p-1.5 text-[#a1a1aa] hover:text-white rounded-md hover:bg-[#262626] transition-colors"
      >
        <Settings2 size={15} strokeWidth={2} />
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-semibold text-lg text-white">Edit Account</h2>
                <p className="text-xs text-[#a1a1aa] mt-1">{user.username} <span className="opacity-50">#{user.id}</span></p>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="text-[#a1a1aa] hover:bg-[#262626] hover:text-white p-1 rounded-md transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Subscription Tier</label>
                <select 
                  name="plan_id" 
                  defaultValue={user.plan_id}
                  className="input-ring w-full px-3 py-2 text-sm appearance-none cursor-pointer" 
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-black text-white py-1">
                      {p.name} — {p.daily_limit.toLocaleString()} / day
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#71717a]">Changing the plan changes default limits.</p>
              </div>

              <div className="space-y-2 relative">
                <label className="text-[13px] font-medium text-[#ededed]">Custom Daily Limit Override</label>
                <input 
                  name="custom_daily_limit" 
                  type="number" 
                  defaultValue={user.custom_daily_limit || ""}
                  className="input-ring w-full px-3 py-2 text-sm" 
                  placeholder="e.g. 5000 (Leave empty for plan default)" 
                />
                <p className="text-[11px] text-[#71717a]">Overrides the plan limit for this specific user.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Expiration & Renewal Date</label>
                <input 
                  name="expires_at" 
                  type="datetime-local" 
                  required 
                  defaultValue={defaultDate}
                  className="input-ring w-full px-3 py-2 text-sm [color-scheme:dark]" 
                />
                 <p className="text-[11px] text-[#71717a]">Modify this to extend or renew the subscription.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setOpen(false)} className="btn-outline flex-1 py-2 text-[13px]">
                   Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-2 text-[13px]">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
