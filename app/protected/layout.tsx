// app/(protected)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    if (!token) {
      // ❌ Not logged in → send to login page
      router.replace("/login");
    } else {
      // ✅ Logged in → allow page to render
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) {
    // Small loader while checking token
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e9f4ff]">
        <p className="text-sm text-slate-700">Checking authentication…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
