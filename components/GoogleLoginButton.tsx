"use client";

import Image from "next/image";
import { useAuth } from "@/app/lib/context/AuthContext"; // adjust path if needed

export default function GoogleLoginButton() {
  const { user, logout, loginWithGoogle, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="text-center py-3 text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center gap-3 mt-2">
        
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="
        w-full flex items-center justify-center gap-3
        border border-gray-300 rounded-xl
        px-4 py-3
        text-sm font-medium text-gray-700
        hover:bg-gray-50
        active:scale-[0.98]
        transition
        cursor-pointer
      "
      type="button"
    >
      {/* Google Icon */}
      <Image
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        width={20}
        height={20}
      />
      <span>Continue with Google</span>
    </button>
  );
}