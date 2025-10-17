"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, History, Settings, LogOut, Barcode } from "lucide-react"

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

import { Logo } from "@/components/icons/logo"
import { mockUser } from "@/lib/data"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventar", icon: Package },
  { href: "/history", label: "Historie", icon: History },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <h1 className="text-xl font-semibold">LagerMeister</h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Barcode scannen">
                <Barcode />
                <span>Barcode scannen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator />
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="person portrait" />
                <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-medium truncate">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 mb-2">
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </>
  )
}
