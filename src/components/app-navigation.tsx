"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AppNavigationProps = {
  isAdmin: boolean;
};

export function AppNavigation({ isAdmin }: AppNavigationProps) {
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (mobileMenuRef.current) {
      mobileMenuRef.current.open = false;
    }
  }, [pathname]);

  function closeMobileMenu() {
    if (mobileMenuRef.current) {
      mobileMenuRef.current.open = false;
    }
  }

  const navLinks = [
    { href: "/routines", label: "Workout Plans" },
    { href: "/exercises", label: "Exercise Library" },
    { href: "/sessions", label: "Sessions" },
    { href: "/nutrition", label: "Nutrition" },
    { href: "/fasting", label: "Fasting" },
    { href: "/progress", label: "Progress" },
    { href: "/friends", label: "Friends" },
    { href: "/settings", label: "Settings" },
  ];

  if (isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin" });
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden items-center gap-1 overflow-x-auto text-sm md:flex no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-2 font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-accent-pink text-white shadow-[0_0_20px_rgba(255,92,92,0.3)]"
                  : "text-muted hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <details ref={mobileMenuRef} className="group md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-foreground/5 active:scale-95 group-open:rounded-b-none group-open:border-line">
          <span className="flex items-center gap-2">
            <span className="text-accent-pink">☰</span>
            <span>Menu</span>
          </span>
          <span className="text-[10px] text-muted transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="rounded-b-2xl border-x border-b border-line bg-surface p-2 shadow-2xl">
          <nav className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-accent-pink text-white"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </details>
    </>
  );
}
