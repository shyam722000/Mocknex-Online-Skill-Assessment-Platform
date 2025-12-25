// app/lib/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { signInWithGoogle, logout as firebaseLogout } from "../auth";

type UserRole = "admin" | "user" | null;

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;           // Firebase user (for google users)
  userRole: UserRole;
  loginAsAdmin: (username: string, password: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    // Check admin status from sessionStorage on mount
    const adminStatus = sessionStorage.getItem("isAdmin") === "true";
    setIsAdmin(adminStatus);

    return () => unsubscribe();
  }, []);

  // Sync admin status when it changes (optional - for robustness)
  useEffect(() => {
    const handleStorageChange = () => {
      const adminStatus = sessionStorage.getItem("isAdmin") === "true";
      setIsAdmin(adminStatus);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

// app/lib/context/AuthContext.tsx

// ... other imports ...

const loginAsAdmin = (username: string, password: string): boolean => {
  const validUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
  const validPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    console.error("❌ Admin credentials missing in .env.local");
    return false;
  }

  const success =
    username.trim() === validUser &&
    password === validPass;

  if (success) {
    sessionStorage.setItem("isAdmin", "true");
    setIsAdmin(true);
    return true;
  }

  return false;
};
  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
      // After successful google login → redirect handled in page / component
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const logout = async () => {
    // Logout from Firebase if logged in with Google
    if (firebaseUser) {
      await firebaseLogout();
    }

    // Clear admin session
    sessionStorage.removeItem("isAdmin");
    setIsAdmin(false);
  };

  const value: AuthState = {
    isAuthenticated: !!firebaseUser || isAdmin,
    isAdmin,
    user: firebaseUser,
    userRole: isAdmin ? "admin" : firebaseUser ? "user" : null,
    loginAsAdmin,
    loginWithGoogle,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}