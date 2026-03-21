"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "gym-micro-theme";
const COOKIE_KEY = "theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      applyTheme(stored);
      setTheme(stored);
      return;
    }

    const fromClass: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    applyTheme(fromClass);
    setTheme(fromClass);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.cookie = `${COOKIE_KEY}=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
    setTheme(nextTheme);
  }

  return (
    <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label="Toggle dark mode">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
