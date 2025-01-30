import { Outlet } from "react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarProvider>
        
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            <SidebarTrigger className="items-center" />
            <div className="container mx-auto px-6 pb-8">
              <Outlet />
            </div>
          </main>

        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default Layout;
