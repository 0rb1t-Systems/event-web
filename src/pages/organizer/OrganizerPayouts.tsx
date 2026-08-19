import { useEffect, useState } from "react";
import { Wallet, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { getApiErrorMessage } from "@/lib/apiError";

function formatMoney(amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return `USD ${amount}`;
  }
}

export default function OrganizerPayouts() {
  const [available, setAvailable] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getOrganizerDashboard()
      .then((d) => {
        setAvailable(d.available_payout);
        setPending(d.pending_payout);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load payouts.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-3xl p-10 text-center mt-10">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-display font-bold mb-2">Couldn't load payouts</h1>
        <p className="text-muted-foreground text-sm mb-6">{error}</p>
        <Button className="rounded-full" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Payouts</h1>
        <p className="text-muted-foreground">Balances returned by your organizer dashboard. Requesting a payout is not available in this screen yet.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Available payout</span>
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold">{formatMoney(available ?? 0)}</p>
        </div>
        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Pending payout</span>
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold">{formatMoney(pending ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
