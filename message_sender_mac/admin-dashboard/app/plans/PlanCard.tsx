"use client";

import { Trash2 } from "lucide-react";
import { deletePlan } from "@/lib/actions";
import { toast } from "@/components/Toast";

export default function PlanCard({ plan, featured }: { plan: any; featured?: boolean }) {
  return (
    <div className={`surface surface-hover p-6 relative flex flex-col ${featured ? 'border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' : ''}`}>
      {featured && (
        <span className="absolute top-4 right-4 bg-blue-500 text-black text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
          Featured
        </span>
      )}

      <h3 className="font-semibold text-white mb-2">{plan.name}</h3>
      <div className="flex items-baseline gap-1.5 mb-8">
        <span className="text-4xl font-bold tracking-tight text-white">
          {plan.daily_limit.toLocaleString()}
        </span>
        <span className="text-[11px] font-medium text-[#71717a] uppercase tracking-widest">
          / day
        </span>
      </div>

      <div className="space-y-4 mb-8 flex-1">
        {[
          ["Monthly Volume", plan.monthly_limit.toLocaleString()],
          ["License Duration", `${plan.duration_days} Days`],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between items-center border-b border-[#262626] pb-3 last:border-0 last:pb-0">
            <span className="text-[13px] text-[#a1a1aa]">{label}</span>
            <span className="text-[13px] font-medium text-white">{val}</span>
          </div>
        ))}
      </div>

      <button
        onClick={async () => {
          if (confirm(`Remove the tier "${plan.name}"?`)) {
            await deletePlan(plan.id);
            toast(`Tier deleted`, "error");
          }
        }}
        className="w-full text-[13px] py-2 rounded-md font-medium text-[#71717a] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
      >
        <Trash2 size={14} /> Remove Tier
      </button>
    </div>
  );
}
