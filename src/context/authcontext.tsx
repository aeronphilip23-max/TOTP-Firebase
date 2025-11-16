// context/authcontext.tsx (Fixed version)
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserRole: () => Promise<void>; // Add this function
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  logout: async () => {},
  refreshUserRole: async () => {}, // Add this
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to get role from Firestore
  const getUserRoleFromFirestore = async (uid: string): Promise<string> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role || 'user';
      }
      return 'user';
    } catch (error) {
      console.error('Error fetching user role from Firestore:', error);
      return 'user';
    }
  };

  // Function to set role cookie
  const setRoleCookie = (role: string) => {
    document.cookie = `userRole=${role}; path=/; max-age=86400; SameSite=Lax`; // 24 hours
  };

  // Function to get role from cookie
  const getRoleFromCookie = (): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'userRole') {
        return value;
      }
    }
    return null;
  };

  // Function to refresh user role (call this when you suspect role mismatch)
  const refreshUserRole = async () => {
    if (!user) return;
    
    try {
      const firestoreRole = await getUserRoleFromFirestore(user.uid);
      console.log("Refreshed role from Firestore:", firestoreRole);
      
      // Update both state and cookie
      setUserRole(firestoreRole);
      setRoleCookie(firestoreRole);
      
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email);
      setUser(user);
      
      if (user) {
        try {
          // Get ID token to set in cookie (if needed elsewhere)
          const idToken = await user.getIdToken();
          document.cookie = `idToken=${idToken}; path=/; max-age=3600; SameSite=Lax`;
          
          // Get role from Firestore FIRST
          const firestoreRole = await getUserRoleFromFirestore(user.uid);
          console.log("User role from Firestore:", firestoreRole);
          
          // Check if cookie role matches Firestore role
          const cookieRole = getRoleFromCookie();
          console.log("Current role from cookie:", cookieRole);
          
          if (cookieRole !== firestoreRole) {
            console.log("Role mismatch detected. Updating cookie...");
            setRoleCookie(firestoreRole);
          }
          
          // Set the role in state (always use Firestore role as source of truth)
          setUserRole(firestoreRole);
          
        } catch (error) {
          console.error('Error setting up user session:', error);
          // Fallback to cookie or default
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
  }, []);

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
      
      // Redirect to login page
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
    refreshUserRole, // Export the refresh function
  };

return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
)
}