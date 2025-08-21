import * as React from "react";
import {
  AudioWaveform,
  Bot,
  Frame,
  Map,
  PieChart,
  Plus,
  SquareTerminal,
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
  SidebarTrigger,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useAppStore } from "@/lib/store";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
    },
    {
      title: "Sales",
      url: "/dashboard/sales",
      icon: SquareTerminal,
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: SquareTerminal,
    },
    {
      title: "Stocks",
      url: "/dashboard/stocks",
      icon: SquareTerminal,
    },
    {
      title: "Debtors",
      url: "/dashboard/debtors",
      icon: SquareTerminal,
    },
    {
      title: "Admin",
      url: "#",
      icon: Bot,
      role: ["admin", "manager"],
      items: [
        {
          title: "Suppliers",
          url: "/dashboard/suppliers",
        },
        {
          title: "Purchase Orders",
          url: "/dashboard/orders",
        },
        {
          title: "Expenses",
          url: "/dashboard/expenses",
        },
        {
          title: "Profit",
          url: "/dashboard/profit",
          icon: PieChart,
        },
        {
          title: "Settings",
          url: "/dashboard/settings",
        },
        {
          title: "Teams",
          url: "/dashboard/teams",
        },
        // {
        //   title: "Unit Price Demo",
        //   url: "/dashboard/unit-price-demo",
        // },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    auth: { user },
    businessInfo
  } = useAppStore();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="cursor-pointer">
                {
                  businessInfo.logo ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded">
                      <img src={businessInfo.logo} alt={businessInfo.name} className="h-10 w-10 rounded-full" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-purple-700 to-indigo-800">
                      <AudioWaveform className="h-5 w-5 text-white" />
                    </div>
                  )
                }

                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-md">{businessInfo.name}</span>
                  <span className="">Enterprise</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full rounded bg-gradient-to-t from-purple-700 to-indigo-800">
                <Plus className="mr-2 h-4 w-4" /> Add New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>
                <Link to="/dashboard/sales/create" className="flex w-full">
                  Sale
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/dashboard/customers/create" className="flex w-full">
                  Customer
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem>
                  <Link to="/dashboard/stocks/create" className="flex w-full">
                    Stock
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain as any} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
