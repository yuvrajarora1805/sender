import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ToastProvider from "@/components/Toast";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Advanced Management Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden selection:bg-blue-500/30">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative bg-[#000]">
            {/* Subtle top glow */}
            <div className="absolute top-0 inset-x-0 h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
            
            <div className="max-w-[1100px] mx-auto px-6 py-10 lg:px-10 relative z-10">
              {children}
            </div>
          </main>
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
