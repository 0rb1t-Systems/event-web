import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EventCatalogCard } from "@/components/catalog/EventCatalogCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { useMyParticipations } from "@/hooks/queries/useParticipations";
import { usePublicCategories, usePublicEventList } from "@/hooks/queries/usePublicEvents";
import { pickNextParticipation } from "@/lib/nextEvent";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/hero-bg.jpg";

export default function Landing() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { isAuthenticated: organizerAuthed } = useOrganizer();
  const categories = usePublicCategories();
  const parts = useMyParticipations(!!user);
  const next = user ? pickNextParticipation(parts.data?.items ?? []) : null;

  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const catalog = usePublicEventList({
    page: 1,
    per_page: 12,
    q: submitted,
    categoryId,
  });

  const events = catalog.data?.data ?? [];
  const total = catalog.data?.total;
  const cats = categories.data?.data ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "You";

  const browseHref = (() => {
    const params = new URLSearchParams();
    if (submitted.trim()) params.set("q", submitted.trim());
    if (categoryId !== "") params.set("category", String(categoryId));
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  })();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted([what, where].map((s) => s.trim()).filter(Boolean).join(" "));
    document.getElementById("events")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="house-page landing-page flex min-h-[100dvh] min-w-0 flex-col">
      <PublicSiteHeader />

      {user && next?.event ? (
        <div className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <p className="text-sm text-muted-foreground">
              Next up: <span className="font-medium text-foreground">{next.event.title}</span>
            </p>
            <Button size="sm" className="rounded-full" asChild>
              <Link to="/dashboard/rooms">Rooms</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <section className="bg-background px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="relative isolate min-h-[22rem] overflow-hidden rounded-2xl sm:min-h-[28rem] lg:min-h-[34rem]">
            <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/62 to-zinc-950/28" />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex min-h-[22rem] max-w-2xl flex-col justify-end px-6 pb-14 pt-8 sm:min-h-[28rem] sm:px-8 sm:pb-16 lg:min-h-[34rem] lg:px-10 lg:pb-20"
            >
              {user ? (
                <p className="text-sm text-white/70">Welcome back, {firstName}</p>
              ) : null}
              <h1 className="font-display text-[2rem] font-semibold leading-[1.12] tracking-tight text-white sm:text-[2.5rem] lg:text-[3rem]">
                Find events worth showing up for.
              </h1>
              <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-white/80 sm:text-lg">
                Search the catalog, register on the event page, and keep the pass in My Tickets.
              </p>
            </motion.div>
          </div>

          <form
            onSubmit={onSearch}
            className="house-card relative z-10 mx-auto -mt-8 flex max-w-7xl flex-col gap-2.5 rounded-2xl border border-border bg-card p-2.5 sm:-mt-10 sm:flex-row sm:items-center sm:p-3"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-primary" />
              <span className="sr-only">Event name</span>
              <input
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="Event name"
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <label className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="sr-only">Location</span>
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Location"
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </label>
            <Button type="submit" className="h-11 rounded-full sm:min-w-[8rem]">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>
      </section>

      <section id="events" className="scroll-mt-20 bg-background">
        <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-11">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">What&apos;s on</h2>
            <Link
              to={browseHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Browse events
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {typeof total === "number" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {total} listing{total === 1 ? "" : "s"}
              {submitted || categoryId !== "" ? " matching these filters" : ""}
            </p>
          ) : null}

          {cats.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Category">
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className={cn(
                  "h-9 cursor-pointer rounded-full border px-3.5 text-sm transition-colors",
                  categoryId === ""
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                All
              </button>
              {cats.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "h-9 cursor-pointer rounded-full border px-3.5 text-sm transition-colors",
                    categoryId === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            {catalog.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-[16/9] rounded-xl" />
                ))}
              </div>
            ) : catalog.isError ? (
              <p className="text-sm text-muted-foreground">Could not load events. Try Browse events.</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events match those filters.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <EventCatalogCard event={event} variant="grid" eager={i === 0} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-background px-5 pb-10 sm:px-8 sm:pb-12">
        <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-3xl">
          <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover grayscale" />
          <div className="absolute inset-0 bg-zinc-950/72" />
          <div className="relative flex min-h-[12rem] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[14rem] sm:py-12">
            <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">Create event</h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-white/80">
              Publish a listing, take registrations, and scan passes at the door.
            </p>
            <Button className="mt-5 h-10 rounded-full" asChild>
              <Link to={organizerAuthed ? "/organizer/events" : "/organizer/register"}>Create event</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
