"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("anadash-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-muted transition hover:bg-paper hover:text-ink"
    >
      <span className="text-base leading-none">{isDark ? "☀️" : "🌙"}</span>
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
