"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ROLES = [
  { key: "DEVELOPER", label: "Developer", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", desc: "I write code daily" },
  { key: "QA_TESTER", label: "QA / Tester", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", desc: "I break things on purpose" },
  { key: "DESIGNER", label: "Designer", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", desc: "I design interfaces" },
  { key: "PRODUCT_MANAGER", label: "Product Manager", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", desc: "I ship products" },
  { key: "DATA_ANALYST", label: "Data Analyst", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", desc: "I crunch numbers" },
  { key: "DEVOPS_ENGINEER", label: "DevOps Engineer", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01", desc: "I keep things running" },
  { key: "ENGINEERING_MANAGER", label: "Eng Manager", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", desc: "I lead engineering teams" },
  { key: "FOUNDER", label: "Founder", icon: "M13 10V3L4 14h7v7l9-11h-7z", desc: "I build companies" },
] as const;

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    // Pass role to quiz page via query param
    router.push(`/onboarding/quiz?role=${selectedRole}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Greeting */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="text-gray-400">What best describes your role?</p>
          <p className="mt-1 text-sm text-gray-500">Step 1 of 2</p>
        </div>

        {/* Role grid */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.key;
            return (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key)}
                className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-center transition-all ${
                  isSelected
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-400 shadow-lg shadow-indigo-500/10"
                    : "border-white/10 bg-gray-900 text-gray-400 hover:border-white/20 hover:bg-gray-800"
                }`}
              >
                <svg
                  className={`h-6 w-6 ${isSelected ? "text-indigo-400" : "text-gray-500"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={role.icon} />
                </svg>
                <span className="text-sm font-semibold">{role.label}</span>
                <span className="text-[11px] text-gray-500">{role.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
