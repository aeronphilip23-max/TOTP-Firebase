import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


// Rate limiting setup
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 100;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  for (const [key, value] of rateLimitMap.entries()) {
    if (value.lastReset < windowStart) {
      rateLimitMap.delete(key);
    }
  }

  const clientData = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  if (clientData.lastReset < windowStart) {
    clientData.count = 0;
    clientData.lastReset = now;
  }

  clientData.count++;
  rateLimitMap.set(ip, clientData);
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - clientData.count);

  return {
    allowed: clientData.count <= MAX_REQUESTS_PER_WINDOW,
    remaining,
  };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

// PATH TRAVERSAL PROTECTION
function sanitizeAndValidatePath(pathname: string): { isValid: boolean; cleanPath: string } {
  let cleanPath = pathname
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/\/+/g, '/')
    .replace(/[<>]/g, '')
    .replace(/\/$/, '');

  const hasTraversal = /\.\.|%2e%2e|%2E%2E|\\|\.\.$/i.test(cleanPath);
  
  if (hasTraversal || !cleanPath.startsWith('/')) {
    return { isValid: false, cleanPath: '/' };
  }

  return { isValid: true, cleanPath };
}

// Enhanced auth check
async function checkAuth(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');
    let idToken: string | null = null;
    let userRole: string = 'user';

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'idToken') {
        idToken = value;
      }
      if (name === 'userRole') {
        userRole = value;
      }
    }

    if (!idToken) {
      return null;
    }

    return {
      isAuthenticated: true,
      role: userRole
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return null;
  }
}

// Firebase token verification function
async function verifyIdToken(token: string): Promise<any> {
  // You'll need to implement Firebase Admin token verification here
  // This is a placeholder - you need to set up Firebase Admin SDK
  try {
    // For now, we'll just return a mock verification
    // In production, you should use Firebase Admin SDK
    return { uid: 'mock-user-id' };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Rate limit exceeded. Please try again later.' 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  }

  // PATH TRAVERSAL PROTECTION
  const pathValidation = sanitizeAndValidatePath(pathname);
  if (!pathValidation.isValid) {
    console.log(`Blocked malicious path: ${pathname} -> ${pathValidation.cleanPath}`);
    return NextResponse.redirect(new URL('/landingpage', request.url));
  }

  const cleanPathname = pathValidation.cleanPath;

  // CRITICAL: Define ALL public paths (no authentication required)
  const publicPaths = [
    "/",
    "/landingpage",
    "/auth/login",
    "/auth/register",
    "/verifyotp",
    "/api/disable-mfa",
    "/_next",
    "/favicon.ico",
    // Add other public paths here
  ];

  // Check if it's a public path
  const isPublicPath = publicPaths.some((path) => 
    cleanPathname === path || cleanPathname.startsWith(path + '/')
  );

  // If it's a public path, allow access without auth check
  if (isPublicPath) {
    console.log(`✅ Allowing access to public route: ${cleanPathname}`);
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    return response;
  }

  // Check if user is trying to access protected routes
  if (cleanPathname.startsWith('/dashboard')) {
    const token = request.cookies.get('idToken')?.value;
    
    // Check for MFA operation in cookies (this is key!)
    const mfaOperationCookie = request.cookies.get('mfaOperation')?.value;
    const isMfaOperationActive = mfaOperationCookie === 'true';
    
    // Check if request is from settings page
    const referer = request.headers.get('referer');
    const isFromSettings = referer && (referer.includes('/admin/settings') || referer.includes('/staff/settings'));
    
    // During MFA operations, allow all settings-related requests to pass through
    if (isMfaOperationActive && (isFromSettings || cleanPathname.includes('/settings'))) {
      console.log('🔓 MFA operation in progress - allowing settings page access');
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      return response;
    }
    
    if (!token) {
      console.log(`🔐 No token found for protected route: ${cleanPathname}, redirecting to login`);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      // Verify the token - but be more lenient during MFA operations
      await verifyIdToken(token);
      
      // For protected dashboard routes, check role-based access
      const auth = await checkAuth(request);
      if (!auth) {
        console.log(`🔐 Auth check failed for: ${cleanPathname}, redirecting to login`);
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      // Role-based access control
      const userRole = auth.role;

      const roleAccessPatterns = {
        admin: [
          "/dashboard/admin",
          "/dashboard/admin/calendar",
          "/dashboard/admin/dashboard", 
          "/dashboard/admin/inventory",
          "/dashboard/admin/mock-deliveries",
          "/dashboard/admin/reports",
          "/dashboard/admin/settings",
          "/dashboard/admin/shipments",
          "/api/admin",
        ],
        user: [
          "/dashboard/staff",
          "/dashboard/staff/calendar",
          "/dashboard/staff/shipments",
          "/dashboard/staff/reports",
          "/dashboard/staff/inventory", 
          "/dashboard/staff/settings",
          "/api/staff",
        ],
      };

      const allowedPaths = roleAccessPatterns[userRole as keyof typeof roleAccessPatterns] || [];
      
      const hasAccess = allowedPaths.some((allowedPath) => {
        if (cleanPathname === allowedPath) return true;
        if (cleanPathname.startsWith(allowedPath + '/')) return true;
        return false;
      });

      // Allow access to common paths for all roles
      const commonPaths = [
        "/dashboard",
        "/api/auth",
      ];

      const hasCommonAccess = commonPaths.some((commonPath) => 
        cleanPathname === commonPath || commonPath.startsWith(commonPath + '/')
      );

      if (!hasAccess && !hasCommonAccess) {
        console.log(`🚫 Access denied for role ${userRole} to ${cleanPathname}`);
        
        // Redirect to appropriate dashboard based on role
        let defaultPage = '/dashboard/staff';
        if (userRole === 'admin') defaultPage = '/dashboard/admin/dashboard';
        if (userRole === 'user') defaultPage = '/dashboard/staff';
        console.log(`🔄 Redirecting to: ${defaultPage}`);
        return NextResponse.redirect(new URL(defaultPage, request.url));
      }

      console.log(`✅ Access granted for role ${userRole} to ${cleanPathname}`);
      
    } catch (error: any) {
      console.log('Token verification failed:', error);
      
      // Special handling for MFA operations - don't redirect if MFA operation is in progress
      if (isMfaOperationActive && (error.message?.includes('expired') || error.code === 'auth/user-token-expired')) {
        console.log('🔓 Allowing expired token during MFA operation');
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        return response;
      }
      
      // Otherwise redirect to login
      console.log(`🔐 Token verification failed for: ${cleanPathname}, redirecting to login`);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};