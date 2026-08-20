import { Loader2 } from "lucide-react";

/** Lightweight route Suspense fallback — keeps shell chrome visible. */
export function RouteFallback() {
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
