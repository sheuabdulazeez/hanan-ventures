import { Navigate } from "react-router";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/types/database";

interface RoleGuardProps {
  allow: UserRole[];
  children: React.ReactNode;
}

const RoleGuard = ({ allow, children }: RoleGuardProps) => {
  const { auth } = useAppStore();
  const role = auth.user?.role;

  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
