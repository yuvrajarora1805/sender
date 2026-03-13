"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    // Simulate authentication against env or basic hardcoded for now
    if (password === "admin123") {
      // In a real app, set an HTTP-only cookie here via server action
      document.cookie = "admin_auth=true; path=/; max-age=86400";
      router.push("/");
      router.refresh(); // Force layout re-render to catch cookie
    } else {
      setError("Invalid access key");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#262626] flex items-center justify-center mb-4">
            <Lock className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Authenticate to access the dashboard</p>
        </div>

        <div className="surface p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#ededed]">Access Key</label>
              <input
                name="password"
                type="password"
                required
                autoFocus
                className="input-ring w-full px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-[13px] font-medium mt-2"
            >
              {loading ? "Verifying..." : "Secure Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
