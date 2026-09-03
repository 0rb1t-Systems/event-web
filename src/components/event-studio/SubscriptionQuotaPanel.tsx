/**
 * Compact package / quota summary for embeds (e.g. Payouts tab).
 * Full pricing UI lives on `/organizer/subscription`.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { IconArrowRight, IconPackage, IconRefresh } from "@/components/organizer-console/orgIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  getOrganizerQuota,
  getOrganizerSubscription,
  type OrganizerQuotaDetail,
  type OrganizerSubscriptionPayload,
} from "@/services/organizerPackages";

function quotaLabel(q: {
  unlimited: boolean;
  zero_quota: boolean;
  events_created: number;
  quota: number | null;
  remaining: number | null;
}) {
  if (q.unlimited) return `${q.events_created} events created · unlimited quota`;
  if (q.zero_quota) return `${q.events_created} events · zero quota (cannot create)`;
  return `${q.events_created} of ${q.quota ?? "—"} events used${
    q.remaining != null ? ` · ${q.remaining} remaining` : ""
  }`;
}

export default function SubscriptionQuotaPanel() {
  const [subscription, setSubscription] = useState<OrganizerSubscriptionPayload | null>(null);
  const [quota, setQuota] = useState<OrganizerQuotaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, q] = await Promise.all([getOrganizerSubscription(), getOrganizerQuota()]);
      setSubscription(sub);
      setQuota(q);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load subscription"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12" aria-busy="true" aria-label="Loading subscription">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const active = subscription?.active;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <IconPackage className="w-4 h-4 text-muted-foreground" />
            Package &amp; quota
          </h3>
          <p className="text-sm text-muted-foreground">
            Snapshot of your active plan. Subscribe or upgrade on the Plans page.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full shrink-0"
          onClick={() => void load()}
        >
          <IconRefresh className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border/40 space-y-2">
          <p className="text-sm text-muted-foreground">Active package</p>
          {active?.package || quota?.package ? (
            <>
              <p className="text-xl font-display font-bold">
                {active?.package?.name ?? quota?.package?.name}
              </p>
              <Badge variant="outline" className="capitalize bg-oc-brand-soft border-oc-brand/40 text-oc-brand-strong">
                {typeof active?.status === "string" ? active.status : "active"}
              </Badge>
              {active?.started_at && (
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(active.started_at), "MMM d, yyyy")}
                  {active.expires_at
                    ? ` · Expires ${format(new Date(active.expires_at), "MMM d, yyyy")}`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          )}
        </div>

        <div className="bg-card rounded-xl p-5 border border-border/40 space-y-2">
          <p className="text-sm text-muted-foreground">Event quota</p>
          {quota ? (
            <>
              <p className="text-xl font-display font-bold tabular-nums">
                {quota.unlimited
                  ? "Unlimited"
                  : quota.zero_quota
                    ? "0"
                    : `${quota.events_created} / ${quota.quota ?? "—"}`}
              </p>
              <p className="text-sm text-muted-foreground">{quotaLabel(quota)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Quota unavailable.</p>
          )}
        </div>
      </div>

      <Button asChild className="rounded-full">
        <Link to="/organizer/subscription">
          View plans &amp; pricing
          <IconArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
