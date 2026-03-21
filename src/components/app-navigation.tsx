"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavigationProps = {
  isAdmin: boolean;
};

export function AppNavigation({ isAdmin }: AppNavigationProps) {
  const pathname = usePathname();
  const hideMenu = pathname === "/dashboard";

  if (hideMenu) {
    return null;
  }

  return (
    <>
      <nav className="hidden items-center gap-2 text-sm text-slate-700 md:flex">
        <Link href="/routines" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Workout Plans
        </Link>
        <Link href="/exercises" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Exercise Library
        </Link>
        <Link href="/sessions" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Sessions
        </Link>
        <Link href="/nutrition" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Nutrition
        </Link>
        <Link href="/fasting" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Fasting
        </Link>
        <Link href="/progress" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Progress
        </Link>
        <Link href="/friends" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Friends
        </Link>
        <Link href="/settings" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
          Settings
        </Link>
        {isAdmin ? (
          <Link href="/admin" className="rounded-md px-2 py-1 whitespace-nowrap hover:bg-slate-100">
            Admin
          </Link>
        ) : null}
      </nav>

      <details className="group md:hidden">
        <summary className="menu-trigger flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-bold shadow-sm transition group-open:rounded-b-none">
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">☰</span>
            <span>Open Menu</span>
          </span>
          <span className="menu-trigger-caret text-xs font-semibold transition group-open:rotate-180">▼</span>
        </summary>
        <p className="menu-trigger-hint rounded-b-lg border-x border-b px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
          Choose a section
        </p>
        <nav className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <Link
            href="/routines"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Workout Plans
          </Link>
          <Link
            href="/exercises"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Exercise Library
          </Link>
          <Link
            href="/sessions"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Sessions
          </Link>
          <Link
            href="/nutrition"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Nutrition
          </Link>
          <Link
            href="/fasting"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Fasting
          </Link>
          <Link
            href="/progress"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Progress
          </Link>
          <Link
            href="/friends"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Friends
          </Link>
          <Link
            href="/settings"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
          >
            Settings
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs whitespace-nowrap sm:text-sm hover:bg-slate-50"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </details>
    </>
  );
}
