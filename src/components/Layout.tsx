import { Outlet } from "react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const Layout = () => {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17.5rem", // 280px
          "--header-height": "4rem", // 64px
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" />
      <SidebarInset className="flex-1 min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-6 border-b border-border bg-background">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>

    </SidebarProvider>
  );
};

export default Layout;
