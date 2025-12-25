"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

const PUBLIC_ROUTES = ["/login"];

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (PUBLIC_ROUTES.includes(pathname)) {
        if (user) {
          // User is logged in and on login page → redirect to home
          router.replace("/");
          // Optional: keep loading until redirect completes
          return;
        } else {
          // Not logged in, on login page → allow
          setIsLoading(false);
        }
      } else {
        // Protected route
        if (user) {
          setIsLoading(false);
        } else {
          router.replace("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // For public routes when not logged in, or protected when logged in
  return <>{children}</>;
}