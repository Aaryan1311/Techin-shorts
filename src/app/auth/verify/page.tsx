"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import OTPInput from "@/components/OTPInput";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  const handleVerify = async (code: string) => {
    setError("");
    setLoading(true);
    setOtpError(false);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setOtpError(true);
        setLoading(false);
        return;
      }

      // Show success state
      setSuccess(true);
      setLoading(false);

      // Auto-login using one-time login token from verify-otp response
      if (data.success && data.loginToken) {
        const signInRes = await signIn("credentials", {
          email: data.email,
          loginToken: data.loginToken,
          redirect: false,
        });

        if (signInRes?.ok) {
          setTimeout(() => { window.location.href = "/onboarding"; }, 1500);
          return;
        }
      }

      // Fallback: redirect to login if token-based login failed
      setTimeout(() => { window.location.href = "/auth/login?verified=true"; }, 1500);
    } catch {
      setError("Network error. Please try again.");
      setOtpError(true);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "verify" }),
      });

      if (res.ok) {
        setResendCountdown(59);
        setError("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to resend code");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Techie Shorts</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gray-900 p-8">
          {success ? (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">Email Verified!</h2>
              <p className="mb-4 text-sm text-gray-400">Redirecting...</p>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-center text-xl font-bold text-white">Verify Your Email</h2>
              <p className="mb-8 text-center text-sm text-gray-400">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-white">{email}</span>
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <OTPInput onComplete={handleVerify} disabled={loading} error={otpError} />
              </div>

              {loading && (
                <div className="mb-4 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}

              <p className="text-center text-sm text-gray-400">
                Didn&apos;t receive the code?{" "}
                {resendCountdown > 0 ? (
                  <span className="text-gray-500">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Resend
                  </button>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
