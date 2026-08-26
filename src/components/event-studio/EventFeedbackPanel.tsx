import { useCallback, useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

type FeedbackRow = {
  id: number;
  rating: number;
  comment?: string | null;
  submitted_at?: string | null;
  participation?: {
    user?: { id: number; name: string; email?: string } | null;
  } | null;
};

type Props = {
  eventId: number;
  onDenied?: () => void;
};

export default function EventFeedbackPanel({ eventId, onDenied }: Props) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await organizerApi.get<
        WrappedSuccess<{
          average_rating: number | null;
          feedback_count: number;
          feedback: FeedbackRow[];
        }>
      >(`/organizer/events/${eventId}/feedback`);
      setRows(data.data.feedback ?? []);
      setAverage(data.data.average_rating);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load feedback"));
    } finally {
      setLoading(false);
    }
  }, [eventId, onDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-semibold">Attendee feedback</h3>
        {average != null && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {average} avg · {rows.length} responses
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/60 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {row.participation?.user?.name ?? "Attendee"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {row.rating}/5
                </p>
              </div>
              {row.comment && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
