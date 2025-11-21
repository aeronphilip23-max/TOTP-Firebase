import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting with multiple layers
const rateLimitMap = new Map<string, { count: number; lastReset: number; blockedUntil?: number }>();
const suspiciousIPs = new Map<string, { score: number; lastOffense: number }>();

// Rate limit configurations
const RATE_LIMITS = {
  // General requests
  NORMAL: { window: 60000, max: 100 }, // 100 requests per minute
  // API endpoints
  API: { window: 60000, max: 60 }, // 60 requests per minute
  // Authentication endpoints
  AUTH: { window: 60000, max: 10 }, // 10 requests per minute
  // Admin endpoints
  ADMIN: { window: 60000, max: 30 }, // 30 requests per minute
};

// Suspicious behavior scoring
const SUSPICIOUS_BEHAVIORS = {
  TOO_MANY_404: 10,
  RATE_LIMIT_EXCEEDED: 5,
  SUSPICIOUS_PATHS: 15,
  BOT_LIKE_PATTERNS: 20,
};

function getRateLimitConfig(pathname: string): { window: number; max: number } {
  if (pathname.startsWith('/api/auth')) return RATE_LIMITS.AUTH;
  if (pathname.startsWith('/api/admin')) return RATE_LIMITS.ADMIN;
  if (pathname.startsWith('/api/')) return RATE_LIMITS.API;
  if (pathname.startsWith('/dashboard/admin')) return RATE_LIMITS.ADMIN;
  return RATE_LIMITS.NORMAL;
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; isSuspicious: boolean } {
  const config = getRateLimitConfig(pathname);
  const now = Date.now();
  const windowStart = now - config.window;

  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.lastReset < windowStart) {
      rateLimitMap.delete(key);
    }
  }

  // Check if IP is temporarily blocked
  const clientData = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  if (clientData.blockedUntil && now < clientData.blockedUntil) {
    return { allowed: false, remaining: 0, isSuspicious: true };
  }

  // Reset counter if window expired
  if (clientData.lastReset < windowStart) {
    clientData.count = 0;
    clientData.lastReset = now;
    clientData.blockedUntil = undefined;
  }

  clientData.count++;
  rateLimitMap.set(ip, clientData);
  
  const remaining = Math.max(0, config.max - clientData.count);
  const allowed = clientData.count <= config.max;

  // If rate limit exceeded, temporarily block the IP
  let isSuspicious = false;
  if (!allowed) {
    clientData.blockedUntil = now + (5 * 60 * 1000); // Block for 5 minutes
    isSuspicious = true;
    
    // Track suspicious behavior
    const suspiciousData = suspiciousIPs.get(ip) || { score: 0, lastOffense: now };
    suspiciousData.score += SUSPICIOUS_BEHAVIORS.RATE_LIMIT_EXCEEDED;
    suspiciousData.lastOffense = now;
    suspiciousIPs.set(ip, suspiciousData);
  }

  return { allowed, remaining, isSuspicious };
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

// Enhanced path traversal protection
function sanitizeAndValidatePath(pathname: string): { isValid: boolean; cleanPath: string; isSuspicious: boolean } {
  // Allow normal paths first
  const normalPaths = ['/', '/landingpage', '/auth/login', '/auth/register', '/verifyotp'];
  if (normalPaths.includes(pathname)) {
    return { isValid: true, cleanPath: pathname, isSuspicious: false };
  }

  const suspiciousPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /[<>]/g,
    /\/\.\./,
    /\/\.\//,
    /\/etc\/passwd/,
    /\/proc\/self/,
    /\.env/,
    /\.git/,
    /\.htaccess/,
    /\.sql/,
    /\/backup\//,
    /\/php/,
    /\/cgi-bin/,
  ];

  let cleanPath = pathname;
  let isSuspicious = false;

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cleanPath)) {
      isSuspicious = true;
      cleanPath = cleanPath.replace(pattern, '');
    }
  }

  //  Normalize path but don't be too aggressive
  cleanPath = cleanPath
    .replace(/\/+/g, '/')  // Replace multiple slashes with single slash
    .replace(/\/$/, '')    // Remove trailing slash
    || '/';                // Ensure it doesn't become empty

  //  More specific traversal detection
  const hasTraversal = /(?:^|\/)\.\.(?:\/|$)|\\|\/\/(?![\/])/i.test(cleanPath);
  
  if (hasTraversal || !cleanPath.startsWith('/')) {
    return { isValid: false, cleanPath: '/', isSuspicious: true };
  }

  return { isValid: true, cleanPath, isSuspicious };
}

// Bot detection
function detectBotLikeBehavior(request: NextRequest, pathname: string): number {
  let score = 0;
  
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer');
  const accept = request.headers.get('accept');

  // Common bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, 
    /curl/i, /wget/i, /python/i, /java/i, /go-http/i
  ];

  // Suspicious headers
  if (!userAgent) score += 10;
  if (botPatterns.some(pattern => pattern.test(userAgent))) score += 15;
  if (!referer && pathname.startsWith('/api/')) score += 5;
  if (!accept) score += 5;

  // Rapid fire requests to different endpoints
  const rapidFirePattern = /(?:\/api\/[^\/]+\/[^\/]+)/;
  if (rapidFirePattern.test(pathname)) {
    score += 10;
  }

  return score;
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

// Firebase token verification (placeholder - same as yours)
async function verifyIdToken(token: string): Promise<any> {
  try {
    return { uid: 'mock-user-id' };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

// Function to get user's default dashboard based on role
function getUserDefaultDashboard(userRole: string): string {
  switch (userRole) {
    case 'admin':
      return '/dashboard/admin/dashboard';
    case 'user':
      return '/dashboard/staff';
    default:
      return '/dashboard/staff';
  }
}

// Function to check if user is accessing unauthorized role path
function isUnauthorizedRoleAccess(userRole: string, pathname: string): boolean {
  const adminPaths = ['/dashboard/admin', '/api/admin'];
  const userPaths = ['/dashboard/staff', '/api/staff'];
  
  if (userRole === 'admin') {
    // Admin trying to access user paths - this is unauthorized
    return userPaths.some(path => pathname.startsWith(path));
  } else if (userRole === 'user') {
    // User trying to access admin paths - this is unauthorized
    return adminPaths.some(path => pathname.startsWith(path));
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // Skip for static files and known good paths
  if (pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|css|js|svg)$/)) {
    return NextResponse.next();
  }

  // Skip middleware entirely for public paths to prevent loops
  const publicPaths = [
    "/",
    "/landingpage", 
    "/auth/login",
    "/auth/register",
    "/verifyotp",
    "/api/disable-mfa",
    "/_next",
    "/favicon.ico",
  ];

  const isPublicPath = publicPaths.some((path) => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublicPath) {
    console.log(`✅ Allowing access to public route: ${pathname}`);
    return NextResponse.next();
  }

  // Enhanced path validation - only for non-public paths
  const pathValidation = sanitizeAndValidatePath(pathname);
  if (!pathValidation.isValid) {
    console.log(`🚨 Blocked malicious path: ${pathname}`);
    
    // Track suspicious IP
    const suspiciousData = suspiciousIPs.get(ip) || { score: 0, lastOffense: Date.now() };
    suspiciousData.score += SUSPICIOUS_BEHAVIORS.SUSPICIOUS_PATHS;
    suspiciousIPs.set(ip, suspiciousData);
    
    return NextResponse.redirect(new URL('/landingpage', request.url));
  }

  const cleanPathname = pathValidation.cleanPath;

  // Bot detection
  const botScore = detectBotLikeBehavior(request, cleanPathname);
  if (botScore > 20) {
    console.log(`🤖 Detected bot-like behavior from IP: ${ip}, score: ${botScore}`);
    
    const suspiciousData = suspiciousIPs.get(ip) || { score: 0, lastOffense: Date.now() };
    suspiciousData.score += SUSPICIOUS_BEHAVIORS.BOT_LIKE_PATTERNS;
    suspiciousIPs.set(ip, suspiciousData);
  }

  // Apply rate limiting
  const rateLimit = checkRateLimit(ip, cleanPathname);
  
  if (!rateLimit.allowed) {
    console.log(`🚫 Rate limit exceeded for IP: ${ip} on path: ${cleanPathname}`);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Rate limit exceeded. Please try again later.' 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': getRateLimitConfig(cleanPathname).max.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': '60',
          'Retry-After': '60',
        },
      }
    );
  }

  // Check if IP is suspicious and apply stricter limits
  const suspiciousData = suspiciousIPs.get(ip);
  if (suspiciousData && suspiciousData.score > 50) {
    console.log(`⚠️ Suspicious IP detected: ${ip}, score: ${suspiciousData.score}`);
    
    // Apply stricter rate limiting for suspicious IPs
    const strictRateLimit = { window: 60000, max: 10 };
    const strictCheck = checkRateLimit(ip + '-strict', cleanPathname);
    
    if (!strictCheck.allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access temporarily restricted', 
          message: 'Suspicious activity detected. Please try again later.' 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '300',
          },
        }
      );
    }
  }

  // Check if user is trying to access protected routes (BOTH dashboard AND API)
  if (cleanPathname.startsWith('/dashboard') || cleanPathname.startsWith('/api/')) {
    const token = request.cookies.get('idToken')?.value;
    
    // Check for MFA operation in cookies
    const mfaOperationCookie = request.cookies.get('mfaOperation')?.value;
    const isMfaOperationActive = mfaOperationCookie === 'true';
    
    // Check if request is from settings page
    const referer = request.headers.get('referer');
    const isFromSettings = referer && (referer.includes('/admin/settings') || referer.includes('/staff/settings'));
    
    // During MFA operations, allow all settings-related requests to pass through
    if (isMfaOperationActive && (isFromSettings || cleanPathname.includes('/settings'))) {
      console.log('🔓 MFA operation in progress - allowing settings page access');
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', getRateLimitConfig(cleanPathname).max.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', '60');
      return response;
    }
    
    if (!token) {
      console.log(`🔐 No token found for protected route: ${cleanPathname}, redirecting to login`);
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('returnTo', cleanPathname);
      return NextResponse.redirect(redirectUrl, 302);
    }

    try {
      // Verify the token - but be more lenient during MFA operations
      await verifyIdToken(token);
      
      // For protected routes, check role-based access
      const auth = await checkAuth(request);
      if (!auth) {
        console.log(`🔐 Auth check failed for: ${cleanPathname}, redirecting to login`);
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('returnTo', cleanPathname);
        return NextResponse.redirect(redirectUrl, 302);
      }

      // Role-based access control
      const userRole = auth.role;

      // First check if user is trying to access unauthorized role paths
      if (isUnauthorizedRoleAccess(userRole, cleanPathname)) {
        console.log(`🚫 Role violation: User with role ${userRole} trying to access ${cleanPathname}`);
        
        // Get user's default dashboard based on their role
        const defaultDashboard = getUserDefaultDashboard(userRole);
        console.log(`🔄 Redirecting user to their authorized dashboard: ${defaultDashboard}`);
        
        // Redirect to their authorized dashboard WITHOUT preserving the unauthorized path
        return NextResponse.redirect(new URL(defaultDashboard, request.url), 302);
      }

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
          "/api/reports",
        ],
        user: [
          "/dashboard/staff",
          "/dashboard/staff/calendar",
          "/dashboard/staff/shipments",
          "/dashboard/staff/reports",
          "/dashboard/staff/inventory", 
          "/dashboard/staff/settings",
          "/api/staff",
          "/api/reports",
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
        cleanPathname === commonPath || cleanPathname.startsWith(commonPath + '/')
      );

      if (!hasAccess && !hasCommonAccess) {
        console.log(`🚫 Access denied for role ${userRole} to ${cleanPathname}`);
        
        //  Redirect to appropriate dashboard based on role
        const defaultDashboard = getUserDefaultDashboard(userRole);
        console.log(`🔄 Redirecting to: ${defaultDashboard}`);
        return NextResponse.redirect(new URL(defaultDashboard, request.url), 302);
      }

      console.log(`✅ Access granted for role ${userRole} to ${cleanPathname}`);
      
    } catch (error: any) {
      console.log('Token verification failed:', error);
      
      // Special handling for MFA operations - don't redirect if MFA operation is in progress
      if (isMfaOperationActive && (error.message?.includes('expired') || error.code === 'auth/user-token-expired')) {
        console.log('🔓 Allowing expired token during MFA operation');
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', getRateLimitConfig(cleanPathname).max.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', '60');
        return response;
      }
      
      // Otherwise redirect to login
      console.log(`🔐 Token verification failed for: ${cleanPathname}, redirecting to login`);
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('returnTo', cleanPathname);
      const response = NextResponse.redirect(redirectUrl, 302);
      response.cookies.delete('idToken');
      response.cookies.delete('userRole');
      return response;
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Rate limit headers
  response.headers.set('X-RateLimit-Limit', getRateLimitConfig(cleanPathname).max.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', '60');
  
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};