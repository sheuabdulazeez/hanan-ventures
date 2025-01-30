
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Toaster } from './ui/toaster';
// import useAuth from '../hooks/use-auth';
    
const RootLayout = () => {
    // const navigate = useNavigate();
    // const location = useLocation();
  //   const { loading, user } = useAuth()

  //   useEffect(() => {
  //       if(!loading){
  //         if (user && !location.pathname.includes("/dashboard")) {
  //           navigate('/dashboard');
  //         }else if(!user && location.pathname.includes("/dashboard")){
  //             navigate('/');
  //         }
  //       }
  //   }, [location, loading]);


  // if(loading) return null;
  
  return (
    <div>
      <Toaster />
        <Outlet />
    </div>
  );
};

export default RootLayout;
