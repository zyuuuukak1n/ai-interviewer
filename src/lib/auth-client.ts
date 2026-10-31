import { createAuthClient } from "better-auth/react";

function getOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const authUrl = process.env.BETTER_AUTH_URL;
  if (authUrl) {
    try {
      return new URL(authUrl).origin;
    } catch {
      // fallback
    }
  }
  return "https://zyuuuukak1n.dev";
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/tools/ai-interviewer";

export const authClient = createAuthClient({
  baseURL: getOrigin(),
  basePath: `${basePath}/api/auth`,
});

export const { signIn, signUp, useSession, signOut } = authClient;
