// middleware.ts
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

// Simple auth check
async function checkAuth(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');
    let idToken: string | null = null;
    let userRole: string = 'user'; // Default role

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // Public paths (no auth required)
  const publicPaths = [
    "/auth/login",
    "/auth/register", 
    "/verifyotp",
    "/api/auth",
  ];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    return response;
  }

  // Check authentication for protected routes
  const auth = await checkAuth(request);
  
  if (!auth) {
    console.log('No auth found, redirecting to login');
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Basic role checking
  const userRole = auth.role;

  // FIXED: Use consistent role names (all lowercase)
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
    ],
    user: [ // FIXED: Changed from "User" to "user"
      "/dashboard/staff",
      "/dashboard/staff/calendar",
      "/dashboard/staff/shipments",
      "/dashboard/staff/reports",
      "/dashboard/staff/inventory", 
      "/dashboard/staff/settings",
    ],
  };

  const allowedPaths = roleAccessPatterns[userRole as keyof typeof roleAccessPatterns] || [];
  const hasAccess = allowedPaths.some((path) => pathname.startsWith(path));

  if (!hasAccess) {
    console.log(`Access denied for role ${userRole} to ${pathname}`);
    
    // FIXED: Consistent role-based redirects
    let defaultPage = '/dashboard';
    if (userRole === 'admin') defaultPage = '/dashboard/admin/dashboard';
    if (userRole === 'user') defaultPage = '/dashboard/staff'; // Treat 'user' as staff
    
    console.log(`Redirecting to: ${defaultPage}`);
    return NextResponse.redirect(new URL(defaultPage, request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};