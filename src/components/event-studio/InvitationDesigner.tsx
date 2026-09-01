import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconPhoto, IconRefresh, IconSave, IconUpload } from "@/components/organizer-console/orgIcons";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DEFAULT_CUSTOMIZATIONS,
  DEFAULT_OVERLAY_POSITIONS,
  OVERLAY_FIELD_KEYS,
  isSizedOverlay,
  sanitizeCustomizations,
  sanitizeOverlayPositions,
} from "@/lib/invitationCanvas";
import InvitationCanvasPreview, { InvitationScaled } from "@/components/invitation/InvitationCanvasPreview";
import InvitationOverlayEditor from "@/components/invitation/InvitationOverlayEditor";
import {
  eventTemplateToConfig,
  getEventInvitationTemplate,
  listInvitationSystemTemplates,
  saveEventInvitationTemplate,
  uploadInvitationBackground,
  validateInvitationBackground,
  type EventInvitationTemplate,
  type InvitationSystemTemplate,
} from "@/services/organizerInvitations";
import type { Customizations, OverlayPositions } from "@/services/participationService";

type Props = {
  eventId: number;
  eventTitle: string;
  startsAt?: string | null;
  venue?: string | null;
  onDenied: () => void;
};

export default function InvitationDesigner({ eventId, eventTitle, startsAt, venue, onDenied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [systems, setSystems] = useState<InvitationSystemTemplate[]>([]);
  const [existing, setExisting] = useState<EventInvitationTemplate | null>(null);
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [systemId, setSystemId] = useState<number | null>(null);
  const [customizations, setCustomizations] = useState<Customizations>({ ...DEFAULT_CUSTOMIZATIONS });
  const [overlays, setOverlays] = useState<OverlayPositions>({ ...DEFAULT_OVERLAY_POSITIONS });
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("participant_name");
  const [previewQr, setPreviewQr] = useState<string | null>(null);

  const selected = overlays[selectedKey] ?? {};
  const selectedSystem = systems.find((s) => s.id === systemId) ?? null;
  const canDrag = mode === "custom" && !isMobile;

  const load = async () => {
    setLoading(true);
    try {
      const [sys, payload] = await Promise.all([
        listInvitationSystemTemplates(),
        getEventInvitationTemplate(eventId),
      ]);
      setSystems(sys);
      const template = payload.template;
      setExisting(template);
      if (template) {
        setMode(template.mode === "custom" ? "custom" : "template");
        setSystemId(template.system_template_id);
        setCustomizations({
          ...DEFAULT_CUSTOMIZATIONS,
          ...(template.customizations ?? template.system_template?.default_customizations ?? {}),
        });
        setOverlays({
          ...DEFAULT_OVERLAY_POSITIONS,
          ...(template.system_template?.default_overlay_positions ?? {}),
          ...(template.overlay_positions ?? {}),
        });
        setBackgroundPath(template.background_image_path);
      }
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't load invitation designer"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  useEffect(() => {
    QRCode.toDataURL("EVENTHUB-INVITATION-PREVIEW", {
      width: 400,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setPreviewQr)
      .catch(() => setPreviewQr(null));
  }, []);

  const applySystem = (sys: InvitationSystemTemplate) => {
    setMode("template");
    setSystemId(sys.id);
    setCustomizations({ ...DEFAULT_CUSTOMIZATIONS, ...(sys.default_customizations ?? {}) });
    setOverlays({ ...DEFAULT_OVERLAY_POSITIONS, ...(sys.default_overlay_positions ?? {}) });
  };

  const previewConfig = eventTemplateToConfig({
    id: existing?.id ?? 0,
    event_id: eventId,
    mode,
    system_template_id: systemId,
    background_image_path: backgroundPath,
    overlay_positions: overlays,
    customizations,
    system_template: selectedSystem,
  });

  const persist = async (nextMode = mode) => {
    if (nextMode === "template" && !systemId) {
      toast.error("Pick a system template, or switch to custom.");
      return;
    }
    setSaving(true);
    try {
      const payload = await saveEventInvitationTemplate(
        eventId,
        {
          mode: nextMode,
          system_template_id: nextMode === "template" ? systemId : null,
          customizations: sanitizeCustomizations(customizations),
          overlay_positions: sanitizeOverlayPositions(overlays),
        },
        !existing,
      );
      setExisting(payload.template);
      toast.success("Invitation saved");
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't save invitation"));
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    const invalid = validateInvitationBackground(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setUploading(true);
    try {
      const payload = await uploadInvitationBackground(eventId, file);
      const saved = payload.template
        ? await saveEventInvitationTemplate(
            eventId,
            {
              mode: "custom",
              system_template_id: payload.template.system_template_id,
              customizations: sanitizeCustomizations(customizations),
              overlay_positions: sanitizeOverlayPositions(overlays),
            },
            false,
          )
        : payload;
      setExisting(saved.template);
      setMode("custom");
      setBackgroundPath(saved.template?.background_image_path ?? null);
      toast.success("Background uploaded");
    } catch (err) {
      if (isOrganizerEventAccessError(err)) onDenied();
      else toast.error(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const resetDefaults = () => {
    const sys = selectedSystem;
    setCustomizations({ ...DEFAULT_CUSTOMIZATIONS, ...(sys?.default_customizations ?? {}) });
    setOverlays({ ...DEFAULT_OVERLAY_POSITIONS, ...(sys?.default_overlay_positions ?? {}) });
    toast.message("Restored default overlays and style. Save to persist.");
  };

  const patchSelected = (patch: Record<string, number | string | undefined>) => {
    setOverlays((prev) => ({
      ...prev,
      [selectedKey]: { ...prev[selectedKey], ...patch },
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const preview = (
    <InvitationScaled
      overlay={
        <InvitationOverlayEditor
          overlays={overlays}
          selectedKey={selectedKey}
          interactive={canDrag}
          onSelect={setSelectedKey}
          onChange={(key, patch) => setOverlays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))}
        />
      }
    >
      <InvitationCanvasPreview
        model={{
          eventTitle,
          startsAt,
          venue,
          ticketName: "General admission",
          attendeeName: "Amina Hassan",
          invitation: previewConfig,
          qrDataUrl: previewQr,
        }}
      />
    </InvitationScaled>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg">Invitation designer</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            800×1100 portrait — positions are stored in canvas space, not screen pixels.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={resetDefaults}>
            <IconRefresh className="w-4 h-4 mr-2" /> Reset defaults
          </Button>
          <Button className="rounded-full" onClick={() => void persist()} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <IconSave className="w-4 h-4 mr-2" />}
            Save invitation
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 sm:p-5 flex flex-wrap gap-2">
        {(["template", "custom"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setMode(m)}
          >
            {m === "template" ? "System template" : "Custom"}
          </Button>
        ))}
      </div>

      {mode === "template" && (
        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-3">
          <h4 className="font-display font-semibold text-sm">Library</h4>
          {systems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active system templates yet. Use custom upload, or ask an admin to publish templates.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {systems.map((sys) => {
                const thumb = getMediaUrl(sys.thumbnail_path || sys.background_image_path);
                const active = systemId === sys.id;
                return (
                  <button
                    key={sys.id}
                    type="button"
                    onClick={() => applySystem(sys)}
                    className={`rounded-xl overflow-hidden text-left border ${active ? "border-foreground ring-2 ring-foreground/20" : "border-transparent"} bg-muted/40`}
                  >
                    <div className="aspect-[8/11] bg-muted">
                      {thumb ? <img src={thumb} alt={sys.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/40 to-violet-600/40" />}
                    </div>
                    <p className="text-xs font-medium px-2 py-2 truncate">{sys.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "custom" && (
        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-display font-semibold text-sm">Custom background</h4>
              <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, or WebP · max 5 MB · recommended 800×1100</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <IconUpload className="w-3.5 h-3.5 mr-1.5" />}
              Upload
            </Button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void onUpload(file);
            }}
            className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            ) : (
              <>
                <IconPhoto className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Drop a background here or use Upload</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4 order-2 lg:order-1">
          <h4 className="font-display font-semibold text-sm">Style</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary</Label>
              <Input type="color" className="h-10 rounded-xl p-1" value={String(customizations.primary_color || "#0ea5e9")} onChange={(e) => setCustomizations({ ...customizations, primary_color: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Secondary</Label>
              <Input type="color" className="h-10 rounded-xl p-1" value={String(customizations.secondary_color || "#0369a1")} onChange={(e) => setCustomizations({ ...customizations, secondary_color: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Header text</Label>
              <Input className="rounded-full" value={String(customizations.header_text || "")} onChange={(e) => setCustomizations({ ...customizations, header_text: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Font family</Label>
              <Input className="rounded-full" value={String(customizations.font_family || "Inter")} onChange={(e) => setCustomizations({ ...customizations, font_family: e.target.value })} />
            </div>
          </div>
          {typeof customizations.logo_path === "string" && customizations.logo_path ? (
            <p className="text-xs text-muted-foreground">Template logo path is kept on save. There is no separate logo upload on this API.</p>
          ) : null}

          <h4 className="font-display font-semibold text-sm pt-2">Overlay positions</h4>
          <p className="text-xs text-muted-foreground">
            {canDrag
              ? "Drag zones on the canvas. Resize the QR box from its corner. Values stay in 800×1100."
              : isMobile
                ? "On small screens the canvas is preview-only. Edit overlays on tablet or desktop."
                : "Switch to Custom to drag zones on the canvas."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {OVERLAY_FIELD_KEYS.map((key) => (
              <Button key={key} type="button" size="sm" variant={selectedKey === key ? "default" : "outline"} className="rounded-full text-[11px] h-7" onClick={() => setSelectedKey(key)}>
                {key.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">X</Label>
              <Input type="number" className="rounded-full" value={selected.x ?? 0} onChange={(e) => patchSelected({ x: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Y</Label>
              <Input type="number" className="rounded-full" value={selected.y ?? 0} onChange={(e) => patchSelected({ y: Number(e.target.value) })} />
            </div>
            {isSizedOverlay(selectedKey) ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Width</Label>
                  <Input type="number" className="rounded-full" value={selected.width ?? 120} onChange={(e) => patchSelected({ width: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Height</Label>
                  <Input type="number" className="rounded-full" value={selected.height ?? 60} onChange={(e) => patchSelected({ height: Number(e.target.value) })} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Font size</Label>
                  <Input type="number" className="rounded-full" value={selected.font_size ?? 18} onChange={(e) => patchSelected({ font_size: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <Input type="color" className="h-10 rounded-xl p-1" value={String(selected.font_color || "#111827")} onChange={(e) => patchSelected({ font_color: e.target.value })} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-4 self-start">
          <p className="text-xs text-muted-foreground mb-2">Live preview</p>
          {isMobile && (
            <p className="text-xs text-muted-foreground mb-2 rounded-xl bg-muted/50 px-3 py-2">
              Preview only on this screen. Open on a larger display to drag overlay zones.
            </p>
          )}
          {preview}
        </div>
      </div>
    </div>
  );
}
