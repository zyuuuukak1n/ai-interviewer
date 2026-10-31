import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3080/tools/ai-interviewer",
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
    },
  },
});

