"use client"

import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/sidebar-nav"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="h-full border-r">
          <SidebarNav />
        </Sidebar>
        <SidebarInset className="flex-1">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
