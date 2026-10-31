"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { MessageSquareText, History, LogIn, LogOut, User, PlusCircle } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
            <MessageSquareText className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">AI Interviewer</span>
            <span className="hidden text-xs text-blue-400 font-medium sm:inline-block ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              Gemini 3.8 Live
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/interview/setup"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">面接を始める</span>
            <span className="sm:hidden">開始</span>
          </Link>

          <Link
            href="/history"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/history"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">面接履歴</span>
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3 sm:pl-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden md:inline max-w-[120px] truncate">{session.user.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="ログアウト"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>ログイン</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
