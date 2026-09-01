import { useEffect, useRef } from "react";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { clearNewEventDraft } from "@/lib/eventDraft";

/** Participant pages share the public header so Home stays the same app. */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    clearNewEventDraft();
  }, []);

  return (
    <div className="house-page min-h-[100dvh] flex flex-col w-full min-w-0">
      <PublicSiteHeader />
      <main ref={mainRef} className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
