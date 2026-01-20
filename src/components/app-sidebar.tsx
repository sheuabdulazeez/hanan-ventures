import * as React from "react";
import {
  AudioWaveform,
  Boxes,
  ChevronDown,
  FileText,
  LayoutDashboard,
  PieChart,
  Plus,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Link } from "react-router";
import { useAppStore } from "@/lib/store";

// This is sample data.
const data = {
  navMain: [
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Sales",
          url: "/dashboard/sales",
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: "Inventory & CRM",
      items: [
        {
          title: "Stocks",
          url: "/dashboard/stocks",
          icon: Boxes,
        },
        {
          title: "Customers",
          url: "/dashboard/customers",
          icon: Users,
        },
        {
          title: "Debtors",
          url: "/dashboard/debtors",
          icon: Wallet,
        },
        {
          title: "Purchase Orders",
          url: "/dashboard/orders",
          icon: FileText,
        },
      ],
    },
    {
      title: "Administration",
      role: ["admin", "manager"],
      items: [
        {
          title: "Suppliers",
          url: "/dashboard/suppliers",
          icon: Truck,
        },
        {
          title: "Expenses",
          url: "/dashboard/expenses",
          icon: Receipt,
        },
        {
          title: "Profit",
          url: "/dashboard/profit",
          icon: TrendingUp,
        },
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: Settings,
        },
        {
          title: "Teams",
          url: "/dashboard/teams",
          icon: UsersRound,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    auth: { user },
    businessInfo,
  } = useAppStore();
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === 'super_admin' as any;
  const isSuperAdmin = user?.role === 'super_admin' as any;

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-4">
          {/* Business Info Section */}
          <div className="flex items-center gap-3 px-1 transition-all group-data-[collapsible=icon]:opacity-0">
            {businessInfo.logo ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-white shadow-sm overflow-hidden">
                <img
                  src={businessInfo.logo}
                  alt={businessInfo.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                <AudioWaveform className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
                {businessInfo.name}
              </span>
              <span className="truncate text-[11px] font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                {user?.role || "User"}
              </span>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <div className="px-1 group-data-[collapsible=icon]:px-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-md shadow-emerald-900/10 transition-all active:scale-95 flex items-center justify-between px-3 h-10 rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-90" />
                    <span className="font-semibold group-data-[collapsible=icon]:hidden">Add New</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={8}>
                <DropdownMenuItem className="cursor-pointer">
                  <Link to="/dashboard/sales/create" className="flex items-center gap-2 w-full py-1">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    <span>New Sale</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link to="/dashboard/customers/create" className="flex items-center gap-2 w-full py-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>New Customer</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem className="cursor-pointer">
                    <Link to="/dashboard/stocks/create" className="flex items-center gap-2 w-full py-1">
                      <Boxes className="h-4 w-4 text-orange-600" />
                      <span>New Stock Entry</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-0">
        {data.navMain.filter(group => {
          if (group.title === "Administration") return isAdmin;
          return true;
        }).map((group) => (
          <NavMain
            key={group.title}
            title={group.title}
            items={group.items.filter(item => {
              if (item.title === "Settings") return isSuperAdmin;
              return true;
            }) as any}
          />
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
