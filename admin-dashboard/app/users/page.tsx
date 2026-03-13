import pool from "@/lib/db";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import AddUserModal from "./AddUserModal";
import SearchFilter from "./SearchFilter";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const search = params.q || "";

  let query = `
    SELECT u.*, p.name as plan_name, p.daily_limit as plan_limit,
    COALESCE(u.custom_daily_limit, p.daily_limit) as actual_limit,
    COALESCE((SELECT messages_sent FROM usage_logs_v2 WHERE user_id = u.id AND log_date = CURDATE()), 0) as sent_today
    FROM users u JOIN plans p ON u.plan_id = p.id
  `;
  const queryParams: string[] = [];
  if (search) { query += " WHERE u.username LIKE ?"; queryParams.push(`%${search}%`); }
  query += " ORDER BY u.id DESC";

  const [users]: any = await pool.query(query, queryParams);
  const [plans]: any = await pool.query("SELECT * FROM plans");

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Accounts</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            {users.length} {users.length === 1 ? "account" : "accounts"} registered
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <SearchFilter />
          <AddUserModal plans={plans} />
        </div>
      </div>

      {users.length === 0 ? (
        <div className="surface p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center text-[#52525b]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h3 className="font-medium text-white mb-2">No accounts found</h3>
          <p className="text-sm text-[#71717a]">
            {search ? `Your search "${search}" did not match any users.` : "Create a new user to get started."}
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Plan Tier</th>
                <th>Usage Today</th>
                <th>Status</th>
                <th>Device Link</th>
                <th>Expiration</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-white group-hover:text-blue-400 transition-colors">{u.username}</span>
                        <p className="text-[11px] text-[#71717a] border border-[#262626] rounded-sm bg-[#111] inline-block px-1 mt-0.5">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{u.plan_name}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-white">{u.sent_today.toLocaleString()}</span>
                      <span className="text-[#52525b]">/ {u.actual_limit.toLocaleString()}</span>
                      {u.custom_daily_limit && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20" title="Custom limit overriding plan default">Override</span>
                      )}
                    </div>
                    <div className="w-16 h-1 bg-[#262626] rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all rounded-full" 
                        style={{ width: `${Math.min(100, (u.sent_today / u.actual_limit) * 100)}%` }} 
                      />
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-[12px]">
                      {u.hwid ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="text-orange-500 font-medium">Locked to Machine</span></>
                      ) : (
                        <span className="text-[#52525b]">Unlinked</span>
                      )}
                    </div>
                  </td>
                  <td className="text-[13px] text-[#a1a1aa] font-medium tracking-tight">
                    {formatDate(u.expires_at)}
                  </td>
                  <td className="text-right align-middle">
                    <UserActions user={u} plans={plans} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
