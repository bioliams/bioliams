"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One tap between light and dark. The default follows the OS; the first tap
 * takes a side and next-themes remembers it.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // False during SSR and the first client render, true after — so the icon
  // never disagrees between server and client markup.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}
