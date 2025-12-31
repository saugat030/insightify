"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "user")[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  console.log("Role guard triggered, deciding where to send the user.", user);
  useEffect(() => {
    if (!isLoading) {
      // if not logged in at all, go to login
      console.log("User is logged in, checking role.", user);
      if (!user) {
        router.push("/login");
      }
      // if logged in but wrong role, go to unauthorized page or dashboard
      else if (!allowedRoles.includes(user.role)) {
        console.log(
          "User has wrong role, redirecting to unauthorized page.",
          user
        );
        router.push("/unauthorized");
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  // while checking auth status, show a spinner/skeleton
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If user is missing or role is wrong, return null
  // (Effect will handle redirect, but we don't want to render children yet)
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  // Permission granted! Render the page.
  return <>{children}</>;
}
