"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({
  children,
  forcedTheme,
}: {
  children: React.ReactNode;
  /** Set when admin has disabled dark mode site-wide. */
  forcedTheme?: "light";
}) {
  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
