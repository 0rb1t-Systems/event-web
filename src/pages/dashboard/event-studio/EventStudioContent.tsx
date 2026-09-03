import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { IconPlus } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { useEventStudio } from "@/contexts/EventStudioContext";
import { StudioTabFrame } from "@/components/event-studio/StudioTabFrame";
import SpeakerCard from "@/components/event-studio/SpeakerCard";
import SpeakerForm, { emptySpeakerForm, speakerFormToBody, speakerToForm, type SpeakerFormValue } from "@/components/event-studio/SpeakerForm";
import SponsorCard from "@/components/event-studio/SponsorCard";
import SponsorForm, { emptySponsorForm, sponsorFormToBody, sponsorToForm, type SponsorFormValue } from "@/components/event-studio/SponsorForm";
import SessionTimeline from "@/components/event-studio/SessionTimeline";
import SessionForm, { emptySessionForm, sessionFormToBody, sessionToForm, type SessionFormValue } from "@/components/event-studio/SessionForm";
import {
  createOrganizerSession,
  createOrganizerSpeaker,
  createOrganizerSponsor,
  deleteOrganizerSession,
  deleteOrganizerSpeaker,
  deleteOrganizerSponsor,
  listOrganizerSessions,
  listOrganizerSpeakers,
  listOrganizerSponsors,
  updateOrganizerSession,
  updateOrganizerSpeaker,
  updateOrganizerSponsor,
  uploadOrganizerSpeakerPhoto,
  type OrganizerSession,
  type OrganizerSpeaker,
  type OrganizerSponsor,
} from "@/services/organizerEventContent";

function SectionCard({
  id,
  title,
  addLabel,
  onAdd,
  children,
}: {
  id: string;
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div id={id} className="bg-card rounded-xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3 className="font-display font-semibold min-w-0 truncate">{title}</h3>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={onAdd}>
          <IconPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{addLabel}</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      {children}
    </div>
  );
}

export default function EventStudioContent() {
  const { eventId, handleDenied } = useEventStudio();
  const [speakers, setSpeakers] = useState<OrganizerSpeaker[]>([]);
  const [sponsors, setSponsors] = useState<OrganizerSponsor[]>([]);
  const [sessions, setSessions] = useState<OrganizerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [speakerForm, setSpeakerForm] = useState<SpeakerFormValue | null>(null);
  const [speakerId, setSpeakerId] = useState<number | null>(null);
  const [sponsorForm, setSponsorForm] = useState<SponsorFormValue | null>(null);
  const [sponsorId, setSponsorId] = useState<number | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionFormValue | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [sp, so, se] = await Promise.all([
        listOrganizerSpeakers(eventId),
        listOrganizerSponsors(eventId),
        listOrganizerSessions(eventId),
      ]);
      setSpeakers(sp);
      setSponsors(so);
      setSessions(se);
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        handleDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load content"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [eventId]);

  const catchDenied = (err: unknown, fallback: string) => {
    if (isOrganizerEventAccessError(err)) handleDenied();
    else toast.error(getApiErrorMessage(err, fallback));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <StudioTabFrame title="Program">
      <SectionCard
        id="studio-speakers"
        title="Speakers"
        addLabel="Add speaker"
        onAdd={() => { setSpeakerId(null); setSpeakerForm(emptySpeakerForm()); }}
      >
        {speakers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 px-1 text-center text-pretty">No speakers yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 min-w-0">
            {speakers.map((s) => (
              <SpeakerCard
                key={s.id}
                speaker={s}
                onEdit={() => { setSpeakerId(s.id); setSpeakerForm(speakerToForm(s)); }}
                onDelete={async () => {
                  if (!confirm(`Remove ${s.name}?`)) return;
                  try {
                    await deleteOrganizerSpeaker(s.id);
                    setSpeakers((prev) => prev.filter((x) => x.id !== s.id));
                    toast.success("Speaker deleted");
                  } catch (err) { catchDenied(err, "Couldn't delete speaker"); }
                }}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        id="studio-sponsors"
        title="Sponsors"
        addLabel="Add sponsor"
        onAdd={() => { setSponsorId(null); setSponsorForm(emptySponsorForm()); }}
      >
        {sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 px-1 text-center text-pretty">No sponsors yet.</p>
        ) : (
          <div className="space-y-2 min-w-0">
            {sponsors.map((s) => (
              <SponsorCard
                key={s.id}
                sponsor={s}
                onEdit={() => { setSponsorId(s.id); setSponsorForm(sponsorToForm(s)); }}
                onDelete={async () => {
                  if (!confirm(`Remove ${s.name}?`)) return;
                  try {
                    await deleteOrganizerSponsor(s.id);
                    setSponsors((prev) => prev.filter((x) => x.id !== s.id));
                    toast.success("Sponsor deleted");
                  } catch (err) { catchDenied(err, "Couldn't delete sponsor"); }
                }}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        id="studio-sessions"
        title="Agenda"
        addLabel="Add session"
        onAdd={() => { setSessionId(null); setSessionForm(emptySessionForm()); }}
      >
        <SessionTimeline
          sessions={sessions}
          onEdit={(s) => { setSessionId(s.id); setSessionForm(sessionToForm(s)); }}
          onDelete={async (s) => {
            if (!confirm(`Remove “${s.title}”?`)) return;
            try {
              await deleteOrganizerSession(s.id);
              setSessions((prev) => prev.filter((x) => x.id !== s.id));
              toast.success("Session deleted");
            } catch (err) { catchDenied(err, "Couldn't delete session"); }
          }}
        />
      </SectionCard>

      <Dialog open={!!speakerForm} onOpenChange={(o) => !o && setSpeakerForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{speakerId ? "Edit speaker" : "New speaker"}</DialogTitle></DialogHeader>
          {speakerForm && <SpeakerForm value={speakerForm} onChange={setSpeakerForm} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpeakerForm(null)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              if (!speakerForm?.name.trim()) { toast.error("Name is required"); return; }
              setSaving(true);
              try {
                const body = speakerFormToBody(speakerForm);
                if (speakerId) {
                  await updateOrganizerSpeaker(speakerId, body);
                  if (speakerForm.photo_file) {
                    await uploadOrganizerSpeakerPhoto(speakerId, speakerForm.photo_file);
                  }
                } else {
                  await createOrganizerSpeaker(eventId, body, speakerForm.photo_file);
                }
                toast.success("Speaker saved");
                setSpeakerForm(null);
                await load();
              } catch (err) { catchDenied(err, "Couldn't save speaker"); }
              finally { setSaving(false); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sponsorForm} onOpenChange={(o) => !o && setSponsorForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sponsorId ? "Edit sponsor" : "New sponsor"}</DialogTitle></DialogHeader>
          {sponsorForm && <SponsorForm value={sponsorForm} onChange={setSponsorForm} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSponsorForm(null)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              if (!sponsorForm?.name.trim()) { toast.error("Name is required"); return; }
              setSaving(true);
              try {
                const body = sponsorFormToBody(sponsorForm);
                if (sponsorId) await updateOrganizerSponsor(sponsorId, body);
                else await createOrganizerSponsor(eventId, body);
                toast.success("Sponsor saved");
                setSponsorForm(null);
                await load();
              } catch (err) { catchDenied(err, "Couldn't save sponsor"); }
              finally { setSaving(false); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sessionForm} onOpenChange={(o) => !o && setSessionForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sessionId ? "Edit session" : "New session"}</DialogTitle></DialogHeader>
          {sessionForm && <SessionForm value={sessionForm} onChange={setSessionForm} speakers={speakers} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionForm(null)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              if (!sessionForm?.title.trim() || !sessionForm.starts_at) { toast.error("Title and start time are required"); return; }
              setSaving(true);
              try {
                const body = sessionFormToBody(sessionForm);
                if (sessionId) await updateOrganizerSession(sessionId, body);
                else await createOrganizerSession(eventId, body);
                toast.success("Session saved");
                setSessionForm(null);
                await load();
              } catch (err) { catchDenied(err, "Couldn't save session"); }
              finally { setSaving(false); }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudioTabFrame>
  );
}
