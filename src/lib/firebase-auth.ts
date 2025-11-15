// lib/firebase-auth.ts
import { cookies } from 'next/headers';

export async function getFirebaseUser() {
  try {
    // Get the session cookie using proper Next.js cookies API - ADD AWAIT
    const cookieStore = await cookies(); // ADD AWAIT HERE
    const sessionCookie = cookieStore.get('session')?.value;
    const idTokenCookie = cookieStore.get('idToken')?.value;

    if (!sessionCookie && !idTokenCookie) {
      return null;
    }

    // Use the token to verify with our API route
    const tokenToVerify = idTokenCookie || sessionCookie;
    
    if (!tokenToVerify) {
      return null;
    }

    // Verify the token using our API route
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: tokenToVerify }),
    });

    if (verifyResponse.ok) {
      const data = await verifyResponse.json();
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('Error verifying Firebase session:', error);
    return null;
  }
}

// Alternative simple session checker (if you don't need full user data)
export async function checkFirebaseAuth() {
  try {
    const cookieStore = await cookies(); // ADD AWAIT HERE
    const idToken = cookieStore.get('idToken')?.value;
    
    return {
      isAuthenticated: !!idToken,
      token: idToken || null
    };
  } catch (error) {
    console.error('Error checking Firebase auth:', error);
    return {
      isAuthenticated: false,
      token: null
    };
  }
}