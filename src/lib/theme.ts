import type { CSSProperties } from "react";

export const themeTokenDefinitions = [
  {
    key: "background",
    cssVar: "--background",
    label: "Background",
    lightDefault: "#ffffff",
    darkDefault: "#000000",
  },
  {
    key: "foreground",
    cssVar: "--foreground",
    label: "Foreground",
    lightDefault: "#09090b",
    darkDefault: "#ffffff",
  },
  {
    key: "surface",
    cssVar: "--surface",
    label: "Surface",
    lightDefault: "#f4f4f5",
    darkDefault: "#09090b",
  },
  {
    key: "surfaceSoft",
    cssVar: "--surface-soft",
    label: "Soft surface",
    lightDefault: "#fafafa",
    darkDefault: "#111113",
  },
  {
    key: "surfaceRaised",
    cssVar: "--surface-raised",
    label: "Raised surface",
    lightDefault: "#ffffff",
    darkDefault: "#09090b",
  },
  {
    key: "line",
    cssVar: "--line",
    label: "Line",
    lightDefault: "#e4e4e7",
    darkDefault: "#18181b",
  },
  {
    key: "lineStrong",
    cssVar: "--line-strong",
    label: "Strong line",
    lightDefault: "#d4d4d8",
    darkDefault: "#3f3f46",
  },
  {
    key: "muted",
    cssVar: "--muted",
    label: "Muted text",
    lightDefault: "#71717a",
    darkDefault: "#a1a1aa",
  },
  {
    key: "accent",
    cssVar: "--accent",
    label: "Primary accent",
    lightDefault: "#ff5c5c",
    darkDefault: "#ff5c5c",
  },
  {
    key: "accentCyan",
    cssVar: "--accent-cyan",
    label: "Cyan accent",
    lightDefault: "#06b6d4",
    darkDefault: "#70e0e0",
  },
  {
    key: "accentYellow",
    cssVar: "--accent-yellow",
    label: "Yellow accent",
    lightDefault: "#eab308",
    darkDefault: "#f9d423",
  },
  {
    key: "accentPurple",
    cssVar: "--accent-purple",
    label: "Purple accent",
    lightDefault: "#a855f7",
    darkDefault: "#c084fc",
  },
] as const;

export type ThemeTokenKey = (typeof themeTokenDefinitions)[number]["key"];
export type ThemeMode = "light" | "dark";
export type ThemeTokenOverrides = Partial<Record<ThemeTokenKey, string>>;

const themeTokenKeys = new Set<string>(themeTokenDefinitions.map((token) => token.key));
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function normalizeThemeOverrides(value: unknown): ThemeTokenOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: ThemeTokenOverrides = {};
  for (const [key, rawColor] of Object.entries(value)) {
    if (!themeTokenKeys.has(key) || typeof rawColor !== "string") {
      continue;
    }

    const color = rawColor.trim();
    if (hexColorPattern.test(color)) {
      normalized[key as ThemeTokenKey] = color.toLowerCase();
    }
  }

  return normalized;
}

export function themeOverridesToStyle(overrides: ThemeTokenOverrides): CSSProperties {
  const style = {} as CSSProperties & Record<string, string>;

  for (const token of themeTokenDefinitions) {
    const color = overrides[token.key];
    if (color) {
      style[token.cssVar] = color;
    }
  }

  return style;
}

export function getThemeTokenDefault(
  token: (typeof themeTokenDefinitions)[number],
  themeMode: ThemeMode,
) {
  return themeMode === "dark" ? token.darkDefault : token.lightDefault;
}
