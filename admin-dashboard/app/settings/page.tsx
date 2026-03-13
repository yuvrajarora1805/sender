"use client";

import { useState } from "react";
import { Save, Eye, EyeOff, Lock, Globe, Server } from "lucide-react";
import { toast } from "@/components/Toast";

export default function SettingsPage() {
  const [showPass, setShowPass] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast("Configuration synced successfully");
  }

  return (
    <div className="space-y-8 max-w-2xl animate-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">System Settings</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Platform configuration and infrastructure</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Auth Section */}
        <div className="surface p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={16} className="text-white" />
            <h3 className="font-semibold text-white">Authentication</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Administrator Handle</label>
                <input type="text" defaultValue="admin" className="input-ring w-full px-3 py-2 text-sm" />
             </div>
             <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#ededed]">Override Access Key</label>
                <div className="relative">
                  <input 
                    type={showPass ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="input-ring w-full px-3 py-2 text-sm pr-10" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
             </div>
          </div>
        </div>

        {/* Network Section */}
        <div className="surface p-8 space-y-6">
           <div className="flex items-center gap-2 mb-2">
            <Globe size={16} className="text-white" />
            <h3 className="font-semibold text-white">Telemetry & Gateway</h3>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#ededed]">API Binding URL</label>
            <input 
              type="text" 
              defaultValue="http://localhost:3000/api" 
              className="input-ring w-full px-3 py-2 text-[13px] font-mono" 
            />
            <p className="text-[11px] text-[#71717a] mt-2">The fully qualified domain utilized by Windows executable clients for payload delivery.</p>
          </div>
        </div>

        {/* Status Section */}
        <div className="surface p-8">
          <div className="flex items-center gap-2 mb-6">
            <Server size={16} className="text-white" />
            <h3 className="font-semibold text-white">Node Health</h3>
          </div>
          <div className="space-y-2">
            {[
              { name: "Primary Database (MySQL)", identifier: "license_db:3306" },
              { name: "Edge Functions Node", identifier: "app_router:latest" },
            ].map((node) => (
              <div key={node.name} className="flex items-center justify-between p-3 rounded-lg bg-[#111] border border-[#262626]">
                <div>
                  <p className="text-[13px] font-medium text-white">{node.name}</p>
                  <p className="text-[11px] font-mono text-[#71717a] mt-0.5">{node.identifier}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-green-500">Nominal</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <Save size={15} /> Commit Changes
          </button>
        </div>
      </form>
    </div>
  );
}
