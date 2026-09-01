import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconMoon, IconSun } from "@/components/organizer-console/orgIcons";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Organizer chrome uses Heroicons; house chrome uses lucide. */
  tone?: "house" | "org";
};

/** Toggles the stored theme between light and dark. System stays available in Settings. */
export function ThemeToggle({ className, tone = "house" }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = mounted && resolvedTheme === "dark";
  const SunIcon = tone === "org" ? IconSun : Sun;
  const MoonIcon = tone === "org" ? IconMoon : Moon;

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        tone === "org"
          ? "text-oc-muted hover:bg-oc-surface hover:text-oc-ink"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
