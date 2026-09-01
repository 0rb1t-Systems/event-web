import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="house-page flex min-h-[100dvh] flex-col" data-testid="page-not-found">
      <PublicSiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="text-center">
          <p className="font-mono text-sm text-primary">404</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-3 text-muted-foreground">That URL is not in this site.</p>
          <Button className="mt-6 rounded-full" asChild>
            <Link to="/" data-testid="not-found-home-link">
              Home
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
