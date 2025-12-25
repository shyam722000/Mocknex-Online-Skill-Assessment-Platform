"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";

import logo from "@/public/logodark.png";

export function Navbar() {
  const router = useRouter();
  const { user, isAdmin, logout, isAuthenticated } = useAuth();

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (isAdmin) {
      setDisplayName("Admin");
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    } else {
      setDisplayName("");
    }
  }, [isAdmin, user]);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    if (isAdmin || user) {
      await logout();
    }
    router.replace("/login");
  };

  if (!isAuthenticated) return null;

  return (
    <header className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT — User info */}
          <div className="flex items-center gap-2 min-w-0">
            {displayName && (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 shadow-sm">
                  {isAdmin ? "A" : "👤"}
                </div>

                <span className="font-medium text-sm text-gray-800 truncate max-w-[160px] md:max-w-[220px]">
                  {displayName}
                </span>

                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
              </div>
            )}
          </div>

          {/* CENTER — Bigger Logo (but navbar height stays controlled) */}
          <div className="flex-1 flex justify-center">
            <div
              className="cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-98"
              onClick={() => router.push("/")}
            >
              <div className="relative w-[160px] h-10 xs:w-[180px] sm:w-[220px] md:w-[260px] lg:w-[300px] xl:w-[340px]">
                <Image
                  src={logo}
                  alt="NexLearn Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* RIGHT — Modern Logout Button */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className={`
                relative px-5 py-2.5
                text-sm font-medium text-white
                bg-gradient-to-r from-teal-600 to-cyan-600
                rounded-lg shadow-md
                overflow-hidden
                transition-all duration-300
                hover:shadow-lg hover:shadow-cyan-500/30
                active:scale-95
                group
                cursor-pointer
              `}
            >
              <span className="relative z-10">Logout</span>
              <span
                className={`
                  absolute inset-0
                  bg-gradient-to-r from-teal-500 to-cyan-500
                  opacity-0 group-hover:opacity-100
                  -translate-x-full group-hover:translate-x-0
                  transition-transform duration-500
                `}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}