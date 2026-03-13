"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createPlan } from "@/lib/actions";
import { toast } from "@/components/Toast";

export default function AddPlanModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await createPlan(new FormData(e.currentTarget));
    toast("Plan tier established");
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2">
        <Plus size={16} /> New Tier
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-semibold text-lg text-white">Establish Tier</h2>
              <button 
                onClick={() => setOpen(false)} 
                className="text-[#a1a1aa] hover:bg-[#262626] hover:text-white p-1 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Tier Designation</label>
                <input name="name" required className="input-ring w-full px-3 py-2 text-sm" placeholder="e.g. Enterprise" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[#ededed]">Daily Limit</label>
                  <input name="daily_limit" type="number" required className="input-ring w-full px-3 py-2 text-sm" placeholder="500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[#ededed]">Monthly Limit</label>
                  <input name="monthly_limit" type="number" required className="input-ring w-full px-3 py-2 text-sm" placeholder="10000" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Validity Runtime (Days)</label>
                <input name="duration_days" type="number" required className="input-ring w-full px-3 py-2 text-sm" placeholder="30" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex justify-center text-[13px]">
                  {loading ? "Allocating..." : "Create Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
