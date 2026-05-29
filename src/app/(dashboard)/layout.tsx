"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { useLocalStorage } from "@/hooks/use-local-storage"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage("sidebar:collapsed", false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div
        className="flex flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 230 }}
      >
        <DashboardHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="space-y-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
