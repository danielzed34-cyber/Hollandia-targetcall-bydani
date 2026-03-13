"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {/* Full-height flex container. In RTL, aside (first child) goes to the right. */}
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar – right side in RTL */}
        <Sidebar />

        {/* Main content – stretches to fill remaining space */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
