import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
  Loader2,
  Keyboard,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import {
  getOrganizerEventQrScanLogs,
  isQrNetworkError,
  participationTicketName,
  qrResultValue,
  validateOrganizerQrScan,
  type OrganizerCheckInStats,
  type OrganizerQrParticipation,
  type OrganizerQrScanLog,
} from "@/services/organizerQr";

type UiResult =
  | {
      kind: "valid";
      name: string;
      ticket: string | null;
      participation: OrganizerQrParticipation;
    }
  | {
      kind: "already_used";
      name: string;
      ticket: string | null;
      priorAt: string | null;
      participation: OrganizerQrParticipation;
    }
  | { kind: "invalid"; message: string }
  | { kind: "network"; message: string; token: string };

type Props = {
  eventId: number;
  eventTitle: string;
  onDenied?: () => void;
};

const DEBOUNCE_MS = 2500;
const RESULT_HOLD_MS = 0; // user dismisses via Scan next

export default function CheckInScanner({ eventId, eventTitle, onDenied }: Props) {
  const containerId = `checkin-qr-${eventId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<UiResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [stats, setStats] = useState<OrganizerCheckInStats | null>(null);
  const [recent, setRecent] = useState<OrganizerQrScanLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch {
      /* unsupported / denied — fine */
    }
  }, []);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {
      /* ignore stop races */
    }
    scannerRef.current = null;
    setScanning(false);
    await releaseWakeLock();
  }, [releaseWakeLock]);

  const refreshStats = useCallback(async () => {
    try {
      const data = await getOrganizerEventQrScanLogs(eventId);
      setStats(data.stats);
      setRecent(data.scan_logs.slice(0, 8));
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      /* keep prior stats on transient failure */
    } finally {
      setStatsLoading(false);
    }
  }, [eventId, onDenied]);

  useEffect(() => {
    setStatsLoading(true);
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && scanning) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [scanning, requestWakeLock]);

  const mapOutcome = useCallback(
    (data: Awaited<ReturnType<typeof validateOrganizerQrScan>>, token: string): UiResult => {
      const result = qrResultValue(data.result);
      const p = data.participation;

      // Wrong event for this door (same organizer, different event) — do not show success.
      if (p && Number(p.event_id) !== Number(eventId)) {
        return {
          kind: "invalid",
          message: "This ticket is for a different event.",
        };
      }

      if (result === "valid" && p) {
        return {
          kind: "valid",
          name: p.user?.name?.trim() || "Guest",
          ticket: participationTicketName(p),
          participation: p,
        };
      }

      if (result === "already_used" && p) {
        return {
          kind: "already_used",
          name: p.user?.name?.trim() || "Guest",
          ticket: participationTicketName(p),
          priorAt: p.updated_at || data.scan_log?.created_at || null,
          participation: p,
        };
      }

      // invalid (and any unexpected) — no internal reason leak
      void token;
      return {
        kind: "invalid",
        message: "This ticket cannot be checked in.",
      };
    },
    [eventId],
  );

  const processToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token) return;
      if (busyRef.current) return;

      const now = Date.now();
      if (
        lastTokenRef.current &&
        lastTokenRef.current.token === token &&
        now - lastTokenRef.current.at < DEBOUNCE_MS
      ) {
        return;
      }
      lastTokenRef.current = { token, at: now };

      busyRef.current = true;
      setProcessing(true);
      setResult(null);

      try {
        const data = await validateOrganizerQrScan({
          token,
          gate: `event:${eventId}`,
        });
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(data.checked_in ? 80 : 40);
          } catch {
            /* ignore */
          }
        }
        setResult(mapOutcome(data, token));
        void refreshStats();
      } catch (err) {
        if (isQrNetworkError(err)) {
          setResult({
            kind: "network",
            message: getApiErrorMessage(err, "Connection problem. Try again."),
            token,
          });
        } else if (isOrganizerEventAccessError(err)) {
          onDenied?.();
        } else {
          // Server/validation errors — not "invalid ticket"
          setResult({
            kind: "network",
            message: getApiErrorMessage(err, "Couldn't reach the server. Try again."),
            token,
          });
        }
      } finally {
        setProcessing(false);
        // Stay busy until user dismisses result (or network retry path clears)
        if (RESULT_HOLD_MS > 0) {
          window.setTimeout(() => {
            busyRef.current = false;
          }, RESULT_HOLD_MS);
        }
      }
    },
    [eventId, mapOutcome, onDenied, refreshStats],
  );

  const resumeScanning = useCallback(() => {
    setResult(null);
    setProcessing(false);
    busyRef.current = false;
  }, []);

  const retryNetwork = useCallback(() => {
    if (result?.kind !== "network") return;
    const token = result.token;
    busyRef.current = false;
    setResult(null);
    void processToken(token);
  }, [result, processToken]);

  const startCamera = async () => {
    setStarting(true);
    setCameraError(null);
    setResult(null);
    busyRef.current = false;
    try {
      await stopCamera();
      const html5 = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        {
          fps: 8,
          qrbox: (vw, vh) => {
            const m = Math.floor(Math.min(vw, vh) * 0.72);
            return { width: m, height: m };
          },
          aspectRatio: 1,
        },
        (decoded) => {
          if (busyRef.current) return;
          void processToken(decoded);
        },
        () => {
          /* frame miss */
        },
      );
      setScanning(true);
      await requestWakeLock();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not access the camera.";
      const denied =
        /NotAllowedError|Permission|denied|NotFoundError|secure/i.test(msg) ||
        /Permission denied/i.test(String(e));
      setCameraError(
        denied
          ? "Camera access was denied or unavailable. Allow camera permission for this site, or enter the ticket code manually."
          : `${msg} Use HTTPS and grant camera permission, or enter the code manually.`,
      );
      scannerRef.current = null;
      setScanning(false);
    } finally {
      setStarting(false);
    }
  };

  const submitManual = () => {
    if (!manualToken.trim()) return;
    setManualOpen(false);
    void processToken(manualToken);
    setManualToken("");
  };

  const overlayOpen = !!result || processing;

  return (
    <div className="flex flex-col gap-3 max-w-lg mx-auto">
      {/* Compact event context — stays above fold */}
      <div className="rounded-2xl bg-card px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Door check-in
            </p>
            <h2 className="font-display font-bold text-lg leading-tight truncate">{eventTitle}</h2>
          </div>
          <ScanLine className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatChip
            label="Checked in"
            value={statsLoading && !stats ? "…" : String(stats?.arrived ?? 0)}
          />
          <StatChip
            label="Registered"
            value={statsLoading && !stats ? "…" : String(stats?.registered ?? 0)}
          />
          <StatChip
            label="Waitlist"
            value={statsLoading && !stats ? "…" : String(stats?.waitlisted ?? 0)}
          />
        </div>
      </div>

      {/* Camera — primary viewport */}
      <div className="rounded-3xl bg-card overflow-hidden">
        <div className="relative aspect-[3/4] sm:aspect-square w-full bg-black">
          <div
            id={containerId}
            className="absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_img]:object-cover"
          />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-3 text-center px-6">
              <Camera className="w-12 h-12 opacity-80" />
              <p className="text-sm leading-relaxed">
                {starting
                  ? "Starting rear camera…"
                  : "Start the camera to scan ticket QR codes. Prefer rear camera on phones."}
              </p>
              {cameraError && (
                <p className="text-xs text-amber-200 leading-relaxed max-w-xs">{cameraError}</p>
              )}
            </div>
          )}
          {scanning && !overlayOpen && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-center">
              <p className="text-white text-sm font-medium">Align QR in the frame</p>
            </div>
          )}
          {processing && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-10 h-10 animate-spin" />
              <p className="text-sm font-medium">Validating…</p>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-wrap items-center justify-center gap-2">
          {!scanning ? (
            <Button
              onClick={() => void startCamera()}
              disabled={starting}
              className="rounded-full h-11 min-w-[140px] px-6 bg-foreground text-background hover:bg-foreground/90"
            >
              <Camera className="w-4 h-4 mr-2" />
              {starting ? "Starting…" : "Start camera"}
            </Button>
          ) : (
            <Button
              onClick={() => void stopCamera()}
              variant="outline"
              className="rounded-full h-11 min-w-[120px] px-6"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-full h-11 px-5"
            onClick={() => setManualOpen((v) => !v)}
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Manual code
          </Button>
        </div>

        {manualOpen && (
          <div className="px-4 pb-4 space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">
              Paste or type the ticket QR token if the camera is unavailable.
            </p>
            <div className="flex gap-2">
              <Input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Ticket token"
                aria-label="Ticket QR token"
                className="rounded-full h-11"
                autoComplete="off"
                autoCapitalize="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManual();
                }}
              />
              <Button
                className="rounded-full h-11 px-5 shrink-0"
                disabled={!manualToken.trim() || busyRef.current}
                onClick={submitManual}
                aria-label="Submit ticket token for check-in"
              >
                Check in
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Result overlay — high contrast, full clarity */}
      <AnimatePresence>
        {result && (
          <motion.div
            key={result.kind}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-lg",
              result.kind === "valid" && "bg-emerald-600 text-white",
              result.kind === "already_used" && "bg-amber-500 text-amber-950",
              result.kind === "invalid" && "bg-rose-600 text-white",
              result.kind === "network" && "bg-slate-800 text-white",
            )}
          >
            {result.kind === "valid" && (
              <>
                <CheckCircle2 className="w-14 h-14 mx-auto" />
                <p className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                  CHECKED IN
                </p>
                <p className="text-lg font-semibold">{result.name}</p>
                {result.ticket && <p className="text-sm opacity-90">{result.ticket}</p>}
              </>
            )}
            {result.kind === "already_used" && (
              <>
                <AlertTriangle className="w-14 h-14 mx-auto" />
                <p className="text-2xl sm:text-3xl font-display font-black tracking-tight">
                  ALREADY CHECKED IN
                </p>
                <p className="text-lg font-semibold">{result.name}</p>
                {result.ticket && <p className="text-sm opacity-90">{result.ticket}</p>}
                {result.priorAt && (
                  <p className="text-sm opacity-90">
                    Prior check-in{" "}
                    {format(new Date(result.priorAt), "MMM d, yyyy · h:mm a")}
                  </p>
                )}
              </>
            )}
            {result.kind === "invalid" && (
              <>
                <XCircle className="w-14 h-14 mx-auto" />
                <p className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                  INVALID
                </p>
                <p className="text-sm opacity-95">{result.message}</p>
              </>
            )}
            {result.kind === "network" && (
              <>
                <WifiOff className="w-14 h-14 mx-auto" />
                <p className="text-2xl font-display font-black tracking-tight">CONNECTION ERROR</p>
                <p className="text-sm opacity-90">{result.message}</p>
                <p className="text-xs opacity-75">
                  This is not an invalid ticket — check your connection and retry.
                </p>
              </>
            )}

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {result.kind === "network" ? (
                <>
                  <Button
                    className="rounded-full h-11 px-6 bg-white text-slate-900 hover:bg-white/90"
                    onClick={retryNetwork}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full h-11 px-6 border-white/40 text-white hover:bg-white/10"
                    onClick={resumeScanning}
                  >
                    Resume scanning
                  </Button>
                </>
              ) : (
                <Button
                  className={cn(
                    "rounded-full h-11 px-8",
                    result.kind === "already_used"
                      ? "bg-amber-950 text-amber-50 hover:bg-amber-950/90"
                      : "bg-white text-foreground hover:bg-white/90",
                  )}
                  onClick={resumeScanning}
                >
                  Scan next
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent history — below fold; optional */}
      {recent.length > 0 && !result && (
        <div className="rounded-2xl bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent scans
          </p>
          <ul className="space-y-1.5">
            {recent.map((log) => {
              const r = qrResultValue(log.result);
              return (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/30 last:border-0"
                >
                  <span className="truncate font-medium">
                    {log.participation?.user?.name ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase shrink-0",
                      r === "valid" && "text-emerald-600",
                      r === "already_used" && "text-amber-600",
                      r === "invalid" && "text-rose-600",
                    )}
                  >
                    {String(r).replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2.5 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-display font-bold tabular-nums leading-tight">{value}</p>
    </div>
  );
}
