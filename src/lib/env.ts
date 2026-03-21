/** Environment variable validation — run at startup */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { name: "DATABASE_URL", required: true, description: "PostgreSQL connection string" },
  { name: "NEXTAUTH_SECRET", required: true, description: "NextAuth encryption secret" },
  { name: "NEXTAUTH_URL", required: false, description: "NextAuth base URL (auto-detected on Vercel)" },
  { name: "GROQ_API_KEY", required: false, description: "Groq API key for AI summaries" },
  { name: "ELEVENLABS_API_KEY", required: false, description: "ElevenLabs API key for TTS" },
  { name: "UPSTASH_REDIS_REST_URL", required: false, description: "Upstash Redis REST URL" },
  { name: "UPSTASH_REDIS_REST_TOKEN", required: false, description: "Upstash Redis REST token" },
  { name: "GMAIL_USER", required: false, description: "Gmail address for sending OTP emails" },
  { name: "GMAIL_APP_PASSWORD", required: false, description: "Gmail App Password for SMTP" },
  { name: "CRON_SECRET", required: false, description: "Secret for cron job authentication" },
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    if (!process.env[v.name]) {
      if (v.required) {
        missing.push(`  - ${v.name}: ${v.description}`);
      } else {
        warnings.push(`  - ${v.name}: ${v.description}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`⚠ Optional env vars not set (features will be degraded):\n${warnings.join("\n")}`);
  }

  if (missing.length > 0) {
    console.error(`✗ Required env vars missing:\n${missing.join("\n")}`);
    throw new Error(`Missing required environment variables: ${missing.map((m) => m.split(":")[0].trim().replace("- ", "")).join(", ")}`);
  }
}

// Auto-validate on import in production
if (process.env.NODE_ENV === "production") {
  validateEnv();
}
