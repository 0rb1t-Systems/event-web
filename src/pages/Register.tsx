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
  CalendarDays, MapPin, Video, Globe, Loader2, CheckCircle2,
  Clock, AlertTriangle,
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
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackdrop, GlassCard } from "@/components/register/AuroraBackdrop";
import { getMediaUrl } from "@/lib/mediaUrl";
import type { TicketTier } from "@/components/event-detail/TicketTiersManager";
import { Crown, Ticket as TicketIcon, Check, Minus, Plus } from "lucide-react";
import {
  createParticipation,
  type ApiParticipation,
} from "@/services/participationService";
import { ParticipantWaafiPayment } from "@/components/participant/ParticipantWaafiPayment";

type FormField = UiFormField;

const formatTicketPrice = (price: number, currency = "USD") => {
  if (!price) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
};

const QuantityStepper = ({
  value, onChange, min = 1, max = 10, brandColor,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; brandColor: string }) => (
  <div
    className="inline-flex items-center gap-0 rounded-full bg-background/80 backdrop-blur p-1"
    onClick={(e) => e.stopPropagation()}
  >
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className="w-8 h-8 rounded-full inline-flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition"
      aria-label="Decrease quantity"
    >
      <Minus className="w-3.5 h-3.5" />
    </button>
    <span
      className="w-7 text-center text-sm font-display font-semibold tabular-nums"
      style={{ color: brandColor }}
    >
      {value}
    </span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="w-8 h-8 rounded-full inline-flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition"
      aria-label="Increase quantity"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);

const TicketPicker = ({
  tickets, selectedId, onSelect, quantity, onQuantityChange, brandColor,
}: {
  tickets: TicketTier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  quantity: number;
  onQuantityChange: (n: number) => void;
  brandColor: string;
}) => (
  <div className="space-y-2.5">
    <div className="flex items-baseline justify-between">
      <Label className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">
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
            className={`group w-full text-left relative overflow-hidden rounded-2xl p-4 transition-all ${
              soldOut
                ? "opacity-50 cursor-not-allowed bg-muted/30"
                : selected
                  ? "bg-card"
                  : "bg-muted/40 hover:bg-muted/70"
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
                className={`shrink-0 w-10 h-10 rounded-full inline-flex items-center justify-center transition ${
                  selected && !soldOut ? "text-white" : t.is_vip ? "text-foreground bg-background" : "bg-background text-muted-foreground"
                }`}
                style={selected && !soldOut ? {
                  background: t.is_vip
                    ? `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))`
                    : brandColor,
                } : undefined}
              >
                {t.is_vip ? <Crown className="w-4 h-4" /> : <TicketIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-display font-semibold tracking-[-0.01em] truncate">
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

            {selected && !soldOut && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3.5 pt-3.5 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Quantity</span>
                  <QuantityStepper value={quantity} onChange={onQuantityChange} brandColor={brandColor} />
                </div>
              </motion.div>
            )}
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
  const inputClass = "h-12 rounded-2xl bg-muted/40 border-0 px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-0";

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
  brandColor, eventName, waitlisted, participationId, isDark,
}: {
  brandColor: string;
  eventName: string;
  waitlisted: boolean;
  participationId: number | null;
  isDark?: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 18 }}
      className="w-full max-w-lg mx-auto relative z-10"
    >
      <GlassCard isDark={isDark} brandColor={brandColor}>
        <div className="p-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2, damping: 12 }}
            className="relative inline-block mb-5"
          >
            <div className="absolute inset-0 blur-2xl rounded-full" style={{ background: brandColor, opacity: 0.5 }} />
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 65%))`,
                boxShadow: `0 12px 40px -8px ${brandColor}88`,
              }}
            >
              {waitlisted ? <Clock className="w-9 h-9 text-white" /> : <CheckCircle2 className="w-9 h-9 text-white" />}
            </div>
          </motion.div>
          <h2 className="text-3xl font-display font-bold mb-3 tracking-[-0.02em]">
            {waitlisted ? "You're on the waitlist" : "You're registered!"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {waitlisted
              ? <>This event is at capacity. We&apos;ve added you to the waitlist for <strong>{eventName}</strong> and will notify you if a spot opens up.</>
              : <>Thank you for registering for <strong>{eventName}</strong>. You&apos;ll receive a confirmation email shortly.</>}
          </p>
          {!waitlisted && participationId && (
            <Button
              className="mt-6 rounded-full h-11 px-6 text-white border-0 font-semibold"
              style={{ background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))` }}
              onClick={() => navigate(`/registrations/${participationId}`)}
            >
              View your ticket
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

const PaymentFailCard = ({
  brandColor, reason, onRetry, isDark,
}: {
  brandColor: string;
  reason: string;
  onRetry: () => void;
  isDark?: boolean;
}) => (
  <motion.div
    key="fail"
    initial={{ opacity: 0, scale: 0.92, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ type: "spring", damping: 18 }}
    className="w-full max-w-lg mx-auto relative z-10"
  >
    <GlassCard isDark={isDark} brandColor={brandColor}>
      <div className="p-10 text-center">
        <div className="relative inline-block mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-destructive/10 mx-auto">
            <AlertTriangle className="w-9 h-9 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-display font-bold mb-3 tracking-[-0.02em]">Payment failed</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">{reason}</p>
        <Button
          className="rounded-full h-11 px-6 text-white border-0 font-semibold"
          style={{ background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))` }}
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    </GlassCard>
  </motion.div>
);

// ─── Event info sidebar ───────────────────────────────────────────────────────

type Event = PublicEventUiModel;

function formatEventDateTime(event: Event) {
  const tz = event.timezone || "Africa/Mogadishu";
  const parts: string[] = [];

  if (event.event_date) {
    const start = new Date(event.event_date);
    const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

    let line = `${dateStr} · ${timeStr}`;

    if (event.event_end_date) {
      const end = new Date(event.event_end_date);
      const endDateStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
      const endTimeStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
      if (endDateStr === dateStr) {
        line += ` – ${endTimeStr}`;
      } else {
        line += ` – ${endDateStr} · ${endTimeStr}`;
      }
    }

    const tzAbbr = start.toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop() || tz;
    line += ` ${tzAbbr}`;
    parts.push(line);
  }

  return parts.join("");
}

const EventInfo = ({ event, className = "" }: { event: Event; className?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const locationIcon =
    event.location_type === "physical" ? <MapPin className="w-4 h-4" /> :
    event.location_type === "hybrid" ? <Globe className="w-4 h-4" /> :
    <Video className="w-4 h-4" />;
  const locationLabel =
    event.location_type === "physical" ? "In-Person" :
    event.location_type === "hybrid" ? "Hybrid" : "Virtual";
  const dateTimeStr = formatEventDateTime(event);

  const description = event.description || "";
  const sentences = description.match(/[^.!?]*[.!?]+/g) || [description];
  const isTruncatable = sentences.length > 1;
  const truncated = isTruncatable ? sentences.slice(0, 1).join("").trim() + "…" : description;

  return (
    <div className={`pt-6 md:pt-0 ${className}`}>
      {dateTimeStr && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <CalendarDays className="w-4 h-4 shrink-0" />
          {dateTimeStr}
        </div>
      )}
      <h1 className="text-2xl sm:text-4xl md:text-7xl font-display font-bold">{event.name}</h1>
      {description && (
        <div className="mt-4 mb-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {expanded || !isTruncatable ? description : truncated}
          </p>
          {isTruncatable && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium mt-1 hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {locationIcon} {locationLabel}
      </div>
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
  quantity,
  onQuantityChange,
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
  quantity: number;
  onQuantityChange: (n: number) => void;
  className?: string;
}) => {
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const subtotal = selectedTicket ? selectedTicket.price * quantity : 0;
  const isPaid = !!selectedTicket && selectedTicket.price > 0;
  const ctaLabel = isPending
    ? "Processing…"
    : isPaid
      ? `Get ${quantity} ticket${quantity > 1 ? "s" : ""} · ${formatTicketPrice(subtotal, selectedTicket.currency || "USD")}`
      : selectedTicket
        ? `Reserve ${quantity > 1 ? `${quantity} spots` : "my spot"}`
        : "Register now";

  const effectiveLabel = submitLabel ?? ctaLabel;

  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {tickets.length > 0 && (
        <TicketPicker
          tickets={tickets}
          selectedId={selectedTicketId}
          onSelect={onSelectTicket}
          quantity={quantity}
          onQuantityChange={onQuantityChange}
          brandColor={brandColor}
        />
      )}

      {(formFields?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">
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
          className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Order total</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {quantity} × {selectedTicket!.name} @ {formatTicketPrice(selectedTicket!.price, selectedTicket!.currency)}
            </p>
          </div>
          <div className="text-2xl font-display font-bold tabular-nums tracking-[-0.02em]" style={{ color: brandColor }}>
            {formatTicketPrice(subtotal, selectedTicket!.currency || "USD")}
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
        className="w-full h-14 text-base border-0 text-white rounded-full font-display font-semibold tracking-[-0.01em] transition-transform hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, hsl(265 90% 62%))`,
          boxShadow: `0 18px 40px -12px ${brandColor}99, 0 0 0 1px rgba(255,255,255,0.08) inset`,
        }}
        disabled={isPending || !!submitDisabled}
      >
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : effectiveLabel}
      </Button>
    </form>
  );
};

// ─── Flyer decorative ─────────────────────────────────────────────────────────

const FlyerImage = ({ flyerUrl, eventName, className = "" }: { flyerUrl: string | null; eventName: string; className?: string }) => (
  flyerUrl ? (
    <div className={`flex items-start justify-center ${className}`}>
      <img src={flyerUrl} alt={eventName} className="w-full h-full object-contain" />
    </div>
  ) : null
);

const PoweredBy = () => (
  <p className="text-center text-xs text-muted-foreground mt-6">
    Powered by <span className="font-semibold">EventHub</span>
  </p>
);

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
  const [quantity, setQuantity] = useState(1);

  const [step, setStep] = useState<RegistrationStep>({ kind: "form" });

  // Track whether a charge is in flight (for navigation safety)
  const chargeInFlightRef = useRef(false);

  const tickets: TicketTier[] = event?.ticket_tiers ?? [];

  // Auto-select single ticket
  useEffect(() => {
    if (tickets.length === 1 && !selectedTicketId) setSelectedTicketId(tickets[0].id);
  }, [tickets, selectedTicketId]);

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

    const scheduleItems =
      sessions.length > 0
        ? sessions
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((s) => ({
              time: formatSessionTime(s.starts_at),
              title: s.title || s.room || "Session",
            }))
        : [];

    const people =
      speakers.length > 0
        ? speakers.map((sp) => ({
            name: sp.name,
            role: sp.title || sp.organization || "",
            avatar: sp.photo_path ? getMediaUrl(sp.photo_path) : undefined,
          }))
        : [];

    const logos =
      sponsors.length > 0
        ? sponsors
            .map((s) => (s.logo_path ? getMediaUrl(s.logo_path) : undefined))
            .filter(Boolean) as string[]
        : [];

    const galleryImageUrl = ui.images?.[0]?.path ? getMediaUrl(ui.images[0].path) : undefined;

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
        content: { heading: "What to expect", items: scheduleItems },
      });
    }

    if (people.length > 0) {
      modulesOut.push({
        id: "speakers",
        type: "speakers",
        enabled: true,
        position: 2,
        title: "Speakers",
        content: { heading: "Speakers", people },
      });
    }

    if (logos.length > 0) {
      modulesOut.push({
        id: "sponsors",
        type: "sponsors",
        enabled: true,
        position: 3,
        title: "Partners",
        content: { heading: "Our partners", logos },
      });
    }

    const hasVenue = ui.location_type !== "virtual" && !!(ui.city || ui.location);
    const hasJoin = ui.location_type !== "physical" && !!ui.online_url;
    if (hasVenue || hasJoin) {
      modulesOut.push({
        id: "location",
        type: "location",
        enabled: true,
        position: 4,
        title: "Location",
        content: {
          heading: ui.location_type === "virtual" ? "Join online" : "Where to find us",
          venue: ui.city ?? (ui.location_type === "virtual" ? "Online event" : undefined),
          address: ui.location,
          mapUrl: hasJoin ? ui.online_url : undefined,
          linkLabel: hasJoin ? "Open meeting link" : undefined,
        },
      });
    }

    if (galleryImageUrl) {
      modulesOut.push({
        id: "gallery",
        type: "custom",
        enabled: true,
        position: 5,
        title: "Gallery",
        content: {
          heading: "Gallery",
          body: "",
          image_url: galleryImageUrl,
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
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    Promise.all([
      publicApi.get<PublicEventDetailResponse>(`/events/${eventId}`),
      publicApi.get<PublicEventFormFieldResponse>(`/events/${eventId}/form-fields`),
    ])
      .then(([eventResp, formFieldsResp]) => {
        if (cancelled) return;
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
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventId, retryNonce]);

  const registrationAllowed = event?.registration_gates?.allowed === true;

  const registerLabel = (() => {
    if (!event) return "Register";
    if (registrationAllowed) {
      const hasPaid = event.ticket_tiers.some((t) => t.price > 0);
      return hasPaid ? "Get Tickets" : "Register";
    }
    if (event.status === "sold_out") return "Sold out";
    if (event.status === "registration_closed") return "Registration closed";
    if (event.registration_gates?.reason === "deadline_passed") return "Registration ended";
    return "Registration unavailable";
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
        // Navigate to ticket after a brief moment
        setTimeout(() => {
          navigate(`/registrations/${participation.id}`);
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
      navigate(`/registrations/${participation.id}`);
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
      toast("Payment cancelled. Your registration is saved — you can complete payment anytime from your tickets.");
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
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="h-[40vh] bg-muted/40" />
        <div className="px-4 py-10 space-y-4 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-10 w-full rounded-3xl" />
          <Skeleton className="h-10 w-full rounded-3xl" />
          <Skeleton className="h-10 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-display font-bold mb-2">Couldn&apos;t load event</h1>
            <p className="text-muted-foreground mb-6">{loadError}</p>
            <Button className="rounded-full" onClick={() => setRetryNonce((n) => n + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-display font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">This event may have ended or is not publicly available.</p>
            <Button className="rounded-full" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandColor = event.primary_color || "#7C3AED";
  const isDark = (event as any).color_mode === "dark";

  // Non-form steps are overlaid in place of the form slot inside PublicEventPage
  if (step.kind === "waafi") {
    const ticket = event.ticket_tiers.find((t) => t.id === String(step.participation.ticket_type_id));
    chargeInFlightRef.current = true;
    return (
      <div className="overflow-x-hidden">
        <PublicEventPage
          event={event}
          modules={modules}
          brandColor={brandColor}
          isDark={isDark}
          formattedDate={event.event_date ? formatEventDateTime(event) : ""}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <div className="relative min-h-[320px]">
              <AuroraBackdrop brandColor={brandColor} isDark={isDark} />
              <div className="relative z-10 flex flex-col items-center gap-4 py-6">
                <ParticipantWaafiPayment
                  participationId={step.participation.id}
                  eventName={event.name}
                  ticketName={ticket?.name ?? step.participation.ticket_type?.name ?? null}
                  amount={ticket?.price ? String(ticket.price) : step.participation.ticket_type?.price ?? "0"}
                  currency={ticket?.currency || "USD"}
                  brandColor={brandColor}
                  isDark={isDark}
                  onSuccess={handlePaymentSuccess}
                  onFailure={handlePaymentFailure}
                  onCancel={handlePaymentCancel}
                />
                <PoweredBy />
              </div>
            </div>
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
          brandColor={brandColor}
          isDark={isDark}
          formattedDate={event.event_date ? formatEventDateTime(event) : ""}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <div className="relative min-h-[320px]">
              <AuroraBackdrop brandColor={brandColor} isDark={isDark} />
              <div className="relative z-10 flex flex-col items-center gap-4 py-6">
                <SuccessCard
                  brandColor={brandColor}
                  eventName={event.name}
                  waitlisted={step.waitlisted}
                  participationId={step.participation.id}
                  isDark={isDark}
                />
                <PoweredBy />
              </div>
            </div>
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
          brandColor={brandColor}
          isDark={isDark}
          formattedDate={event.event_date ? formatEventDateTime(event) : ""}
          registerLabel={registerLabel}
          registerDisabled={true}
          formSlot={
            <div className="relative min-h-[320px]">
              <AuroraBackdrop brandColor={brandColor} isDark={isDark} />
              <div className="relative z-10 flex flex-col items-center gap-4 py-6">
                <PaymentFailCard
                  brandColor={brandColor}
                  reason={step.reason}
                  onRetry={handleRetryPayment}
                  isDark={isDark}
                />
                <PoweredBy />
              </div>
            </div>
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
    onSelectTicket: setSelectedTicketId,
    quantity,
    onQuantityChange: setQuantity,
  };

  return (
    <div className="overflow-x-hidden">
      <PublicEventPage
        event={event}
        modules={modules}
        brandColor={brandColor}
        isDark={isDark}
        formattedDate={event.event_date ? formatEventDateTime(event) : ""}
        registerLabel={registerLabel}
        registerDisabled={submitDisabled}
        formSlot={<RegistrationForm {...formProps} className="pb-24 sm:pb-0" />}
      />
    </div>
  );
};

export default Register;
