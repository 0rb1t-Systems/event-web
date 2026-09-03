import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  IconBolt,
  IconClock,
  IconMinus,
  IconPlus,
  IconSparkles,
  IconTrophy,
  IconUsers,
} from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import {
  getOrganizerLuckyWheel,
  spinOrganizerLuckyWheel,
  type LuckyWheelAttempt,
  type LuckyWheelState,
} from "@/services/organizerLuckyWheel";
import {
  participationStatus,
  type OrganizerParticipation,
} from "@/services/organizerParticipations";

const WHEEL_PALETTE = [
  { fill: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))" },
  { fill: "hsl(330 82% 58%)", text: "#fff" },
  { fill: "hsl(262 72% 58%)", text: "#fff" },
  { fill: "hsl(199 89% 48%)", text: "#fff" },
  { fill: "hsl(160 64% 42%)", text: "#fff" },
  { fill: "hsl(43 96% 56%)", text: "#1a1a1a" },
  { fill: "hsl(24 95% 53%)", text: "#fff" },
  { fill: "hsl(280 68% 55%)", text: "#fff" },
];

type Props = {
  eventId: number;
  onDenied?: () => void;
};

type SpinPhase = "idle" | "spinning" | "revealing";

type WheelEntry = {
  participationId: number;
  label: string;
  fullName: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Align segment center under the fixed top pointer after clockwise rotation. */
function rotationToLandOnSegment(
  segmentIndex: number,
  segmentCount: number,
  currentRotation: number,
): number {
  const slice = 360 / segmentCount;
  const targetMod = (360 - (segmentIndex + 0.5) * slice + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  const extraTurns = 4 + Math.floor(Math.random() * 3);
  return currentRotation + extraTurns * 360 + delta;
}

function findSegmentIndexByParticipationId(
  entries: WheelEntry[],
  participationId: number,
): number {
  return entries.findIndex((e) => e.participationId === participationId);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function wheelLabel(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
}

type WinnerEntry = {
  participationId: number;
  name: string;
};

function winnersFromAttempt(attempt: LuckyWheelAttempt): WinnerEntry[] {
  const seen = new Set<number>();
  const result: WinnerEntry[] = [];

  for (const w of attempt.winners ?? []) {
    const participationId = w.participation_id ?? w.participation?.id;
    const name = w.participation?.user?.name?.trim();
    if (!participationId || !name || seen.has(participationId)) continue;
    seen.add(participationId);
    result.push({ participationId, name });
  }

  return result;
}

function winnerNames(attempt: LuckyWheelAttempt): string[] {
  return winnersFromAttempt(attempt).map((w) => w.name);
}

function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 280,
        y: -(40 + Math.random() * 120),
        rotate: Math.random() * 720 - 360,
        color: WHEEL_PALETTE[i % WHEEL_PALETTE.length].fill,
        delay: Math.random() * 0.15,
        size: 6 + Math.random() * 6,
      })),
    [active],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{
            width: p.size,
            height: p.size * 0.55,
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [1, 1, 0],
            rotate: p.rotate,
            scale: [0, 1, 0.6],
          }}
          transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function LuckyWheelVisual({
  entries,
  spinning,
  rotation,
  phase,
  highlightIndex,
  centerRevealName,
  spinDurationSec,
}: {
  entries: WheelEntry[];
  spinning: boolean;
  rotation: number;
  phase: SpinPhase;
  highlightIndex: number | null;
  centerRevealName: string | null;
  spinDurationSec: number;
}) {
  const count = Math.max(entries.length, 1);
  const displayEntries =
    entries.length > 0
      ? entries
      : Array.from({ length: 8 }, () => ({ participationId: 0, label: "?", fullName: "?" }));
  const segmentCount = displayEntries.length;
  const slice = 360 / segmentCount;

  return (
    <div className="relative mx-auto w-[min(100%,340px)] aspect-square">
      <motion.div
        className="absolute -inset-6 rounded-full bg-gradient-to-br from-primary/30 via-fuchsia-500/20 to-violet-600/25 blur-3xl"
        animate={
          spinning
            ? { opacity: [0.55, 0.95, 0.65], scale: [1, 1.06, 1] }
            : phase === "revealing"
              ? { opacity: 0.85, scale: 1.04 }
              : { opacity: 0.45, scale: 1 }
        }
        transition={{ duration: spinning ? 1.2 : 0.5, repeat: spinning ? Infinity : 0 }}
      />

      <div className="absolute inset-2 rounded-full border border-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.06)]" />

      {spinning && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed border-white/25"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.div
        className="relative w-full h-full rounded-full p-[6px] bg-gradient-to-br from-amber-200/90 via-amber-100/70 to-amber-300/90 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)]"
        animate={{ scale: spinning ? [1, 1.02, 1] : 1 }}
        transition={{ duration: 0.6, repeat: spinning ? Infinity : 0 }}
      >
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/40 shadow-inner"
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: spinDurationSec, ease: [0.12, 0.85, 0.15, 1] }
              : { duration: 0.5, ease: "easeOut" }
          }
          style={{ transformOrigin: "center center" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
            <defs>
              <filter id="wheel-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.25" />
              </filter>
            </defs>
            {displayEntries.map((entry, i) => {
              const label = entry.label;
              const isHighlight = highlightIndex === i;
              const start = (i * slice - 90) * (Math.PI / 180);
              const end = ((i + 1) * slice - 90) * (Math.PI / 180);
              const x1 = 100 + 98 * Math.cos(start);
              const y1 = 100 + 98 * Math.sin(start);
              const x2 = 100 + 98 * Math.cos(end);
              const y2 = 100 + 98 * Math.sin(end);
              const large = slice > 180 ? 1 : 0;
              const palette = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
              const mid = (i + 0.5) * slice - 90;
              const tx = 100 + 62 * Math.cos((mid * Math.PI) / 180);
              const ty = 100 + 62 * Math.sin((mid * Math.PI) / 180);
              return (
                <g key={`${entry.participationId}-${i}`} filter="url(#wheel-shadow)">
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${large} 1 ${x2} ${y2} Z`}
                    fill={palette.fill}
                    opacity={isHighlight ? 1 : 0.92}
                  />
                  {isHighlight && (
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${large} 1 ${x2} ${y2} Z`}
                      fill="#fff"
                      opacity={0.22}
                    />
                  )}
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${large} 1 ${x2} ${y2} Z`}
                    fill="url(#segment-shine)"
                    opacity={0.12}
                  />
                  {label && (
                    <text
                      x={tx}
                      y={ty}
                      fill={palette.text}
                      fontSize={segmentCount > 12 ? 7 : 9}
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid + 90}, ${tx}, ${ty})`}
                      className="select-none"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
            <linearGradient id="segment-shine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            {displayEntries.map((_, i) => {
              const angle = (i * slice - 90) * (Math.PI / 180);
              const x1 = 100 + 22 * Math.cos(angle);
              const y1 = 100 + 22 * Math.sin(angle);
              const x2 = 100 + 98 * Math.cos(angle);
              const y2 = 100 + 98 * Math.sin(angle);
              return (
                <line
                  key={`line-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {centerRevealName && phase === "revealing" ? (
              <motion.div
                key={centerRevealName}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative z-20 max-w-[70%] rounded-2xl bg-background/95 backdrop-blur border border-primary/30 px-4 py-3 shadow-xl text-center"
              >
                <p className="text-xs uppercase tracking-wider text-primary font-bold mb-0.5">Winner</p>
                <p className="font-display font-bold text-sm leading-tight">{centerRevealName}</p>
              </motion.div>
            ) : (
              <div className="relative w-[22%] aspect-square rounded-full bg-gradient-to-br from-background to-muted border-4 border-white/80 shadow-xl flex items-center justify-center">
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20" />
                {spinning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  >
                    <IconSparkles className="w-5 h-5 text-primary relative z-10" />
                  </motion.div>
                ) : (
                  <IconBolt className="w-5 h-5 text-primary relative z-10" />
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30">
        <div className="relative">
          <div className="absolute inset-0 blur-md bg-primary/60 rounded-full scale-150" />
          <div
            className="relative w-0 h-0 drop-shadow-lg"
            style={{
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "26px solid hsl(var(--foreground))",
            }}
          />
          <div
            className="absolute top-[2px] left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "20px solid hsl(var(--primary))",
            }}
          />
        </div>
      </div>

      {count > 16 && (
        <Badge className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/90 text-foreground border shadow-sm tabular-nums">
          {count} in pool · 16 on wheel
        </Badge>
      )}
    </div>
  );
}

function WinnerCountStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  const presets = [1, 2, 3, 5].filter((n) => n <= max);
  const multiDraw = value > 1;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Number of winners</Label>
      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full h-11 w-11 shrink-0"
          disabled={disabled || value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <IconMinus className="w-4 h-4" />
        </Button>
        <div className="min-w-[4.5rem] text-center">
          <span className="font-display font-bold text-4xl tabular-nums tracking-tight">{value}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full h-11 w-11 shrink-0"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <IconPlus className="w-4 h-4" />
        </Button>
      </div>
      {presets.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-semibold transition-colors",
                value === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {n} winner{n === 1 ? "" : "s"}
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {multiDraw
          ? `The wheel spins once per winner (${value} separate draws).`
          : `Pick 1 winner from ${max} confirmed participant${max === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}

function ParticipantRow({ p }: { p: OrganizerParticipation }) {
  const name = p.user?.name ?? "Guest";
  const status = participationStatus(p.status);
  return (
    <div className="flex items-center gap-3 py-2.5 px-1 min-w-0">
      <Avatar className="h-9 w-9 border border-border/60">
        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{p.user?.email ?? "—"}</p>
      </div>
      <StatusBadge label={status.replace("_", " ")} tone={
        status === "cancelled" ? "danger"
        : status === "waitlisted" ? "warning"
        : "success"
      } size="sm" className="shrink-0 border-0" />
    </div>
  );
}

export default function LuckyWheelPanel({ eventId, onDenied }: Props) {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<LuckyWheelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [winnerCount, setWinnerCount] = useState(1);
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [rotation, setRotation] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState<LuckyWheelAttempt | null>(null);
  const [revealedWinners, setRevealedWinners] = useState<WinnerEntry[]>([]);
  const [drawProgress, setDrawProgress] = useState<{ current: number; total: number } | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [centerRevealName, setCenterRevealName] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinDurationSec, setSpinDurationSec] = useState(5.2);
  const spinLock = useRef(false);
  const rotationRef = useRef(0);

  const participantCount = state?.participant_count ?? 0;
  const maxWinners = Math.max(participantCount, 1);
  const spinning = phase === "spinning";
  const isMultiDraw = winnerCount > 1;

  const wheelEntries = useMemo((): WheelEntry[] => {
    const participants = state?.participants ?? [];
    const pool = participants.slice(0, 16);
    return pool
      .map((p) => {
        const fullName = p.user?.name;
        if (!fullName) return null;
        return {
          participationId: p.id,
          label: wheelLabel(fullName),
          fullName,
        };
      })
      .filter((e): e is WheelEntry => e !== null);
  }, [state?.participants]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrganizerLuckyWheel(eventId);
      setState(data);
      setWinnerCount((prev) => {
        if (data.participant_count === 0) return 1;
        return Math.min(Math.max(prev, 1), data.participant_count);
      });
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Could not load lucky wheel"));
    } finally {
      setLoading(false);
    }
  }, [eventId, onDenied]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    void load();
  }, [load]);

  const runDrawSequence = async (attempt: LuckyWheelAttempt, winners: WinnerEntry[]) => {
    const order = reduceMotion ? winners : shuffle(winners);
    const spinMs = reduceMotion ? 450 : 4200;
    const pauseMs = reduceMotion ? 350 : 1400;
    setSpinDurationSec(spinMs / 1000);
    setRevealedWinners([]);
    setDrawProgress({ current: 0, total: order.length });

    for (let i = 0; i < order.length; i++) {
      const winner = order[i];
      setDrawProgress({ current: i + 1, total: order.length });
      setCenterRevealName(null);
      setHighlightIndex(null);
      setPhase("spinning");

      const segIdx =
        wheelEntries.length > 0
          ? findSegmentIndexByParticipationId(wheelEntries, winner.participationId)
          : -1;
      const nextRotation =
        segIdx >= 0
          ? rotationToLandOnSegment(segIdx, wheelEntries.length, rotationRef.current)
          : rotationRef.current + (4 + Math.floor(Math.random() * 3)) * 360 + Math.random() * 360;

      setRotation(nextRotation);
      rotationRef.current = nextRotation;

      await sleep(spinMs);

      setPhase("revealing");
      if (segIdx >= 0) {
        setHighlightIndex(segIdx);
      } else {
        setCenterRevealName(winner.name);
      }
      setRevealedWinners((prev) => {
        if (prev.some((w) => w.participationId === winner.participationId)) return prev;
        return [...prev, winner];
      });

      await sleep(pauseMs);
    }

    setLatestAttempt(attempt);
    setDrawProgress(null);
    setHighlightIndex(null);
    setCenterRevealName(null);
    setPhase("idle");
    setShowConfetti(!reduceMotion);
    spinLock.current = false;

    window.setTimeout(() => setShowConfetti(false), reduceMotion ? 600 : 2200);
    toast.success(
      `${attempt.winner_count} winner${attempt.winner_count === 1 ? "" : "s"} selected!`,
      { icon: <IconTrophy className="w-4 h-4 text-amber-500" /> },
    );
    void load();
  };

  const handleSpin = async () => {
    if (spinLock.current || spinning || phase === "revealing" || participantCount === 0) return;
    if (winnerCount < 1 || winnerCount > participantCount) {
      toast.error(`Choose between 1 and ${participantCount} winners.`);
      return;
    }

    spinLock.current = true;
    setPhase("spinning");
    setLatestAttempt(null);
    setRevealedWinners([]);
    setShowConfetti(false);
    setDrawProgress(isMultiDraw ? { current: 0, total: winnerCount } : null);
    setHighlightIndex(null);
    setCenterRevealName(null);

    const singleSpinMs = reduceMotion ? 450 : 5200;
    setSpinDurationSec(singleSpinMs / 1000);

    try {
      const attempt = await spinOrganizerLuckyWheel(eventId, winnerCount);
      const winners = winnersFromAttempt(attempt);

      if (winners.length === 0) {
        throw new Error("No winners returned");
      }

      if (winners.length !== winnerCount) {
        throw new Error("Winner count mismatch — duplicate entries were removed.");
      }

      if (isMultiDraw) {
        await runDrawSequence(attempt, winners);
        return;
      }

      const winner = winners[0];
      const segIdx =
        wheelEntries.length > 0
          ? findSegmentIndexByParticipationId(wheelEntries, winner.participationId)
          : -1;
      const nextRotation =
        segIdx >= 0
          ? rotationToLandOnSegment(segIdx, wheelEntries.length, rotationRef.current)
          : rotationRef.current + (5 + Math.floor(Math.random() * 3)) * 360 + Math.random() * 360;

      setRotation(nextRotation);
      rotationRef.current = nextRotation;

      await sleep(singleSpinMs);

      setPhase("revealing");
      if (segIdx >= 0) {
        setHighlightIndex(segIdx);
      } else {
        setCenterRevealName(winner.name);
      }
      setRevealedWinners([winner]);
      setLatestAttempt(attempt);
      setShowConfetti(!reduceMotion);

      await sleep(reduceMotion ? 700 : 2400);

      setPhase("idle");
      setHighlightIndex(null);
      setCenterRevealName(null);
      spinLock.current = false;
      setShowConfetti(false);
      toast.success("Winner selected!", { icon: <IconTrophy className="w-4 h-4 text-amber-500" /> });
      void load();
    } catch (err) {
      setPhase("idle");
      setDrawProgress(null);
      spinLock.current = false;
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Spin failed"));
    }
  };

  if (loading && !state) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading lucky wheel…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-3">
            <IconSparkles className="w-3.5 h-3.5" />
            Live draw
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Lucky wheel</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {isMultiDraw
              ? "Each winner gets their own spin. Only confirmed attendees are eligible."
              : "Spin once to pick a winner from confirmed attendees."}{" "}
            Every attempt is saved with full results.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/60 px-4 py-3 shrink-0">
          <IconUsers className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pool</p>
            <p className="font-display font-bold text-xl tabular-nums leading-none">{participantCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.04]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
          <div className="relative p-6 sm:p-8 space-y-8">
            <div className="relative">
              <ConfettiBurst active={showConfetti} />
              <LuckyWheelVisual
                entries={wheelEntries}
                spinning={spinning}
                rotation={rotation}
                phase={phase}
                highlightIndex={highlightIndex}
                centerRevealName={centerRevealName}
                spinDurationSec={spinDurationSec}
              />

              <AnimatePresence>
                {(spinning || phase === "revealing") && drawProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pointer-events-none"
                  >
                    <Badge className="bg-background/95 backdrop-blur border shadow-sm tabular-nums">
                      Draw {drawProgress.current} of {drawProgress.total}
                    </Badge>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur px-4 py-2 text-sm font-semibold shadow-lg border border-border/60">
                      {spinning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Spinning for winner {drawProgress.current}…
                        </>
                      ) : (
                        <>
                          <IconTrophy className="w-4 h-4 text-amber-500" />
                          Winner {drawProgress.current} selected
                        </>
                      )}
                    </span>
                  </motion.div>
                )}
                {spinning && !drawProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur px-4 py-2 text-sm font-semibold shadow-lg border border-border/60">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Spinning…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(revealedWinners.length > 0 || (isMultiDraw && drawProgress)) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  {isMultiDraw ? "Winners drawn" : "Winner"}
                </p>
                <div className={cn("grid gap-2", isMultiDraw ? "sm:grid-cols-2" : "")}>
                  {Array.from({ length: isMultiDraw ? winnerCount : 1 }).map((_, i) => {
                    const winner = revealedWinners[i];
                    const pending = !winner && drawProgress && i >= revealedWinners.length;
                    return (
                      <div
                        key={winner?.participationId ?? `slot-${i}`}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-2.5 min-h-[52px] transition-all",
                          winner
                            ? "bg-background/80 border-primary/30 shadow-sm"
                            : pending
                              ? "bg-primary/5 border-primary/20 animate-pulse"
                              : "bg-muted/30 border-border/40 border-dashed",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            winner
                              ? "bg-gradient-to-br from-primary to-violet-600 text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {winner ? initials(winner.name) : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {winner ? (
                            <p className="text-sm font-semibold truncate">{winner.name}</p>
                          ) : pending ? (
                            <p className="text-sm text-muted-foreground">Drawing…</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Waiting</p>
                          )}
                        </div>
                        {winner && <IconTrophy className="w-4 h-4 text-amber-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <WinnerCountStepper
              value={winnerCount}
              max={maxWinners}
              disabled={spinning || phase === "revealing" || participantCount === 0}
              onChange={setWinnerCount}
            />

            <Button
              size="lg"
              className={cn(
                "w-full rounded-full h-12 font-display font-bold text-base shadow-lg",
                "bg-gradient-to-r from-primary via-fuchsia-600 to-violet-600 hover:opacity-95",
                "disabled:opacity-50 disabled:shadow-none",
              )}
              disabled={spinning || phase === "revealing" || participantCount === 0}
              onClick={() => void handleSpin()}
            >
              {spinning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isMultiDraw && drawProgress
                    ? `Drawing winner ${drawProgress.current}…`
                    : "Wheel is spinning…"}
                </>
              ) : phase === "revealing" ? (
                <>
                  <IconTrophy className="w-5 h-5 mr-2" />
                  {isMultiDraw ? "Revealing winner…" : "Winner selected!"}
                </>
              ) : (
                <>
                  <IconSparkles className="w-5 h-5 mr-2" />
                  {isMultiDraw ? `Start ${winnerCount} draws` : "Spin the wheel"}
                </>
              )}
            </Button>

            <AnimatePresence mode="wait">
              {latestAttempt && phase === "idle" && revealedWinners.length > 0 && (
                <motion.div
                  key={latestAttempt.id}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-violet-500/5 p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                      <IconSparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">Winners</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(latestAttempt.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {revealedWinners.map((winner, i) => (
                      <motion.div
                        key={`${latestAttempt.id}-${winner.participationId}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 rounded-xl bg-background/80 border border-border/50 px-3 py-2.5 shadow-sm"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-violet-600 text-white">
                            {initials(winner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold truncate">{winner.name}</span>
                        <IconTrophy className="w-4 h-4 text-amber-500 ml-auto shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/30">
            <h3 className="font-display font-semibold">Confirmed participants</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirmed seats only
            </p>
          </div>
          {participantCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <IconUsers className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No registrations yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Participants will appear here once they sign up for this event.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[min(520px,60vh)]">
              <div className="px-4 divide-y divide-border/50">
                {(state?.participants ?? []).map((p) => (
                  <ParticipantRow key={p.id} p={p} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {(state?.attempts?.length ?? 0) > 0 && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <IconClock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-display font-semibold">Spin history</h3>
            <Badge variant="secondary" className="ml-auto tabular-nums border-0">
              {state!.attempts.length} attempt{state!.attempts.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="space-y-3">
            {state!.attempts.map((attempt, index) => (
              <motion.div
                key={attempt.id}
                initial={false}
                className={cn(
                  "relative rounded-2xl border p-4 pl-5 overflow-hidden transition-colors",
                  latestAttempt?.id === attempt.id
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/60 bg-muted/20",
                )}
              >
                <div
                  className={cn(
                    "absolute left-0 top-3 bottom-3 w-1 rounded-full",
                    index === 0 ? "bg-primary" : "bg-border",
                  )}
                />
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {attempt.winner_count} winner{attempt.winner_count === 1 ? "" : "s"} ·{" "}
                      {attempt.participant_count} in pool
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(attempt.created_at), "EEEE, MMM d · h:mm a")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end sm:max-w-[55%]">
                    {winnersFromAttempt(attempt).map((winner) => (
                      <Badge
                        key={`${attempt.id}-${winner.participationId}`}
                        variant="secondary"
                        className="bg-background/80 font-medium border border-border/50"
                      >
                        {winner.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
