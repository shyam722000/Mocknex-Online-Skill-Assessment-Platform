"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import loginIllustration from "@/public/login-1.png";
import loginBG from "@/public/login-bg.png";
import logo from "@/public/logo.png";
import { apiPostsignup } from "../lib/api"; // ✅ new helper for FormData

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mobile passed from login: /signup?mobile=+911234567891
  const mobileFromQuery = searchParams.get("mobile") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [qualification, setQualification] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileFile(file);

    const url = URL.createObjectURL(file);
    setProfilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!qualification.trim()) {
      setError("Please enter your qualification.");
      return;
    }
    if (!profileFile) {
      setError("Please upload your profile image.");
      return;
    }
    if (!mobileFromQuery) {
      setError("Mobile number is missing. Please login again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build FormData for /auth/create-profile
      const formData = new FormData();
      formData.append("mobile", mobileFromQuery);
      formData.append("name", fullName.trim());
      formData.append("email", email.trim());
      formData.append("qualification", qualification.trim());
      formData.append("profile_image", profileFile);

      // ✅ Use multipart helper (handles FormData + auth)
      const res = await apiPostsignup("/auth/create-profile", formData);

      if (!res?.success) {
        setError(res?.message || "Registration failed. Please try again.");
        return;
      }

      // Save tokens from API
      if (res.access_token) {
        localStorage.setItem("access_token", res.access_token);
      }
      if (res.refresh_token) {
        localStorage.setItem("refresh_token", res.refresh_token);
      }
      if (res.user?.name) {
  localStorage.setItem("user_name", res.user.name);
}


      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6">
      <Image
        src={loginBG}
        alt="Background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-slate-950/75" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-3xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-1 sm:p-2">
          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-2 items-center">
            <div className="hidden md:flex rounded-2xl md:rounded-l-2xl md:rounded-r-none px-4 lg:px-5 py-3 lg:py-4 flex-col">
              <div className="flex justify-center items-center mb-3">
                <div className="relative w-32 h-10 lg:w-40 lg:h-12">
                  <Image
                    src={logo}
                    alt="NexLearn Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32 lg:w-40 lg:h-40">
                  <Image
                    src={loginIllustration}
                    alt="Learning Illustration"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            <div
              className="
                bg-white rounded-2xl border border-[#D1D5DB] shadow-sm 
                max-w-sm w-full max-h-[440px] overflow-y-auto 
                [scrollbar-width:none] [-ms-overflow-style:none] 
                [&::-webkit-scrollbar]:hidden
              "
            >
              <div className="p-4 sm:p-5 lg:p-5 flex flex-col h-full">
                <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                  <div className="flex flex-col flex-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#1C3141] mb-2">
                      Add Your Details
                    </h2>

                    <div className="mb-4 flex justify-center">
                      <div
                        onClick={handleProfileClick}
                        className="w-24 h-24 border border-dashed border-[#CBD5E1] rounded-2xl 
                                   flex flex-col items-center justify-center cursor-pointer 
                                   hover:bg-slate-50 transition overflow-hidden"
                      >
                        {profilePreview ? (
                          <img
                            src={profilePreview}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <div className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center mb-1">
                              <span className="text-base text-slate-500">+</span>
                            </div>
                            <p className="text-[11px] text-slate-500 text-center px-2">
                              Add Your Profile picture
                            </p>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfileChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="block text-sm font-medium text-[#4B5563] mb-1">
                        Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your Full Name"
                        className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm 
                                   outline-none placeholder:text-slate-400 bg-white text-[#111827]"
                      />
                    </div>

                    {/* Email */}
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-[#4B5563] mb-1">
                        Email<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your Email Address"
                        className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm 
                                   outline-none placeholder:text-slate-400 bg-white text-[#111827]"
                      />
                    </div>

                    <div className="mb-1">
                      <label className="block text-sm font-medium text-[#4B5563] mb-1">
                        Your qualification<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="Enter your qualification"
                        className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm 
                                   outline-none placeholder:text-slate-400 bg-white text-[#111827]"
                      />
                    </div>

                    {mobileFromQuery && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Mobile:{" "}
                        <span className="font-medium">{mobileFromQuery}</span>
                      </p>
                    )}

                    {error && (
                      <p className="mt-2 text-xs text-red-500">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 mb-1 cursor-pointer w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-black transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Get Started"}
                  </button>
                </form>
              </div>
            </div>
            {/* END RIGHT */}
          </div>
        </div>
      </div>
    </div>
  );
}
