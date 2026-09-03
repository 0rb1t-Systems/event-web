import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EventCatalogCard } from "@/components/catalog/EventCatalogCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePublicCategories, usePublicEventList } from "@/hooks/queries/usePublicEvents";
import { cn } from "@/lib/utils";

function pageItems(current: number, last: number): Array<number | "gap"> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const items: Array<number | "gap"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < last - 1) items.push("gap");
  items.push(last);
  return items;
}

function CategoryFilters({
  cats,
  categoryId,
  onSelect,
}: {
  cats: Array<{ id: number; name: string }>;
  categoryId: number | "";
  onSelect: (id: number | "") => void;
}) {
  return (
    <div className="space-y-2" role="group" aria-label="Category">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
          categoryId === "" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border",
            categoryId === "" ? "border-primary bg-primary" : "border-input bg-card",
          )}
        >
          {categoryId === "" ? <span className="h-1.5 w-1.5 rounded-sm bg-white" /> : null}
        </span>
        All categories
      </button>
      {cats.map((c) => (
        <button
          type="button"
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
            categoryId === c.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              categoryId === c.id ? "border-primary bg-primary" : "border-input bg-card",
            )}
          >
            {categoryId === c.id ? <span className="h-1.5 w-1.5 rounded-sm bg-white" /> : null}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

export default function BrowseEvents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const submitted = searchParams.get("q") ?? "";
  const categoryRaw = searchParams.get("category");
  const categoryId = categoryRaw && Number.isFinite(Number(categoryRaw)) ? Number(categoryRaw) : ("" as const);
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const [search, setSearch] = useState(submitted);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearch(submitted);
  }, [submitted]);

  const categories = usePublicCategories();
  const catalog = usePublicEventList({
    page,
    per_page: 12,
    q: submitted,
    categoryId,
  });

  const events = catalog.data?.data ?? [];
  const lastPage = catalog.data?.last_page ?? 1;
  const total = catalog.data?.total;
  const cats = categories.data?.data ?? [];
  const pages = useMemo(() => pageItems(page, lastPage), [page, lastPage]);

  const updateParams = (next: { q?: string; category?: number | ""; page?: number }) => {
    const params = new URLSearchParams();
    const q = next.q !== undefined ? next.q : submitted;
    const cat = next.category !== undefined ? next.category : categoryId;
    const p = next.page !== undefined ? next.page : 1;
    if (q.trim()) params.set("q", q.trim());
    if (cat !== "") params.set("category", String(cat));
    if (p > 1) params.set("page", String(p));
    setSearchParams(params);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    updateParams({ q: search, page: 1 });
  };

  const clearAll = () => {
    setSearch("");
    setSearchParams(new URLSearchParams());
  };

  const filterBody = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <button type="button" className="text-sm text-primary hover:underline" onClick={clearAll}>
          Clear all
        </button>
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Categories</p>
      <CategoryFilters
        cats={cats}
        categoryId={categoryId}
        onSelect={(id) => {
          updateParams({ category: id, page: 1 });
          setFiltersOpen(false);
        }}
      />
    </>
  );

  return (
    <div className="house-page flex min-h-[100dvh] min-w-0 flex-col">
      <PublicSiteHeader />

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-8 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Upcoming events</h1>
            {typeof total === "number" ? (
              <p className="text-sm text-muted-foreground">
                {total} listing{total === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={onSearch}>
            <label className="sr-only" htmlFor="browse-search">
              Search events
            </label>
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="browse-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or city"
                className="h-10 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="rounded-full">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="rounded-full lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-5">
                <SheetHeader>
                  <SheetTitle className="sr-only">Filters</SheetTitle>
                </SheetHeader>
                {filterBody}
              </SheetContent>
            </Sheet>
          </form>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-5 py-8 sm:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">{filterBody}</aside>

        <div className="min-w-0 flex-1">
          {catalog.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[16/9] rounded-xl" />
              ))}
            </div>
          ) : catalog.isError ? (
            <p className="text-sm text-muted-foreground">Could not load events. Try again.</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events match those filters.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCatalogCard key={event.id} event={event} variant="grid" />
              ))}
            </div>
          )}

          {lastPage > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                disabled={page <= 1}
                aria-label="Previous page"
                onClick={() => updateParams({ page: page - 1 })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pages.map((item, i) =>
                item === "gap" ? (
                  <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant={item === page ? "default" : "outline"}
                    size="icon"
                    className="rounded-xl"
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => updateParams({ page: item })}
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                disabled={page >= lastPage}
                aria-label="Next page"
                onClick={() => updateParams({ page: page + 1 })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
