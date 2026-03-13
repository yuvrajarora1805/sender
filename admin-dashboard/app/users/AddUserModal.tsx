"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createUser } from "@/lib/actions";
import { toast } from "@/components/Toast";

export default function AddUserModal({ plans }: { plans: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await createUser(new FormData(e.currentTarget));
    toast("Account created successfully");
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2">
        <Plus size={16} /> New User
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-semibold text-lg text-white">Create Account</h2>
              <button 
                onClick={() => setOpen(false)} 
                className="text-[#a1a1aa] hover:bg-[#262626] hover:text-white p-1 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Username</label>
                <input 
                  name="username" type="text" required 
                  className="input-ring w-full px-3 py-2 text-sm" 
                  placeholder="e.g. john_doe" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Password</label>
                <input 
                  name="password" type="password" required 
                  className="input-ring w-full px-3 py-2 text-sm" 
                  placeholder="••••••••" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Subscription Tier</label>
                <select 
                  name="plan_id" 
                  className="input-ring w-full px-3 py-2 text-sm appearance-none cursor-pointer" 
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-black text-white py-1">
                      {p.name} — {p.daily_limit.toLocaleString()} / day
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex justify-center text-[13px]">
                  {loading ? "Allocating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
