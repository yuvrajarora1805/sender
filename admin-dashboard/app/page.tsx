import pool from "@/lib/db";
import { Users, Zap, MessageSquare, TrendingUp, CheckCircle2, ShieldCheck } from "lucide-react";
import UsageChart from "@/components/UsageChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [userCountRows]: any = await pool.query("SELECT COUNT(*) as total FROM users");
  const [activeTodayRows]: any = await pool.query("SELECT COUNT(DISTINCT user_id) as total FROM usage_logs_v2 WHERE log_date = CURDATE()");
  const [totalSentRows]: any = await pool.query("SELECT COALESCE(SUM(messages_sent),0) as total FROM usage_logs_v2");

  const [thisWeekRows]: any = await pool.query("SELECT COALESCE(SUM(messages_sent),0) as total FROM usage_logs_v2 WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
  const [lastWeekRows]: any = await pool.query("SELECT COALESCE(SUM(messages_sent),0) as total FROM usage_logs_v2 WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND log_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
  const thisWeek = thisWeekRows[0].total;
  const lastWeek = lastWeekRows[0].total;
  const msgTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

  const [chartData]: any = await pool.query(`
    SELECT log_date, SUM(messages_sent) as total 
    FROM usage_logs_v2 WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
    GROUP BY log_date ORDER BY log_date ASC
  `);
  const chartLabels = chartData.map((r: any) => new Date(r.log_date).toLocaleDateString('en-US', { weekday: 'short' }));
  const chartValues = chartData.map((r: any) => Number(r.total));

  const [recentUsers]: any = await pool.query(`
    SELECT u.username, u.is_active, p.name as plan_name
    FROM users u JOIN plans p ON u.plan_id = p.id ORDER BY u.created_at DESC LIMIT 6
  `);

  const stats = [
    { label: "Total Accounts", value: userCountRows[0].total, trend: `+${userCountRows[0].total}`, brand: false },
    { label: "Active Today", value: activeTodayRows[0].total, trend: "", brand: false },
    { label: "Messages Sent", value: totalSentRows[0].total, trend: `${msgTrend >= 0 ? '+' : ''}${msgTrend}%`, brand: true },
  ];

  return (
    <div className="space-y-8 animate-in mt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Key metrics and platform activity</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#71717a] bg-[#0a0a0a] border border-[#262626] px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="surface surface-hover p-6 flex flex-col justify-between">
            <p className="text-[#a1a1aa] font-medium text-sm mb-3">{s.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-4xl font-semibold tracking-tight ${s.brand ? 'text-blue-500' : 'text-white'}`}>
                {s.value.toLocaleString()}
              </h3>
              {s.trend && (
                <span className="text-xs font-semibold text-[#71717a] flex items-center gap-1">
                  <TrendingUp size={12} /> {s.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white">Message Volume</h3>
            <span className="text-xs text-[#a1a1aa] font-medium uppercase tracking-widest">Last 7 Days</span>
          </div>
          <UsageChart labels={chartLabels} values={chartValues} />
        </div>

        <div className="surface p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white">Recent Signups</h3>
            <Users size={16} className="text-[#52525b]" />
          </div>
          
          <div className="space-y-4 flex-1">
            {recentUsers.length === 0 ? (
               <p className="text-[#52525b] text-sm py-4 text-center">No accounts found.</p>
            ) : (
              recentUsers.map((u: any) => (
                <div key={u.username} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center text-xs font-semibold text-white">
                      {u.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#e4e4e7] group-hover:text-blue-400 transition-colors">{u.username}</p>
                      <p className="text-xs text-[#71717a]">{u.plan_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {u.is_active ? 
                      <CheckCircle2 size={16} className="text-[#22c55e]" /> : 
                      <ShieldCheck size={16} className="text-[#ef4444]" />
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
