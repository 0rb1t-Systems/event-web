import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, CheckCircle2,
  Clock, AlertTriangle, XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { publicApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  adaptPublicEventDetailToUi, adaptUiFormFields,
  type PublicEventDetailResponse, type PublicEventFormFieldResponse,
  type PublicEventUiModel, type UiFormField,
} from "@/lib/publicEventsAdapters";

import { PublicEventPage } from "@/components/event-public/PublicEventPage";
import { EventCountdown } from "@/components/event-public/EventCountdown";
import { PULSE } from "@/components/event-public/pulseTheme";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { TicketTier } from "@/components/event-detail/TicketTiersManager";
import { Ticket as TicketIcon, Crown, Check } from "lucide-react";
import {
  createParticipation,
  listParticipations,
  type ApiParticipation,
} from "@/services/participationService";
import {
  validateParticipantDiscountCode,
  type DiscountQuote,
} from "@/services/participantDiscounts";
import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";

type FormField = UiFormField;

const formatTicketPrice = (price: number, currency = "USD") => {
  if (!price) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
};

const formatMoneyString = (amount: string, currency = "USD") => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return formatTicketPrice(n, currency);
};

const TicketPicker = ({
  tickets, selectedId, onSelect, brandColor,
}: {
  tickets: TicketTier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  brandColor: string;
}) => (
  <div className="space-y-2.5">
    <div className="flex items-baseline justify-between">
      <Label className="text-sm font-medium text-slate-600">
        Choose your ticket
      </Label>
      <span className="text-[10px] text-muted-foreground">{tickets.length} available</span>
    </div>
    <div className="space-y-2">
      {tickets.map((t) => {
        const selected = selectedId === t.id;
        const soldOut = t.capacity !== null && t.capacity !== undefined && t.capacity <= 0;
        return (
          <motion.button
            type="button"
            key={t.id}
            onClick={() => !soldOut && onSelect(t.id)}
            whileTap={soldOut ? undefined : { scale: 0.99 }}
            disabled={soldOut}
            className={`group relative w-full overflow-hidden rounded-[1.25rem] border p-4 text-left transition-all ${
              soldOut
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                : selected
                  ? "border-transparent bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            style={selected && !soldOut ? {
              boxShadow: `0 0 0 1.5px ${brandColor}, 0 18px 40px -20px ${brandColor}66`,
            } : undefined}
          >
            {selected && !soldOut && (
              <motion.div
                layoutId="ticket-glow"
                className="absolute inset-0 -z-10 opacity-60"
                style={{ background: `radial-gradient(circle at 0% 50%, ${brandColor}1a, transparent 60%)` }}
              />
            )}
            <div className="flex items-center gap-3.5">
              <div
            className={`shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full transition ${
                  selected && !soldOut
                    ? "text-white"
                    : t.is_vip
                      ? "text-slate-700 bg-slate-100"
                      : "bg-slate-100 text-slate-500"
                }`}
                style={
                  selected && !soldOut
                    ? {
                        background: brandColor,
                      }
                    : undefined
                }
              >
                {t.is_vip ? <Crown className="w-4 h-4" /> : <TicketIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {t.name || "Untitled"}
                  </span>
                  {t.is_vip && (
                    <span
                      className="text-[9px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: brandColor, background: `${brandColor}1a` }}
                    >
                      VIP
                    </span>
                  )}
                  {soldOut && (
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Sold out
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                )}
              </div>
              <div className="text-right shrink-0 flex items-center gap-3">
                <div>
                  <div className="text-base font-display font-bold tabular-nums tracking-[-0.01em]">
                    {formatTicketPrice(t.price, t.currency || "USD")}
                  </div>
                </div>
                <div
                  className={`shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center transition ${
                    selected && !soldOut ? "scale-100" : "scale-0"
                  }`}
                  style={{ background: brandColor }}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>

          </motion.button>
        );
      })}
    </div>
  </div>
);

// ─── Single dynamic form field ───────────────────────────────────────────────

const DynamicField = ({
  field, value, onChange, brandColor,
}: {
  field: FormField;
  value: string;
  onChange: (key: string, value: string) => void;
  brandColor: string;
}) => {
  const inputClass = "h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-0";

  switch (field.field_type) {
    case "select": {
      const opts = Array.isArray(field.options) ? field.options : [];
      const normalized = opts.map((o) =>
        typeof o === "string" ? { value: o, label: o } : (o as { value: string; label: string })
      );
      return (
        <Select value={value || ""} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger className={inputClass} style={{ ["--tw-ring-color" as any]: brandColor }}>
            <SelectValue placeholder={field.placeholder || field.label} />
          </SelectTrigger>
          <SelectContent>
            {normalized.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "checkbox":
      return (
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={field.key}
            checked={value === "true"}
            onCheckedChange={(c) => onChange(field.key, c ? "true" : "false")}
          />
          <Label htmlFor={field.key} className="text-sm text-foreground/80 cursor-pointer">
            {field.placeholder || field.label}
          </Label>
        </div>
      );
    case "date":
      return (
        <Input
          type="date"
          required={field.required}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
          style={{ ["--tw-ring-color" as any]: brandColor }}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          placeholder={field.placeholder || field.label}
          required={field.required}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
          style={{ ["--tw-ring-color" as any]: brandColor }}
        />
      );
    default:
      return (
        <Input
          type="text"
          placeholder={field.placeholder || field.label}
          required={field.required}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
          style={{ ["--tw-ring-color" as any]: brandColor }}
        />
      );
  }
};

// ─── Result screens ───────────────────────────────────────────────────────────

const SuccessCard = ({
  brandColor, eventName, waitlisted, participationId,
}: {
  brandColor: string;
  eventName: string;
  waitlisted: boolean;
  participationId: number | null;
}) => {
  const navigate = useNavigate();
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 18 }}
      className="w-full mx-auto"
    >
      <div className="rounded-[1.75rem] bg-slate-50 p-8 text-center sm:p-10">
        <div className="relative inline-block mb-5">
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: brandColor }}
          >
            {waitlisted ? <Clock className="w-9 h-9 text-white" /> : <CheckCircle2 className="w-9 h-9 text-white" />}
          </div>
        </div>
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight">
          {waitlisted ? "You're on the waitlist" : "You're registered!"}
        </h2>
        <p className="text-slate-500 leading-relaxed">
          {waitlisted
            ? <>This event is at capacity. We&apos;ve added you to the waitlist for <strong className="text-slate-800">{eventName}</strong> and will notify you if a spot opens up.</>
            : <>Thank you for registering for <strong className="text-slate-800">{eventName}</strong>. You&apos;ll receive a confirmation email shortly.</>}
        </p>
        {!waitlisted && participationId && (
          <Button
            className="mt-6 h-10 rounded-full px-6 text-white border-0 font-semibold"
            style={{ background: brandColor }}
            onClick={() => navigate(`/registrations/${participationId}/room`)}
          >
            Enter event room
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const PaymentFailCard = ({
  brandColor, reason, onRetry,
}: {
  brandColor: string;
  reason: string;
  onRetry: () => void;
}) => (
  <motion.div
    key="fail"
    initial={{ opacity: 0, scale: 0.92, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ type: "spring", damping: 18 }}
    className="w-full mx-auto"
  >
    <div className="rounded-[1.75rem] bg-slate-50 p-8 text-center sm:p-10">
      <div className="relative inline-block mb-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red-50 mx-auto">
          <AlertTriangle className="w-9 h-9 text-destructive" />
        </div>
      </div>
      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Payment failed</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">{reason}</p>
      <Button
        className="h-10 rounded-full px-6 text-white border-0 font-semibold"
        style={{ background: brandColor }}
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  </motion.div>
);

// ─── Locked registration (sold out / closed / coming soon / etc.) ─────────────

type LockedReason =
  | "coming_soon"
  | "sold_out"
  | "registration_closed"
  | "deadline_passed"
  | "cancelled"
  | "completed"
  | "unavailable";

function resolveLockedReason(event: PublicEventUiModel): LockedReason | null {
  if (event.registration_gates?.allowed === true) return null;
  if (event.status === "sold_out") return "sold_out";
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed") return "completed";
  if (event.status === "registration_closed") return "registration_closed";
  if (event.registration_gates?.reason === "deadline_passed") return "deadline_passed";
  if (event.status === "ongoing") return "registration_closed";
  if (event.status === "published" || event.status === "draft") return "coming_soon";
  return "unavailable";
}

const LOCKED_COPY: Record<
  LockedReason,
  { title: string; body: string; icon: "clock" | "sold" | "closed" | "ended" | "cancel" }
> = {
  coming_soon: {
    title: "Coming soon",
    body: "Registration is not open yet. Check back when the organizer opens tickets.",
    icon: "clock",
  },
  sold_out: {
    title: "Sold out",
    body: "All seats for this event have been taken. Registration is no longer available.",
    icon: "sold",
  },
  registration_closed: {
    title: "Registration closed",
    body: "The organizer has closed registration for this event.",
    icon: "closed",
  },
  deadline_passed: {
    title: "Registration ended",
    body: "The registration deadline has passed. New registrations are no longer accepted.",
    icon: "ended",
  },
  cancelled: {
    title: "Event cancelled",
    body: "This event has been cancelled. Registration is not available.",
    icon: "cancel",
  },
  completed: {
    title: "Event ended",
    body: "This event has already finished. Registration is closed.",
    icon: "ended",
  },
  unavailable: {
    title: "Registration unavailable",
    body: "Registration is not available for this event right now.",
    icon: "closed",
  },
};

const RegistrationLockedPanel = ({
  reason,
  startsAt,
}: {
  reason: LockedReason;
  startsAt?: string | null;
}) => {
  const copy = LOCKED_COPY[reason];
  const Icon =
    copy.icon === "clock"
      ? Clock
      : copy.icon === "sold"
        ? TicketIcon
        : copy.icon === "cancel"
          ? XCircle
          : AlertTriangle;

  return (
    <div className="flex flex-col items-start gap-4 py-2">
      <Icon className="h-8 w-8 text-slate-400" />
      <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-slate-500">{copy.body}</p>
      {reason === "coming_soon" ? <EventCountdown targetIso={startsAt} tone="light" className="mt-2 justify-start" /> : null}
    </div>
  );
};

// ─── Registration form ────────────────────────────────────────────────────────

const RegistrationForm = ({
  formFields,
  formData,
  onFieldChange,
  consent,
  onConsentChange,
  onSubmit,
  isPending,
  submitDisabled,
  submitLabel,
  brandColor,
  tickets,
  selectedTicketId,
  onSelectTicket,
  discountCode,
  onDiscountCodeChange,
  discountQuote,
  discountApplying,
  discountError,
  onApplyDiscount,
  onClearDiscount,
  className = "",
}: {
  formFields: FormField[] | undefined;
  formData: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  brandColor: string;
  tickets: TicketTier[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  discountCode: string;
  onDiscountCodeChange: (v: string) => void;
  discountQuote: DiscountQuote | null;
  discountApplying: boolean;
  discountError: string | null;
  onApplyDiscount: () => void;
  onClearDiscount: () => void;
  className?: string;
}) => {
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const unitPrice = selectedTicket?.price ?? 0;
  const isPaid = !!selectedTicket && unitPrice > 0;
  const quoteFinal = discountQuote ? Number(discountQuote.final_amount) : null;
  const displayTotal =
    quoteFinal != null && Number.isFinite(quoteFinal)
      ? quoteFinal
      : unitPrice;
  const ctaLabel = isPending
    ? "Processing…"
    : isPaid
      ? `Get ticket · ${formatTicketPrice(displayTotal, selectedTicket.currency || "USD")}`
      : selectedTicket
        ? "Reserve my spot"
        : "Register now";

  const effectiveLabel = submitLabel ?? ctaLabel;

  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {tickets.length > 0 && (
        <TicketPicker
          tickets={tickets}
          selectedId={selectedTicketId}
          onSelect={onSelectTicket}
          brandColor={brandColor}
        />
      )}

      {isPaid && selectedTicketId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-600">
            Discount code
          </Label>
          <div className="flex gap-2">
            <Input
              value={discountCode}
              onChange={(e) => onDiscountCodeChange(e.target.value.toUpperCase())}
              placeholder="SAVE10"
            className="rounded-full uppercase"
              autoComplete="off"
              disabled={!!discountQuote || discountApplying}
            />
            {discountQuote ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={onClearDiscount}
              >
                Remove
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={onApplyDiscount}
                disabled={discountApplying || !discountCode.trim()}
              >
                {discountApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            )}
          </div>
          {discountError && (
            <p className="text-xs text-destructive">{discountError}</p>
          )}
          {discountQuote && (
            <p className="text-xs text-muted-foreground">
              Code <span className="font-medium text-foreground">{discountQuote.code}</span> applied
              {": "}
              save {formatMoneyString(discountQuote.discount_amount, selectedTicket?.currency || "USD")}
            </p>
          )}
        </div>
      )}

      {(formFields?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-600">
            Your details
          </Label>
        </div>
      )}

      <div className="space-y-3.5">
        {formFields?.map((field) => (
          <div key={field.id} className="space-y-1.5">
            {field.field_type !== "checkbox" && (
              <Label className="text-xs font-medium text-foreground/80">
                {field.label}{field.required && <span style={{ color: brandColor }}> *</span>}
              </Label>
            )}
            <DynamicField
              field={field}
              value={formData[field.key] || ""}
              onChange={onFieldChange}
              brandColor={brandColor}
            />
          </div>
        ))}
      </div>

      {isPaid && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Order total</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedTicket!.name}
              {discountQuote
                ? ` · was ${formatMoneyString(discountQuote.original_amount, selectedTicket!.currency || "USD")}`
                : ` @ ${formatTicketPrice(selectedTicket!.price, selectedTicket!.currency)}`}
            </p>
          </div>
          <div className="text-right">
            {discountQuote && (
              <div className="text-xs text-muted-foreground line-through tabular-nums">
                {formatMoneyString(discountQuote.original_amount, selectedTicket!.currency || "USD")}
              </div>
            )}
            <div className="text-xl font-display font-bold tabular-nums tracking-[-0.02em]" style={{ color: brandColor }}>
              {formatTicketPrice(displayTotal, selectedTicket!.currency || "USD")}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-start gap-2.5 pt-1">
        <Checkbox id="gdpr" checked={consent} onCheckedChange={(c) => onConsentChange(!!c)} className="mt-0.5" />
        <Label htmlFor="gdpr" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I agree to receive communications about this event and consent to the processing of my data in accordance with the Privacy Policy.
        </Label>
      </div>

      <Button
        type="submit"
        className="h-14 w-full rounded-full border-0 text-base font-semibold text-white"
        style={{ background: brandColor }}
        disabled={isPending || !!submitDisabled}
      >
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : effectiveLabel}
      </Button>
    </form>
  );
};

// ─── Registration step state ───────────────────────────────────────────────────

type RegistrationStep =
  | { kind: "form" }
  | { kind: "waafi"; participation: ApiParticipation }
  | { kind: "success"; participation: ApiParticipation; waitlisted: boolean }
  | { kind: "payment_failed"; participation: ApiParticipation; reason: string };

// ─── Main component ───────────────────────────────────────────────────────────

const Register = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const eventId = id ? Number(id) : NaN;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [event, setEvent] = useState<PublicEventUiModel | null>(null);
  const [formFields, setFormFields] = useState<FormField[] | undefined>(undefined);
  const [modules, setModules] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountQuote, setDiscountQuote] = useState<DiscountQuote | null>(null);
  const [discountApplying, setDiscountApplying] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [step, setStep] = useState<RegistrationStep>({ kind: "form" });

  // Track whether a charge is in flight (for navigation safety)
  const chargeInFlightRef = useRef(false);

  const tickets: TicketTier[] = event?.ticket_tiers ?? [];

  // Auto-select single ticket
  useEffect(() => {
    if (tickets.length === 1 && !selectedTicketId) setSelectedTicketId(tickets[0].id);
  }, [tickets, selectedTicketId]);

  const clearDiscount = useCallback(() => {
    setDiscountQuote(null);
    setDiscountError(null);
    setDiscountCode("");
  }, []);

  const handleSelectTicket = useCallback((id: string) => {
    setSelectedTicketId(id);
    setDiscountQuote(null);
    setDiscountError(null);
  }, []);

  const handleApplyDiscount = useCallback(async () => {
    if (!event || !selectedTicketId || !discountCode.trim()) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    setDiscountApplying(true);
    setDiscountError(null);
    try {
      const quote = await validateParticipantDiscountCode(event.id, {
        code: discountCode.trim(),
        ticket_type_id: Number(selectedTicketId),
      });
      setDiscountQuote(quote);
      setDiscountCode(quote.code);
      toast.success(`Code ${quote.code} applied`);
    } catch (err) {
      setDiscountQuote(null);
      setDiscountError(getApiErrorMessage(err, "This discount code can't be used."));
    } finally {
      setDiscountApplying(false);
    }
  }, [discountCode, event, navigate, selectedTicketId, user]);

  // Navigation safety: warn if a charge is pending
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!chargeInFlightRef.current) return;
      e.preventDefault();
      e.returnValue = "A payment is in progress. Are you sure you want to leave?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const formatSessionTime = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const buildModules = (ui: PublicEventUiModel): any[] => {
    const sessions = ui.sessions ?? [];
    const speakers = ui.speakers ?? [];
    const sponsors = ui.sponsors ?? [];

    const speakerPhoto = (sp: { photo_url?: string | null; photo_path?: string | null }) =>
      sp.photo_url ?? (sp.photo_path ? getMediaUrl(sp.photo_path) : undefined);

    const scheduleItems =
      sessions.length > 0
        ? sessions
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((s) => {
              const nested = s.speaker ?? null;
              const byId =
                s.speaker_id != null ? speakers.find((sp) => sp.id === s.speaker_id) : undefined;
              const sp = nested ?? byId;
              return {
                time: formatSessionTime(s.starts_at),
                endTime: formatSessionTime(s.ends_at),
                title: s.title || s.room || "Session",
                description: s.description || undefined,
                room: s.room || undefined,
                starts_at: s.starts_at,
                speaker: sp
                  ? { name: sp.name, avatar: speakerPhoto(sp) }
                  : undefined,
              };
            })
        : [];

    const people =
      speakers.length > 0
        ? speakers.map((sp) => ({
            name: sp.name,
            role: sp.title || sp.organization || "",
            avatar: speakerPhoto(sp),
            bio: sp.bio || undefined,
          }))
        : [];

    const partners =
      sponsors.length > 0
        ? sponsors.map((s) => {
            const raw =
              (s as { logo_url?: string | null }).logo_url || s.logo_path || null;
            return {
              name: s.name,
              logo: raw ? getMediaUrl(raw) : undefined,
            };
          })
        : [];

    const galleryUrls = (ui.images ?? [])
      .map((im) => (im.path ? getMediaUrl(im.path) : undefined))
      .filter(Boolean) as string[];

    const whyBullets = (ui.why_attend ?? []).map((b) => String(b).trim()).filter(Boolean).slice(0, 6);

    const modulesOut: any[] = [];

    if (whyBullets.length > 0) {
      modulesOut.push({
        id: "why-attend",
        type: "why_attend",
        enabled: true,
        position: 0,
        title: "Why Attend",
        content: {
          heading: "Why attend",
          bullets: whyBullets,
        },
      });
    }

    if (scheduleItems.length > 0) {
      modulesOut.push({
        id: "schedule",
        type: "schedule",
        enabled: true,
        position: 1,
        title: "Schedule",
        content: { heading: "Agenda overview", items: scheduleItems },
      });
    }

    if (people.length > 0) {
      modulesOut.push({
        id: "speakers",
        type: "speakers",
        enabled: true,
        position: 2,
        title: "Speakers",
        content: { heading: "Meet our speakers", people },
      });
    }

    if (partners.length > 0) {
      modulesOut.push({
        id: "sponsors",
        type: "sponsors",
        enabled: true,
        position: 3,
        title: "Partners",
        content: {
          heading: "Partners",
          partners,
          logos: partners.map((p) => p.logo).filter(Boolean) as string[],
        },
      });
    }

    // Never expose online_url on the public page — join link lives in the event room after register.
    const hasVenue = ui.location_type !== "virtual" && !!(ui.city || ui.location);
    const isOnline = ui.location_type === "virtual" || ui.location_type === "hybrid";
    if (hasVenue || isOnline) {
      modulesOut.push({
        id: "location",
        type: "location",
        enabled: true,
        position: 4,
        title: "Location",
        content: {
          heading: ui.location_type === "virtual" ? "Online event" : "Find us here",
          venue: ui.city ?? (ui.location_type === "virtual" ? "Online event" : undefined),
          address: ui.location ?? (isOnline && !hasVenue ? "Meeting link shared after registration" : undefined),
          image_url: ui.background_image_url || galleryUrls[0],
          showMap: hasVenue,
        },
      });
    }

    if (galleryUrls.length > 0) {
      modulesOut.push({
        id: "gallery",
        type: "gallery",
        enabled: true,
        position: 5,
        title: "Gallery",
        content: {
          heading: "Gallery",
          images: galleryUrls,
        },
      });
    }

    return modulesOut;
  };

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let redirected = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    const eventPromise = publicApi.get<PublicEventDetailResponse>(`/events/${eventId}`);
    const fieldsPromise = publicApi.get<PublicEventFormFieldResponse>(`/events/${eventId}/form-fields`);
    const participationPromise =
      user && Number.isFinite(eventId)
        ? listParticipations({ per_page: 50 }).catch(() => null)
        : Promise.resolve(null);

    Promise.all([eventPromise, fieldsPromise, participationPromise])
      .then(([eventResp, formFieldsResp, participationResult]) => {
        if (cancelled) return;

        if (participationResult) {
          const existing = participationResult.items.find(
            (p) => p.event_id === eventId && p.status !== "cancelled",
          );
          if (existing) {
            redirected = true;
            navigate(`/registrations/${existing.id}/room`, { replace: true });
            return;
          }
        }

        const apiEvent = eventResp.data.data;
        setEvent(adaptPublicEventDetailToUi(apiEvent));
        setFormFields(adaptUiFormFields(formFieldsResp.data));
        setModules(buildModules(adaptPublicEventDetailToUi(apiEvent)));
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setLoadError(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        if (cancelled || redirected) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventId, retryNonce, user, navigate]);

  const registrationAllowed = event?.registration_gates?.allowed === true;
  const lockedReason = event ? resolveLockedReason(event) : null;

  const registerLabel = (() => {
    if (!event) return "Register";
    if (registrationAllowed) {
      const hasPaid = event.ticket_tiers.some((t) => t.price > 0);
      return hasPaid ? "Get Tickets" : "Register";
    }
    if (lockedReason) return LOCKED_COPY[lockedReason].title;
    return "Registration closed";
  })();

  const submitDisabled = !registrationAllowed;

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;
    if (submitDisabled) {
      toast.error(registerLabel);
      return;
    }
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    if (!consent) {
      toast.error("Please accept the privacy policy to register.");
      return;
    }

    // Required field validation — use field.key for lookup but field.label for error message
    const missing = formFields?.filter((f) => {
      if (!f.required) return false;
      if (f.field_type === "checkbox") return formData[f.key] !== "true";
      return !formData[f.key]?.trim();
    }) ?? [];
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    if (tickets.length > 0 && !selectedTicketId) {
      toast.error("Please choose a ticket to continue.");
      return;
    }

    setIsSubmitting(true);

    // Build custom_field_answers using backend key (not label)
    const custom_field_answers: Record<string, unknown> = {};
    for (const field of formFields ?? []) {
      const val = formData[field.key];
      if (val !== undefined && val !== "") {
        custom_field_answers[field.key] =
          field.field_type === "number" ? Number(val) :
          field.field_type === "checkbox" ? val === "true" :
          val;
      }
    }

    const selectedTicketNum = selectedTicketId ? Number(selectedTicketId) : null;

    try {
      const participation = await createParticipation({
        event_id: event.id,
        ticket_type_id: selectedTicketNum || undefined,
        custom_field_answers: Object.keys(custom_field_answers).length > 0 ? custom_field_answers : undefined,
        discount_code: discountQuote?.code || undefined,
      });

      if (participation.status === "waitlisted") {
        setStep({ kind: "success", participation, waitlisted: true });
        return;
      }

      if (
        participation.payment_status === "not_required" ||
        participation.payment_status === "paid"
      ) {
        setStep({ kind: "success", participation, waitlisted: false });
        // Navigate to event room after a brief moment
        setTimeout(() => {
          navigate(`/registrations/${participation.id}/room`);
        }, 2200);
        return;
      }

      if (participation.payment_status === "pending") {
        // Paid ticket — show WaafiPay phone step
        setStep({ kind: "waafi", participation });
        return;
      }

      // Unexpected state — treat as success
      setStep({ kind: "success", participation, waitlisted: false });
    } catch (err: any) {
      const msg = getApiErrorMessage(err);
      const status = err?.response?.status;
      if (status === 422) {
        // Laravel validation failure
        const errors = err?.response?.data?.errors;
        if (errors) {
          const firstError = Object.values(errors).flat()[0] as string;
          toast.error(firstError || msg);
        } else {
          toast.error(msg);
        }
      } else if (
        msg.toLowerCase().includes("already has an active participation") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        // Check if they have a pending participation they should resume paying for
        toast.error("You're already registered for this event. Check your tickets.");
        // Navigate to dashboard so they can find their pending registration
        setTimeout(() => navigate("/dashboard/home"), 1500);
      } else if (
        msg.toLowerCase().includes("deadline") ||
        msg.toLowerCase().includes("deadline has passed")
      ) {
        toast.error("Registration deadline has passed.");
      } else if (msg.toLowerCase().includes("closed") || msg.toLowerCase().includes("registration closed")) {
        toast.error("Registration is closed for this event.");
      } else if (msg.toLowerCase().includes("sold out") || msg.toLowerCase().includes("capacity reached")) {
        toast.error("This event is sold out.");
      } else if (msg.toLowerCase().includes("ticket type") && msg.toLowerCase().includes("invalid")) {
        toast.error("The selected ticket is no longer available.");
      } else if (msg.toLowerCase().includes("sales are disabled")) {
        toast.error("This ticket type is no longer on sale.");
      } else if (
        msg.toLowerCase().includes("discount") ||
        String(err?.response?.data?.errors?.error_code?.[0] || "").startsWith("discount_")
      ) {
        toast.error(msg || "This discount code can't be used.");
        setDiscountQuote(null);
        setDiscountError(msg);
      } else {
        toast.error(msg || "Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers passed to WaafiPhoneStep
  const handlePaymentSuccess = (participation: ApiParticipation) => {
    chargeInFlightRef.current = false;
    setStep({ kind: "success", participation, waitlisted: false });
    setTimeout(() => {
      navigate(`/registrations/${participation.id}/room`);
    }, 2200);
  };

  const handlePaymentFailure = (reason: string) => {
    chargeInFlightRef.current = false;
    if (step.kind === "waafi") {
      setStep({ kind: "payment_failed", participation: step.participation, reason });
    }
  };

  const handlePaymentCancel = () => {
    chargeInFlightRef.current = false;
    // Participation already exists (payment_status=pending). Navigating back to the form
    // would let the user re-submit and get a "already has an active participation" error.
    // Instead, go to the registration detail page where they can resume payment.
    if (step.kind === "waafi") {
        toast("Payment cancelled. Your registration is saved. You can complete payment anytime from My Tickets.");
      navigate(`/registrations/${step.participation.id}`);
    } else {
      setStep({ kind: "form" });
    }
  };

  const handleRetryPayment = () => {
    if (step.kind === "payment_failed") {
      setStep({ kind: "waafi", participation: step.participation });
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="pulse-event min-h-screen overflow-x-hidden" style={{ background: PULSE.paper }}>
        <div className="mx-4 mt-4 h-[42vh] rounded-[1.75rem] sm:mx-6" style={{ background: `linear-gradient(180deg, ${PULSE.navy}, ${PULSE.sky})` }} />
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
          <Skeleton className="h-10 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-5/6 rounded-full" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pulse-event flex min-h-screen flex-col" style={{ background: PULSE.paper }}>
        <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200 bg-white">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 font-display text-2xl font-bold">Couldn&apos;t load event</h1>
            <p className="mb-6 text-slate-500">{loadError}</p>
            <Button className="rounded-full" onClick={() => setRetryNonce((n) => n + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="pulse-event flex min-h-screen flex-col" style={{ background: PULSE.paper }}>
        <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200 bg-white">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 font-display text-2xl font-bold">Event not found</h1>
            <p className="mb-6 text-slate-500">This event may have ended or is not publicly available.</p>
            <Button className="rounded-full" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  const brandColor = PULSE.teal;

  // Non-form steps are overlaid in place of the form slot inside PublicEventPage
  if (step.kind === "waafi") {
    const ticket = event.ticket_tiers.find((t) => t.id === String(step.participation.ticket_type_id));
    chargeInFlightRef.current = true;
    return (
      <div className="overflow-x-hidden">
        <PublicEventPage
          event={event}
          modules={modules}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <ParticipantWaafiPayment
              participationId={step.participation.id}
              eventName={event.name}
              ticketName={ticket?.name ?? step.participation.ticket_type?.name ?? null}
              amount={
                step.participation.final_amount
                ?? (ticket?.price ? String(ticket.price) : step.participation.ticket_type?.price ?? "0")
              }
              currency={ticket?.currency || "USD"}
              brandColor={brandColor}
              isDark={false}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
              onCancel={handlePaymentCancel}
            />
          }
        />
      </div>
    );
  }

  if (step.kind === "success") {
    return (
      <div className="overflow-x-hidden">
        <PublicEventPage
          event={event}
          modules={modules}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <SuccessCard
              brandColor={brandColor}
              eventName={event.name}
              waitlisted={step.waitlisted}
              participationId={step.participation.id}
            />
          }
        />
      </div>
    );
  }

  if (step.kind === "payment_failed") {
    return (
      <div className="overflow-x-hidden">
        <PublicEventPage
          event={event}
          modules={modules}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <PaymentFailCard
              brandColor={brandColor}
              reason={step.reason}
              onRetry={handleRetryPayment}
            />
          }
        />
      </div>
    );
  }

  const formProps = {
    formFields,
    formData,
    onFieldChange: handleFieldChange,
    consent,
    onConsentChange: setConsent,
    onSubmit: handleSubmit,
    isPending: isSubmitting,
    submitDisabled,
    submitLabel: registerLabel,
    brandColor,
    tickets,
    selectedTicketId,
    onSelectTicket: handleSelectTicket,
    discountCode,
    onDiscountCodeChange: (v: string) => {
      setDiscountCode(v);
      if (discountQuote) setDiscountQuote(null);
      if (discountError) setDiscountError(null);
    },
    discountQuote,
    discountApplying,
    discountError,
    onApplyDiscount: () => void handleApplyDiscount(),
    onClearDiscount: clearDiscount,
  };

  return (
    <div className="overflow-x-hidden">
      <PublicEventPage
        event={event}
        modules={modules}
        registerLabel={registerLabel}
        registerDisabled={submitDisabled || !!lockedReason}
        formSlot={
          lockedReason ? (
            <RegistrationLockedPanel
              reason={lockedReason}
              startsAt={event.event_date}
            />
          ) : (
            <RegistrationForm {...formProps} className="pb-24 sm:pb-0" />
          )
        }
      />
    </div>
  );
};

export default Register;
