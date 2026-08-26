import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";
import { listOrganizerSpeakers, type OrganizerSpeaker } from "@/services/organizerEventContent";

type DiscussionRow = {
  id: number;
  body: string;
  status: string;
  created_at?: string;
  user?: { id: number; name: string } | null;
  speaker?: { id: number; name: string } | null;
};

type Props = {
  eventId: number;
  onDenied?: () => void;
};

export default function EventDiscussionsPanel({ eventId, onDenied }: Props) {
  const [items, setItems] = useState<DiscussionRow[]>([]);
  const [speakers, setSpeakers] = useState<OrganizerSpeaker[]>([]);
  const [speakerFilter, setSpeakerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 100 };
      if (speakerFilter !== "all") params.speaker_id = Number(speakerFilter);
      const { data } = await organizerApi.get<
        WrappedSuccess<{ items: DiscussionRow[] }>
      >(`/organizer/events/${eventId}/discussions`, { params });
      setItems(data.data.items ?? []);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load discussions"));
    } finally {
      setLoading(false);
    }
  }, [eventId, speakerFilter, onDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listOrganizerSpeakers(eventId)
      .then(setSpeakers)
      .catch(() => undefined);
  }, [eventId]);

  const markAnswered = async (id: number) => {
    setBusyId(id);
    try {
      await organizerApi.patch(`/organizer/events/${eventId}/discussions/${id}/answered`);
      toast.success("Marked answered");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-semibold">Discussions</h3>
        </div>
        <Select value={speakerFilter} onValueChange={setSpeakerFilter}>
          <SelectTrigger className="rounded-full w-full sm:w-56">
            <SelectValue placeholder="Filter by speaker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All speakers</SelectItem>
            {speakers.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Filter by speaker and hand this view to them so they can read questions live.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/60 p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{row.user?.name ?? "Participant"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.speaker?.name ? `To ${row.speaker.name}` : "General"} · {row.status}
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full capitalize">
                  {row.status}
                </Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{row.body}</p>
              {row.status !== "answered" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={busyId === row.id}
                  onClick={() => void markAnswered(row.id)}
                >
                  {busyId === row.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Mark answered
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
