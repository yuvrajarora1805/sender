import pool from "@/lib/db";
import PlanCard from "./PlanCard";
import AddPlanModal from "./AddPlanModal";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [plans]: any = await pool.query("SELECT * FROM plans ORDER BY id ASC");

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Subscription Plans</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">{plans.length} configured tiers</p>
        </div>
        <AddPlanModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan: any, i: number) => (
          <PlanCard key={plan.id} plan={plan} featured={i === 2} />
        ))}
      </div>
    </div>
  );
}
