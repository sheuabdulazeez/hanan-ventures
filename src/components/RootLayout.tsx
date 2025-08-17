
import { useEffect } from 'react';
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Toaster } from './ui/toaster';
import { useAppStore } from '@/lib/store';
// import useAuth from '../hooks/use-auth';
    
const RootLayout = () => {
  const { auth, logout } = useAppStore();
  const window = getCurrentWebviewWindow();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if(auth.loading) return;
          if (auth.isAuthenticated && !location.pathname.includes("/dashboard")) {
            navigate('/dashboard');
          }else if(!auth.isAuthenticated && location.pathname.includes("/dashboard")){
              navigate('/');
          }
    }, [location, auth.isAuthenticated, auth.loading]);


    useEffect(() => {
      window.onCloseRequested(async (event) => {
          logout();
        });
    }, [])
  
  if(auth.loading) return (<div className='flex flex-1 text-center justify-center items-center h-dvh text-xl text-blue-500 font-bold'>Loading...</div>)

  return (
    <div>
      <Toaster />
        <Outlet />
    </div>
  );
};

export default RootLayout;
