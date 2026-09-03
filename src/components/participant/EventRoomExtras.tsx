import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, Megaphone, MessageCircle, Pencil, Trash2, Send, Video } from "lucide-react";
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

function Panel({
  icon,
  title,
  subtitle,
  children,
  accent = "muted",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: "muted" | "primary" | "live";
}) {
  const accentCls =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "live"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-muted text-muted-foreground";

  return (
    <section className="rounded-[1.75rem] border border-border/50 bg-card/90 backdrop-blur-sm p-5 sm:p-6 space-y-4 shadow-sm">
      <header className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accentCls}`}>
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

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
    <div className="space-y-5">
      {isOnline && onlineUrl && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-7 shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Video className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Live session</p>
              <h2 className="font-display font-semibold text-xl tracking-[-0.02em]">Join online</h2>
              <p className="text-sm text-muted-foreground">
                Your meeting link stays private here after registration.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full h-12 px-6 shrink-0 font-semibold">
              <a href={onlineUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open meeting
              </a>
            </Button>
          </div>
        </section>
      )}

      <Panel
        icon={<Megaphone className="w-5 h-5" />}
        title="Announcements"
        subtitle="Updates from the organizer appear here first"
        accent="primary"
      >
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No announcements yet — check back soon.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl bg-muted/35 hover:bg-muted/50 transition-colors px-4 py-3.5 space-y-1"
              >
                <p className="text-sm font-medium tracking-[-0.01em]">{a.subject}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        icon={<MessageCircle className="w-5 h-5" />}
        title="Ask a speaker"
        subtitle="Questions go to the organizer. You won’t see other participants’ questions."
        accent="live"
      >
        <div className="space-y-3">
          {speakers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Speaker (optional)</Label>
              <Select value={speakerId || "none"} onValueChange={(v) => setSpeakerId(v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-full bg-muted/30 border-0">
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
            className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-2 min-h-[96px]"
          />
          <Button
            type="button"
            className="rounded-full h-11 px-5"
            disabled={busy || !body.trim()}
            onClick={() => void handleAsk()}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit question
          </Button>
        </div>

        {discussions.length > 0 && (
          <ul className="space-y-2.5 pt-4 border-t border-border/50">
            {discussions.map((d) => (
              <li key={d.id} className="rounded-2xl bg-muted/30 px-4 py-3 space-y-2">
                {editingId === d.id ? (
                  <>
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="rounded-2xl bg-background/60 border-0"
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
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{d.body}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {d.speaker?.name ? `To ${d.speaker.name}` : "General"} · {d.status}
                      </p>
                      <div className="flex gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
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
                          className="h-8 w-8 rounded-full text-destructive"
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
      </Panel>
    </div>
  );
}
