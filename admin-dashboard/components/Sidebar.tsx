"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, FileText, Anchor, Settings, LogOut } from "lucide-react";

const navItems = [
  { icon: Activity, label: "Overview", href: "/" },
  { icon: Users, label: "Accounts", href: "/users" },
  { icon: FileText, label: "Logs", href: "/logs" },
  { icon: Anchor, label: "Plans", href: "/plans" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] flex flex-col border-r border-[#262626] bg-[#0a0a0a] text-sm font-medium">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span className="font-semibold text-white tracking-tight">Admin System</span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active 
                    ? "bg-[#1f1f1f] text-white" 
                    : "text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-[#e4e4e7]"
                }`}
              >
                <item.icon size={16} className={active ? "text-white" : "text-[#71717a]"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-[#262626]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-semibold">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Administrator</p>
            <span className="text-[11px] font-mono text-[#71717a] mt-0.5">master_key</span>
          </div>
          <button 
            onClick={() => {
              document.cookie = "admin_auth=; path=/; max-age=0";
              window.location.href = "/login";
            }}
            className="p-1.5 text-[#a1a1aa] hover:text-white rounded-md hover:bg-[#262626] transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
