import QRCode from "qrcode";
import type { TicketStubModel } from "@/components/participant/PurchasedTicketStub";

const W = 1600;
const H = 520;
const R = 36;
const GREEN = "hsl(160 72% 34%)";
const INK = "#111827";
const MUTED = "#9CA3AF";
const CHIP = "#F3F4F6";
const LINE = "#E5E7EB";

export function ticketSerial(id: number) {
  return `EH-${String(id).padStart(5, "0")}`;
}

function dayPart(iso: string | null | undefined) {
  if (!iso) return { day: "--", month: "TBA" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
  };
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
) {
  ctx.fillStyle = CHIP;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = "600 18px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(label.toUpperCase(), x + 22, y + 36);
  ctx.fillStyle = INK;
  ctx.font = "600 28px 'IBM Plex Mono', ui-monospace, monospace";
  let shown = value;
  while (ctx.measureText(shown).width > w - 40 && shown.length > 4) {
    shown = `${shown.slice(0, -2)}…`;
  }
  ctx.fillText(shown, x + 22, y + 74);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not encode QR"));
    img.src = src;
  });
}

/** Landscape EventHub pass PNG — ticket only, no page chrome. */
export async function downloadTicketPng(ticket: TicketStubModel): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw ticket");

  const serial = ticketSerial(ticket.id);
  const when = dayPart(ticket.startsAt);
  const type = ticket.ticketType || "General";
  const status = (ticket.statusLabel || "Confirmed").toUpperCase();
  const qrPanel = 300;
  const bar = 64;
  const bodyLeft = bar;
  const bodyRight = W - qrPanel;

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, W, H, R);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 0, 0, W, H, R);
  ctx.clip();

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, bar, H);
  ctx.save();
  ctx.translate(bar / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ADMIT ONE", 0, 0);
  ctx.restore();

  ctx.fillStyle = MUTED;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 20px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(`EVENTHUB PASS · ${serial}`, bodyLeft + 40, 72);
  ctx.fillStyle = GREEN;
  ctx.textAlign = "right";
  ctx.fillText(status, bodyRight - 36, 72);

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  const title = ticket.title || "Event";
  const maxTitle = bodyRight - bodyLeft - 80;
  let titleFont = 52;
  ctx.font = `700 ${titleFont}px Outfit, 'Funnel Sans', ui-sans-serif, sans-serif`;
  while (ctx.measureText(title).width > maxTitle && titleFont > 32) {
    titleFont -= 2;
    ctx.font = `700 ${titleFont}px Outfit, 'Funnel Sans', ui-sans-serif, sans-serif`;
  }
  ctx.fillText(title, bodyLeft + 40, 160);

  const chipY = 330;
  const chipH = 108;
  const gap = 16;
  const chipW = (bodyRight - bodyLeft - 80 - gap * 2) / 3;
  drawChip(ctx, bodyLeft + 40, chipY, chipW, chipH, "Date", `${when.day} ${when.month}`);
  drawChip(ctx, bodyLeft + 40 + chipW + gap, chipY, chipW, chipH, "Door", formatTime(ticket.startsAt));
  drawChip(ctx, bodyLeft + 40 + (chipW + gap) * 2, chipY, chipW, chipH, "Type", type);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(bodyRight, 36);
  ctx.lineTo(bodyRight, H - 36);
  ctx.stroke();
  ctx.setLineDash([]);

  const qrSize = 220;
  const qrX = bodyRight + (qrPanel - qrSize) / 2;
  const qrY = 88;
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (ticket.valid && ticket.qrToken) {
    const qrUrl = await QRCode.toDataURL(ticket.qrToken, {
      width: 440,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = "600 18px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(ticket.valid ? "ENCODING" : "LOCKED", bodyRight + qrPanel / 2, qrY + qrSize / 2);
  }

  ctx.fillStyle = MUTED;
  ctx.font = "600 16px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("DOOR CHIP", bodyRight + qrPanel / 2, qrY + qrSize + 48);
  ctx.restore();

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, W - 2, H - 2, R);
  ctx.stroke();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not export ticket");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eventhub-pass-${serial}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
