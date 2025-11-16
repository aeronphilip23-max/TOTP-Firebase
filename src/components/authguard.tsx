// components/AuthGuard.tsx - FIXED VERSION
'use client';
import { useAuth } from '../context/authcontext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: string;
}

// Client-side path validation
function validateClientPath(pathname: string): boolean {
  const maliciousPatterns = [
    /\.\./,
    /\/\//,
    /[<>]/,
    /\/$/,
    /\\/
  ];
  
  return !maliciousPatterns.some(pattern => pattern.test(pathname));
}

// Public routes that don't require authentication
const publicRoutes = ['/', '/auth/login', '/auth/register', '/verifyotp'];

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, userRole, loading, refreshUserRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasCheckedRole, setHasCheckedRole] = useState(false);

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(pathname);

  // CLIENT-SIDE PATH VALIDATION
  useEffect(() => {
    if (!validateClientPath(pathname)) {
      console.error(`Blocked malicious client path: ${pathname}`);
      router.push('/error/security');
      return;
    }
  }, [pathname, router]);

  useEffect(() => {
    // If it's a public route, don't do any auth checks
    if (isPublicRoute) {
      console.log("AuthGuard - Public route, skipping auth checks");
      setHasCheckedRole(true);
      return;
    }

    const checkRoleAndRedirect = async () => {
      // Don't proceed if still loading, no user, already checked, or already redirecting
      if (loading || !user || hasCheckedRole || isRedirecting) {
        return;
      }

      console.log("AuthGuard - Current role:", userRole, "Required role:", requiredRole);

      // If roles don't match, try to refresh the role
      if (userRole !== requiredRole) {
        console.log("AuthGuard - Role mismatch detected, refreshing role...");
        
        try {
          // Refresh the role from Firestore
          await refreshUserRole();
          
          // Wait a moment for the state to update, then check again
          setTimeout(() => {
            console.log("AuthGuard - After refresh, role is now:", userRole);
            
            // If still doesn't match after refresh, redirect
            if (userRole !== requiredRole) {
              console.log(`AuthGuard - Role still doesn't match. User: ${userRole}, Required: ${requiredRole}`);
              console.log("AuthGuard - Redirecting to /dashboard/staff");
              setIsRedirecting(true);
              router.push('/dashboard/staff');
            } else {
              console.log("AuthGuard - Role matches after refresh, allowing access");
              setHasCheckedRole(true);
            }
          }, 300);
          
        } catch (error) {
          console.error('AuthGuard - Error refreshing role:', error);
          // If refresh fails, redirect to safe page
          setIsRedirecting(true);
          router.push('/dashboard/staff');
        }
      } else {
        // Roles match, allow access
        console.log("AuthGuard - Role matches, allowing access");
        setHasCheckedRole(true);
      }
    };

    checkRoleAndRedirect();
  }, [user, userRole, requiredRole, loading, isRedirecting, hasCheckedRole, refreshUserRole, router, isPublicRoute]);

  // Show loading while checking authentication or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Checking access...</span>
      </div>
    );
  }

  // For public routes, always render children
  if (isPublicRoute) {
    console.log("AuthGuard - Rendering public route content");
    return <>{children}</>;
  }

  // Redirect if no user (only for protected routes)
  if (!user) {
    console.log("AuthGuard - No user, redirecting to login");
    router.push('/auth/login');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render children if:
  // 1. We have a user
  // 2. We've completed the role check
  // 3. Roles match
  if (user && hasCheckedRole && userRole === requiredRole) {
    console.log("AuthGuard - Rendering protected content");
    return <>{children}</>;
  }

  // Show loading while making final decision
  console.log("AuthGuard - Final checks in progress...");
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Verifying permissions...</span>
    </div>
  );
}