import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

function getOriginBaseUrl() {
  const url = process.env.BETTER_AUTH_URL || "https://zyuuuukak1n.dev";
  try {
    return new URL(url).origin;
  } catch {
    return "https://zyuuuukak1n.dev";
  }
}

function getGoogleRedirectUri() {
  const origin = getOriginBaseUrl();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/tools/ai-interviewer";
  return `${origin}${basePath}/api/auth/callback/google`;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  baseURL: getOriginBaseUrl(),
  basePath: "/api/auth",
  trustedOrigins: [
    "https://zyuuuukak1n.dev",
    "http://localhost:3080",
    "http://localhost:3000",
    "http://127.0.0.1:3080",
    "http://127.0.0.1:3000",
  ],
  secret: process.env.BETTER_AUTH_SECRET || "fallback_secret_at_least_32_characters_long",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      redirectURI: getGoogleRedirectUri(),
    },
  },
});

