import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { OrgTopbar } from "@/components/organizer-console/OrgTopbar";
import { OrgAppBar, OrgBottomNav } from "@/components/organizer-console/OrgMobileNav";
import { cn } from "@/lib/utils";

function isStudioRoute(pathname: string): boolean {
  return /^\/organizer\/events\/\d+(?:\/|$)/.test(pathname);
}

/**
 * Organizer console chrome.
 * Desktop: persistent `OrgTopbar` on every route, including Check-in and studio.
 * Studio is normal document flow: sticky section rail, native page scroll (wheel/touchpad).
 */
export function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const studio = isStudioRoute(pathname);

  return (
    <div className="org-console w-full min-w-0 min-h-[100dvh]">
      <OrgTopbar />
      {!studio && <OrgAppBar />}

      <main
        className={cn(
          "mx-auto w-full min-w-0 px-4 lg:px-6",
          studio
            ? "max-w-[1280px] py-4 pb-24 lg:py-0 lg:pb-10"
            : "max-w-[1200px] py-4 lg:py-6 pb-24 lg:pb-10",
        )}
      >
        {children}
      </main>

      <OrgBottomNav />
    </div>
  );
}
