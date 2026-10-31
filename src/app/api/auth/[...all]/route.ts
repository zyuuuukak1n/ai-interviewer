import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handlers = toNextJsHandler(auth.handler);

export async function POST(req: NextRequest) {
  try {
    const res = await handlers.POST(req);
    if (!res.ok) {
      const clone = res.clone();
      const bodyText = await clone.text().catch(() => "");
      console.error(`[Better Auth POST Error] Status: ${res.status}, URL: ${req.url}, Body: ${bodyText}`);
    } else {
      console.log(`[Better Auth POST Success] URL: ${req.url}, Status: ${res.status}`);
    }
    return res;
  } catch (err: any) {
    console.error("[Better Auth POST Exception]:", err);
    throw err;
  }
}

export async function GET(req: NextRequest) {
  try {
    const res = await handlers.GET(req);
    if (!res.ok) {
      const clone = res.clone();
      const bodyText = await clone.text().catch(() => "");
      console.error(`[Better Auth GET Error] Status: ${res.status}, URL: ${req.url}, Body: ${bodyText}`);
    }
    return res;
  } catch (err: any) {
    console.error("[Better Auth GET Exception]:", err);
    throw err;
  }
}
