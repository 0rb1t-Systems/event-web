import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import {
  listOrganizerAnnouncements,
  sendOrganizerAnnouncement,
  type OrganizerAnnouncement,
} from "@/services/organizerAnnouncements";

type Props = {
  eventId: number;
  onDenied?: () => void;
};

export default function AnnouncementsPanel({ eventId, onDenied }: Props) {
  const [items, setItems] = useState<OrganizerAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrganizerAnnouncements(eventId, { per_page: 50, page: 1 });
      setItems(data.items);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load announcements"));
    } finally {
      setLoading(false);
    }
  }, [eventId, onDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      const result = await sendOrganizerAnnouncement(eventId, {
        subject: subject.trim(),
        body: body.trim(),
      });
      toast.success(result.message);
      setOpen(false);
      setSubject("");
      setBody("");
      await load();
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't send announcement"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            Announcements
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Messages are emailed to non-cancelled participants and stored as sent.
          </p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Send
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl bg-muted/40 p-4 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{a.subject}</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Sent
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{a.body}</p>
              <p className="text-xs text-muted-foreground">
                {a.sent_at
                  ? format(new Date(a.sent_at), "MMM d, yyyy 'at' h:mm a")
                  : "—"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Send announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-full"
                maxLength={255}
                placeholder="Event update"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="rounded-2xl"
                maxLength={10000}
                placeholder="Write your message to participants…"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recipient count is confirmed after send (all non-cancelled participants).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" disabled={sending} onClick={() => void handleSend()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
