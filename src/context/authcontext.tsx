// context/authcontext.tsx (Optimized version)
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc
} from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  logout: async () => {},
  refreshUserRole: async () => {},
  refreshIdToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Function to get role from Firestore by email
  const getUserRoleFromFirestore = async (uid: string, email?: string): Promise<string> => {
    try {
      const userDocByUid = await getDoc(doc(db, 'users', uid));
      if (userDocByUid.exists()) {
        return userDocByUid.data().role || 'user';
      }
      
      // If not found by UID and email is provided, try by email
      if (email) {
        const usersQuery = query(
          collection(db, 'users'), 
          where('email', '==', email)
        );
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          console.log("✅ User found by email:", userData);
          return userData.role || 'user';
        }
      }
      
      console.log("❌ User not found in Firestore by UID or email");
      return 'user';
    } catch (error) {
      console.error('Error fetching user role from Firestore:', error);
      return 'user';
    }
  };

  // Function to sync email verification status to Firestore (CLIENT-SIDE)
  const syncEmailVerificationToFirestore = async (uid: string, emailVerified: boolean) => {
    try {
      if (emailVerified) {
        await updateDoc(doc(db, 'users', uid), {
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Updated email verification status in Firestore');
      }
    } catch (error) {
      console.error('Error syncing email verification to Firestore:', error);
    }
  };

  // Function to set role cookie
  const setRoleCookie = (role: string) => {
    document.cookie = `userRole=${role}; path=/; max-age=86400; SameSite=Lax`;
  };

  // Function to get role from cookie
  const getRoleFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'userRole') {
        return value;
      }
    }
    return null;
  };

  // Function to refresh user role
  const refreshUserRole = async () => {
    if (!user) return;
    
    try {
      const firestoreRole = await getUserRoleFromFirestore(user.uid, user.email || undefined);
      console.log("Refreshed role from Firestore:", firestoreRole);
      
      setUserRole(firestoreRole);
      setRoleCookie(firestoreRole);
      
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  };

  // Function to refresh ID token
  const refreshIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const token = await user.getIdToken(true);
      document.cookie = `idToken=${token}; path=/; max-age=3600; SameSite=Lax`;
      console.log("✅ ID token refreshed successfully");
      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  // Safe redirect function to prevent loops
  const safeRedirect = (path: string) => {
    if (isRedirecting) return;
    
    const currentPath = window.location.pathname;
    if (currentPath === path) {
      console.log('Already on target path, skipping redirect');
      return;
    }
    
    setIsRedirecting(true);
    console.log(`🔄 Safe redirect from ${currentPath} to ${path}`);
    
    // Use replace to avoid adding to history stack
    window.location.replace(path);
  };

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email, "Email verified:", user?.emailVerified);
      setUser(user);
      
      if (user) {
        try {
          // Check if MFA operation is in progress
          const isMfaOperation = typeof window !== 'undefined' && sessionStorage.getItem('mfaOperation') === 'true';
          
          // Get ID token to set in cookie
          const idToken = await user.getIdToken();
          document.cookie = `idToken=${idToken}; path=/; max-age=3600; SameSite=Lax`;
          
          // Get role from Firestore
          const firestoreRole = await getUserRoleFromFirestore(user.uid, user.email || undefined);
          console.log("User role from Firestore:", firestoreRole);
          
          // SYNC EMAIL VERIFICATION STATUS TO FIRESTORE (CLIENT-SIDE)
          await syncEmailVerificationToFirestore(user.uid, user.emailVerified);
          
          // Check if cookie role matches Firestore role
          const cookieRole = getRoleFromCookie();
          console.log("Current role from cookie:", cookieRole);
          
          if (cookieRole !== firestoreRole) {
            console.log("Role mismatch detected. Updating cookie...");
            setRoleCookie(firestoreRole);
          }
          
          // Set the role in state
          setUserRole(firestoreRole);
          
          // CRITICAL FIX: Don't redirect from TOTP setup pages OR during MFA operations
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.includes('/auth/');
          const isTotpPage = currentPath.includes('/verifyotp');
          const isSettingsPage = currentPath.includes('/admin/settings') || currentPath.includes('/staff/settings');
          
          // Don't redirect during MFA operations or from settings/TOTP pages
          if (isAuthPage && !isTotpPage && !isSettingsPage && !isMfaOperation && user.emailVerified && !isRedirecting) {
            console.log('User verified on auth page, redirecting to dashboard...');
            safeRedirect('/dashboard');
          }
          
        } catch (error) {
          console.error('Error setting up user session:', error);
          const cookieRole = getRoleFromCookie();
          setUserRole(cookieRole || 'user');
        }
      } else {
        // User signed out - clear everything
        setUserRole(null);
        document.cookie = 'idToken=; path=/; max-age=0';
        document.cookie = 'userRole=; path=/; max-age=0';
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isRedirecting]);

  const logout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Clear cookies
      document.cookie = 'idToken=; path=/; max-age=0';
      document.cookie = 'userRole=; path=/; max-age=0';
      console.log("Cookies cleared");
      
      // Clear local state
      setUser(null);
      setUserRole(null);
      
      // Sign out from Firebase
      await signOut(auth);
      console.log("Firebase signOut completed");
      
      // Redirect to landing page - this is safe since we're logging out
      if (typeof window !== 'undefined') {
        window.location.href = '/landingpage';
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/landingpage';
      }
    }
  };

  const value = {
    user,
    userRole,
    loading,
    logout,
    refreshUserRole,
    refreshIdToken, // Add this to the context value
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}