"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

let pushToast: ((msg: string, type?: "success" | "error") => void) | null = null;

export function toast(message: string, type: "success" | "error" = "success") {
  pushToast?.(message, type);
}

export default function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (message, type = "success") => {
      const id = Date.now();
      setItems((prev) => [...prev, { message, type, id }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    return () => { pushToast = null; };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-anim flex items-center gap-3 px-4 py-3 rounded-xl border bg-black shadow-2xl pointer-events-auto"
          style={{ borderColor: "#262626" }}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
             <AlertCircle size={16} className="text-red-500" />
          )}
          <span className="text-sm font-medium text-white">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
