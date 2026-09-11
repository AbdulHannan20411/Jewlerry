"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateThemePreferenceAction } from "@/lib/auth/actions";
import { useMounted } from "@/hooks/use-mounted";
import type { ThemePreference } from "@/types/database";

const allOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies { value: ThemePreference; label: string; icon: typeof Sun }[];

export function ThemeToggle({
  persistForUser = false,
  allowDark = true,
}: {
  /** Signed-in users get their choice saved to profiles.theme_preference. */
  persistForUser?: boolean;
  /** Set false when admin has disabled dark mode site-wide. */
  allowDark?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const options = allowDark ? allOptions : allOptions.filter((o) => o.value !== "dark");

  function handleChange(value: ThemePreference) {
    setTheme(value);
    if (persistForUser) {
      void updateThemePreferenceAction(value);
    }
  }

  if (!mounted) {
    // Avoids a hydration mismatch (server doesn't know the stored theme)
    // while keeping the same footprint to prevent layout shift.
    return <div className="h-9 w-[168px]" aria-hidden="true" />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-border p-0.5"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handleChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
