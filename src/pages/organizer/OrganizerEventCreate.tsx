import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage, isEventQuotaError } from "@/lib/apiError";
import { asEventMode, eventModeRequiresUrl, parseWhyAttendInput, type EventMode } from "@/lib/eventMode";
import { getOrganizerDashboard } from "@/services/organizerDashboard";
import { createOrganizerEvent, listEventCategories } from "@/services/organizerEvents";
import type { OrganizerQuota } from "@/types/organizer";

export default function OrganizerEventCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whyAttend, setWhyAttend] = useState("");
  const [eventMode, setEventMode] = useState<EventMode>("in_person");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [quotaBlock, setQuotaBlock] = useState<{ message: string; quota?: OrganizerQuota } | null>(null);

  useEffect(() => {
    listEventCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    if (eventModeRequiresUrl(eventMode) && !onlineUrl.trim()) {
      toast.error("Online URL is required for online and hybrid events");
      return;
    }
    setSaving(true);
    setQuotaBlock(null);
    try {
      const created = await createOrganizerEvent({
        title: trimmed,
        description: description.trim() || null,
        why_attend: parseWhyAttendInput(whyAttend),
        event_mode: eventMode,
        online_url: eventModeRequiresUrl(eventMode) ? onlineUrl.trim() : (onlineUrl.trim() || null),
        city: city.trim() || null,
        address: address.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        capacity: capacity ? Number(capacity) : null,
        registration_deadline: deadline ? new Date(deadline).toISOString() : null,
        event_category_id: categoryId === "none" ? null : Number(categoryId),
      });
      toast.success("Event created as draft");
      navigate(`/organizer/events/${created.id}`);
    } catch (err) {
      if (isEventQuotaError(err)) {
        const message = getApiErrorMessage(err, "You cannot create more events on this package.");
        try {
          const dash = await getOrganizerDashboard();
          setQuotaBlock({ message, quota: dash.quota });
        } catch {
          setQuotaBlock({ message });
        }
      } else {
        toast.error(getApiErrorMessage(err, "Couldn't create event"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => navigate("/organizer/events")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold">Create event</h1>
          <p className="text-muted-foreground">New events start as drafts. Status is set later with a transition.</p>
        </div>
      </div>

      {quotaBlock && (
        <div className="bg-destructive/10 rounded-xl p-5 space-y-2">
          <h2 className="font-display font-semibold">Event quota reached</h2>
          <p className="text-sm">{quotaBlock.message}</p>
          {quotaBlock.quota ? (
            <p className="text-sm text-muted-foreground">
              {quotaBlock.quota.unlimited
                ? `${quotaBlock.quota.events_created} events created · unlimited quota`
                : `${quotaBlock.quota.events_created} of ${quotaBlock.quota.quota ?? "—"} events used`}
              {quotaBlock.quota.remaining !== null && !quotaBlock.quota.unlimited
                ? ` · ${quotaBlock.quota.remaining} remaining`
                : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active package quota is available on this account. Contact support to change your plan.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold">Basics</h2>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input className="rounded-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea className="rounded-2xl min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Why attend</Label>
            <Textarea
              className="rounded-2xl min-h-[96px]"
              placeholder="One reason per line (max 6)"
              value={whyAttend}
              onChange={(e) => setWhyAttend(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="rounded-full"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold">When</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input type="datetime-local" className="rounded-full" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="datetime-local" className="rounded-full" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Registration deadline</Label>
              <Input type="datetime-local" className="rounded-full" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold">Where & capacity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Event mode</Label>
              <Select value={eventMode} onValueChange={(v) => setEventMode(asEventMode(v))}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min={0} className="rounded-full" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Unlimited" />
            </div>
            {eventModeRequiresUrl(eventMode) && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Online URL</Label>
                <Input type="url" className="rounded-full" placeholder="https://" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input className="rounded-full" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input className="rounded-full" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        </div>

        <Button type="submit" className="rounded-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Create draft
        </Button>
      </form>
    </div>
  );
}
