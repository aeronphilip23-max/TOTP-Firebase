// lib/firebase-auth.ts - USING YOUR CONFIG
import { cookies } from 'next/headers';
import { baseUrl } from '../lib/config'; 

export async function getFirebaseUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const idTokenCookie = cookieStore.get('idToken')?.value;

    if (!sessionCookie && !idTokenCookie) {
      return null;
    }

    const tokenToVerify = idTokenCookie || sessionCookie;
    
    if (!tokenToVerify) {
      return null;
    }

    // ✅ Using your centralized config
    const apiUrl = `${baseUrl}/api/auth/verify`;
    
    const verifyResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: tokenToVerify }),
      cache: 'no-store', // Important for auth calls
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

export async function checkFirebaseAuth() {
  try {
    const cookieStore = await cookies();
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