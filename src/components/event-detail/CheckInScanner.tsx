import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  IconAlert,
  IconCamera,
  IconCameraOff,
  IconCheck,
  IconCheckCircle,
  IconKeyboard,
  IconOffline,
  IconXCircle,
} from "@/components/organizer-console/orgIcons";
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

/** Door scanner — dark card for camera contrast, constrained to the console column. */
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
          event_id: eventId,
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
  const lastScan = recent[0] ?? null;

  return (
    <div className="max-w-xl mx-auto rounded-[16px] bg-oc-dark overflow-hidden flex flex-col w-full" data-testid="checkin-scanner">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <p className="font-head font-semibold text-[17px] text-white leading-tight truncate">Door check-in</p>
          <p className="text-[11px] text-[#A3A39D] truncate">{eventTitle}</p>
        </div>
        {scanning && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D] animate-pulse" />
            <span className="text-[10px] font-bold tracking-[1px] text-white">LIVE</span>
          </span>
        )}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        {[
          { label: "Checked in", value: stats?.arrived ?? 0 },
          { label: "Registered", value: stats?.registered ?? 0 },
          { label: "Waitlist", value: stats?.waitlisted ?? 0 },
        ].map((c) => (
          <div key={c.label} className="rounded-[12px] bg-oc-dark-soft px-3 py-2.5">
            <p className="font-head text-xl font-bold text-white tabular-nums leading-tight">
              {statsLoading && !stats ? "…" : c.value}
            </p>
            <p className="text-[10px] text-[#A3A39D]">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Camera viewport */}
      <div className="relative w-full h-[240px] sm:h-[360px] max-h-[360px] bg-black">
        <div
          id={containerId}
          className="absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_img]:object-cover"
        />
        {scanning && !overlayOpen && (
          <>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[72%] aspect-square">
                {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                ].map((pos) => (
                  <span key={pos} className={cn("absolute w-9 h-9 border-white", pos)} />
                ))}
                <span className="absolute inset-x-2 top-1/2 h-0.5 bg-oc-accent/90 rounded animate-pulse" />
              </div>
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/70">
              Align the QR code within the frame
            </p>
          </>
        )}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-3 text-center px-6">
            <IconCamera className="w-12 h-12 opacity-80" />
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
        {processing && (
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm font-medium">Validating…</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-center gap-2">
        {!scanning ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={starting}
            className="inline-flex items-center justify-center gap-2 rounded-full h-11 min-w-[140px] px-6 bg-white text-oc-ink text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            <IconCamera className="w-4 h-4" />
            {starting ? "Starting…" : "Start camera"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopCamera()}
            className="inline-flex items-center justify-center gap-2 rounded-full h-11 min-w-[120px] px-6 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            <IconCameraOff className="w-4 h-4" />
            Stop
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
          onClick={() => setManualOpen((v) => !v)}
        >
          <IconKeyboard className="w-4 h-4" />
          Manual code
        </button>
      </div>

      {manualOpen && (
        <div className="mx-4 mb-3 rounded-[12px] bg-oc-dark-soft p-3 flex flex-col gap-2">
          <p className="text-xs text-[#A3A39D]">
            Paste or type the ticket QR token if the camera is unavailable.
          </p>
          <div className="flex gap-2">
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Ticket token"
              aria-label="Ticket QR token"
              className="flex-1 min-w-0 rounded-full h-11 px-4 bg-black/40 text-white text-sm placeholder:text-white/40 outline-none focus:ring-2 focus:ring-oc-brand"
              autoComplete="off"
              autoCapitalize="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitManual();
              }}
            />
            <button
              type="button"
              className="rounded-full h-11 px-5 shrink-0 bg-oc-brand text-white text-sm font-semibold hover:bg-oc-brand-strong transition-colors disabled:opacity-50"
              disabled={!manualToken.trim() || busyRef.current}
              onClick={submitManual}
              aria-label="Submit ticket token for check-in"
            >
              Check in
            </button>
          </div>
        </div>
      )}

      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            key={result.kind}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "mx-4 mb-3 rounded-[16px] p-4 sm:p-5 text-center space-y-2",
              result.kind === "valid" && "bg-oc-brand text-white",
              result.kind === "already_used" && "bg-oc-accent text-oc-dark",
              result.kind === "invalid" && "bg-oc-bad text-white",
              result.kind === "network" && "bg-oc-dark-soft text-white",
            )}
          >
            {result.kind === "valid" && (
              <>
                <IconCheckCircle className="w-8 h-8 mx-auto" />
                <p className="text-xl font-head font-semibold tracking-tight">Checked in</p>
                <p className="text-sm font-semibold">{result.name}</p>
                {result.ticket && <p className="text-xs opacity-90">{result.ticket}</p>}
              </>
            )}
            {result.kind === "already_used" && (
              <>
                <IconAlert className="w-8 h-8 mx-auto" />
                <p className="text-xl font-head font-semibold tracking-tight">Already checked in</p>
                <p className="text-sm font-semibold">{result.name}</p>
                {result.ticket && <p className="text-xs opacity-90">{result.ticket}</p>}
                {result.priorAt && (
                  <p className="text-xs opacity-90">
                    Prior check-in {format(new Date(result.priorAt), "MMM d, yyyy · h:mm a")}
                  </p>
                )}
              </>
            )}
            {result.kind === "invalid" && (
              <>
                <IconXCircle className="w-8 h-8 mx-auto" />
                <p className="text-xl font-head font-semibold tracking-tight">Invalid ticket</p>
                <p className="text-sm opacity-95">{result.message}</p>
              </>
            )}
            {result.kind === "network" && (
              <>
                <IconOffline className="w-8 h-8 mx-auto" />
                <p className="text-xl font-head font-semibold tracking-tight">Connection error</p>
                <p className="text-sm opacity-90">{result.message}</p>
                <p className="text-xs opacity-75">
                  This is not an invalid ticket — check your connection and retry.
                </p>
              </>
            )}

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {result.kind === "network" ? (
                <>
                  <button
                    type="button"
                    className="rounded-full h-11 px-6 bg-white text-oc-ink text-sm font-semibold hover:bg-white/90 transition-colors"
                    onClick={retryNetwork}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    className="rounded-full h-11 px-6 border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
                    onClick={resumeScanning}
                  >
                    Resume scanning
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "rounded-full h-11 px-8 text-sm font-semibold transition-colors",
                    result.kind === "already_used"
                      ? "bg-oc-dark text-white hover:bg-oc-dark-soft"
                      : "bg-white text-oc-ink hover:bg-white/90",
                  )}
                  onClick={resumeScanning}
                >
                  Scan next
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last scan sheet */}
      {lastScan && !result && (
        <div className="mt-auto rounded-t-[24px] bg-oc-dark-soft px-4 pt-3.5 pb-5 flex flex-col gap-2.5">
          <p className="text-[9px] font-bold tracking-[1.5px] text-[#A3A39D]">LAST SCAN</p>
          <LastScanCard log={lastScan} />
          {recent.length > 1 && (
            <ul className="flex flex-col">
              {recent.slice(1).map((log) => {
                const r = qrResultValue(log.result);
                return (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-2 text-sm py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="truncate font-medium text-white/90 text-[13px]">
                      {log.participation?.user?.name ?? "—"}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase shrink-0",
                        r === "valid" && "text-[#7BC4AE]",
                        r === "already_used" && "text-oc-accent",
                        r === "invalid" && "text-[#E5484D]",
                      )}
                    >
                      {String(r).replace(/_/g, " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LastScanCard({ log }: { log: OrganizerQrScanLog }) {
  const r = qrResultValue(log.result);
  const valid = r === "valid";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[12px] px-3.5 py-3",
        valid ? "bg-oc-brand/20" : r === "already_used" ? "bg-oc-accent/15" : "bg-[#E5484D]/15",
      )}
    >
      <span
        className={cn(
          "w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0",
          valid ? "bg-oc-brand" : r === "already_used" ? "bg-oc-accent" : "bg-[#E5484D]",
        )}
      >
        {valid ? (
          <IconCheck className="w-[17px] h-[17px] text-white" />
        ) : r === "already_used" ? (
          <IconAlert className="w-[17px] h-[17px] text-oc-dark" />
        ) : (
          <IconXCircle className="w-[17px] h-[17px] text-white" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-white truncate">
          {log.participation?.user?.name ?? "—"}
        </p>
        <p className="text-[11px] text-[#A3A39D] truncate">
          {log.participation ? participationTicketName(log.participation) ?? "Ticket" : "Unknown ticket"}
        </p>
      </div>
      <span className="font-data text-[13px] font-semibold text-[#7BC4AE] shrink-0">
        {log.created_at ? format(new Date(log.created_at), "HH:mm") : ""}
      </span>
    </div>
  );
}
