"use client"

import * as React from "react"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar"
import { Link, useLocation } from "react-router"
import { useAppStore } from "@/lib/store"
import { UserRole } from "@/types/database"

export function NavMain({
  title,
  items,
}: {
  title?: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    role?: UserRole[]
    items?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  const { auth } = useAppStore()
  const { pathname } = useLocation()

  // "/dashboard" is a prefix of every route, so it only matches exactly;
  // other items stay active on their sub-routes (e.g. /dashboard/sales/create).
  const isRouteActive = (url: string) =>
    url === "/dashboard" ? pathname === url : pathname === url || pathname.startsWith(url + "/")

  return (
    <SidebarGroup>
      {title && (
        <SidebarGroupLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/40 transition-all group-data-[collapsible=icon]:opacity-0">
          {title}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) => (item.role && !item.role.includes(auth.user?.role as any) ? null : (
          <React.Fragment key={item.title}>
            {item.items ? (
              <Collapsible
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="hover:bg-sidebar-accent/50">
                      {item.icon && <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />}
                      <span className="font-medium">{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50">
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isRouteActive(subItem.url)} className="hover:text-emerald-600 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 dark:data-[active=true]:bg-emerald-500/15 dark:data-[active=true]:text-emerald-400">
                            <Link to={subItem.url} className="flex items-center gap-2">
                              {subItem.icon && <subItem.icon className="h-3.5 w-3.5" />}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isRouteActive(item.url)} className="hover:bg-sidebar-accent/50 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 data-[active=true]:font-semibold dark:data-[active=true]:bg-emerald-500/15 dark:data-[active=true]:text-emerald-400">
                  <Link to={item.url} className="flex items-center gap-2">
                    {item.icon && <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />}
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </React.Fragment>
        )))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
