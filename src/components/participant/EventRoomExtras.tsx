import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Megaphone, MessageCircle, Pencil, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  createEventDiscussion,
  deleteEventDiscussion,
  getParticipationAnnouncements,
  listMyEventDiscussions,
  updateEventDiscussion,
  type ApiAnnouncement,
  type ApiDiscussion,
} from "@/services/participationService";
import { publicApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

type SpeakerOption = { id: number; name: string };

type Props = {
  participationId: number;
  eventId: number;
  onlineUrl?: string | null;
  isOnline: boolean;
};

export function EventRoomExtras({ participationId, eventId, onlineUrl, isOnline }: Props) {
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [discussions, setDiscussions] = useState<ApiDiscussion[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerOption[]>([]);
  const [body, setBody] = useState("");
  const [speakerId, setSpeakerId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const refresh = useCallback(async () => {
    const [ann, disc] = await Promise.allSettled([
      getParticipationAnnouncements(participationId),
      listMyEventDiscussions(eventId),
    ]);
    if (ann.status === "fulfilled") setAnnouncements(ann.value);
    if (disc.status === "fulfilled") setDiscussions(disc.value);
  }, [participationId, eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    // Speakers come from public event show (already registered participant can load).
    publicApi
      .get<WrappedSuccess<{ speakers?: SpeakerOption[] }>>(`/events/${eventId}`)
      .then((resp) => {
        const list = resp.data.data?.speakers;
        if (Array.isArray(list)) {
          setSpeakers(list.map((s) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {
        /* optional */
      });
  }, [eventId]);

  const handleAsk = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await createEventDiscussion(eventId, {
        body: body.trim(),
        speaker_id: speakerId ? Number(speakerId) : null,
      });
      setBody("");
      setSpeakerId("");
      toast.success("Question submitted");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not submit question"));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editBody.trim()) return;
    setBusy(true);
    try {
      await updateEventDiscussion(eventId, id, editBody.trim());
      setEditingId(null);
      toast.success("Question updated");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    setBusy(true);
    try {
      await deleteEventDiscussion(eventId, id);
      toast.success("Question deleted");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {isOnline && onlineUrl && (
        <div className="bg-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
          <h2 className="font-display font-semibold text-lg">Join online</h2>
          <p className="text-sm text-muted-foreground">
            Your meeting link is available here after registration.
          </p>
          <Button asChild className="rounded-full">
            <a href={onlineUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open meeting link
            </a>
          </Button>
        </div>
      )}

      <div className="bg-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-semibold text-lg">Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl bg-muted/40 p-3">
                <p className="text-sm font-medium">{a.subject}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-card rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-semibold text-lg">Ask a speaker</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Questions go to the organizer. Speakers answer live — you will not see other participants&apos; questions.
        </p>
        <div className="space-y-2">
          {speakers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Speaker (optional)</Label>
              <Select value={speakerId || "none"} onValueChange={(v) => setSpeakerId(v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Any / general" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any / general</SelectItem>
                  {speakers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Your question…"
            rows={3}
            className="rounded-2xl"
          />
          <Button
            type="button"
            className="rounded-full"
            disabled={busy || !body.trim()}
            onClick={() => void handleAsk()}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit question
          </Button>
        </div>

        {discussions.length > 0 && (
          <ul className="space-y-3 pt-2 border-t border-border/60">
            {discussions.map((d) => (
              <li key={d.id} className="rounded-2xl bg-muted/30 p-3 space-y-2">
                {editingId === d.id ? (
                  <>
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="rounded-2xl"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void handleSaveEdit(d.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{d.body}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {d.speaker?.name ? `To ${d.speaker.name}` : "General"} · {d.status}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(d.id);
                            setEditBody(d.body);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          disabled={busy}
                          onClick={() => void handleDelete(d.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
