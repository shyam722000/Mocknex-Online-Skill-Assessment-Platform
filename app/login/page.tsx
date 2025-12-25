"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import loginIllustration from "@/public/login-1.png";
import loginBG from "@/public/login-bg.png";
import logo from "@/public/newloo.png";
import logodark from "@/public/logodark.png";

import GoogleLoginButton from "@/components/GoogleLoginButton";
import { useAuth } from "@/app/lib/context/AuthContext"; // adjust path if needed

export default function LoginPage() {
  const router = useRouter();
  const { loginAsAdmin, isAuthenticated, isAdmin, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const success = loginAsAdmin(username.trim(), password);

    if (success) {
      router.push("/admin");
    } else {
      setError("Invalid username or password");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6">
      {/* Background */}
      <Image
        src={loginBG}
        alt="Background"
        fill
        className="object-cover object-center"
        priority
      />

      <div className="absolute inset-0 bg-slate-950/75" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-2 sm:p-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-3 items-center">
            {/* LEFT — Login Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-6 flex flex-col border border-[#D1D5DB] shadow-sm max-w-sm w-full mx-auto">
              {/* Mobile Logo */}
              <div className="md:hidden flex justify-center items-center mb-4">
                <div className="relative w-28 h-9">
                  <Image src={logodark} alt="NexLearn Logo" fill className="object-contain" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold text-[#1C3141] mb-4">
                Login to your account
              </h2>

              <form >
                {/* Username */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-[#4B5563] mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-sm outline-none"
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4B5563] mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-sm outline-none"
                  />
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  onClick={handleAdminLogin}
                  className="w-full cursor-pointer py-3 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium mb-4 hover:bg-black transition"
                >
                  Login as Admin
                </button>
              </form>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-black" />
                <span className="text-xs text-gray-500">Use Google Sign-In for users</span>
                <div className="flex-1 h-px bg-black" />
              </div>

              {/* GOOGLE LOGIN */}
              <GoogleLoginButton />
            </div>

            {/* RIGHT — Illustration */}
            <div className="hidden md:flex rounded-2xl md:rounded-r-2xl md:rounded-l-none px-5 lg:px-6 py-5 lg:py-6 flex-col">
              <div className="flex justify-center items-center mb-4">
                <div className="relative w-36 h-12 lg:w-64 lg:h-24">
                  <Image src={logo} alt="NexLearn Logo" fill className="object-contain" />
                </div>
              </div>

              {/* You can add illustration here if you want */}
              {/* <Image src={loginIllustration} alt="Illustration" className="w-full" /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}