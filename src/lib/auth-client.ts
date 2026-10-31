import { createAuthClient } from "better-auth/react";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return `${origin}${basePath}`;
  }
  return process.env.BETTER_AUTH_URL || "http://localhost:3080/tools/ai-interviewer";
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
});

export const { signIn, signUp, useSession, signOut } = authClient;
