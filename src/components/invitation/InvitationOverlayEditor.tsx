import { useRef } from "react";
import {
  INVITATION_CANVAS_H,
  INVITATION_CANVAS_W,
  OVERLAY_FIELD_KEYS,
  clampLogical,
  isSizedOverlay,
  logicalRectToPercent,
  overlayHitBox,
  screenPointToLogical,
  type OverlayFieldKey,
} from "@/lib/invitationCanvas";
import type { OverlayPositions } from "@/services/participationService";
import { cn } from "@/lib/utils";

type DragState =
  | { kind: "move"; key: OverlayFieldKey; grabX: number; grabY: number }
  | { kind: "resize"; key: OverlayFieldKey; originX: number; originY: number };

type Props = {
  overlays: OverlayPositions;
  selectedKey: string;
  interactive: boolean;
  onSelect: (key: OverlayFieldKey) => void;
  onChange: (key: OverlayFieldKey, patch: OverlayPositions[string]) => void;
};

export default function InvitationOverlayEditor({
  overlays,
  selectedKey,
  interactive,
  onSelect,
  onChange,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const applyPointer = (clientX: number, clientY: number) => {
    const layer = layerRef.current;
    const drag = dragRef.current;
    if (!layer || !drag) return;
    const logical = screenPointToLogical(clientX, clientY, layer.getBoundingClientRect());
    if (drag.kind === "move") {
      onChange(drag.key, {
        x: Math.round(clampLogical(logical.x - drag.grabX, 0, INVITATION_CANVAS_W - 8)),
        y: Math.round(clampLogical(logical.y - drag.grabY, 0, INVITATION_CANVAS_H - 8)),
      });
      return;
    }
    onChange(drag.key, {
      width: Math.round(clampLogical(logical.x - drag.originX, 40, INVITATION_CANVAS_W - drag.originX)),
      height: Math.round(clampLogical(logical.y - drag.originY, 40, INVITATION_CANVAS_H - drag.originY)),
    });
  };

  return (
    <div
      ref={layerRef}
      className={cn("absolute inset-0", interactive ? "cursor-default" : "pointer-events-none")}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        applyPointer(e.clientX, e.clientY);
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      {OVERLAY_FIELD_KEYS.map((key) => {
        const box = overlayHitBox(key, overlays[key]);
        const selected = selectedKey === key;
        const style = logicalRectToPercent(box);
        return (
          <div
            key={key}
            role="button"
            tabIndex={interactive ? 0 : -1}
            className={cn(
              "absolute rounded-md border-2",
              selected ? "border-white bg-white/15 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" : "border-white/50 bg-black/10",
              interactive && "cursor-grab active:cursor-grabbing",
            )}
            style={style}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.preventDefault();
              e.stopPropagation();
              onSelect(key);
              const layer = layerRef.current;
              if (!layer) return;
              const logical = screenPointToLogical(e.clientX, e.clientY, layer.getBoundingClientRect());
              dragRef.current = {
                kind: "move",
                key,
                grabX: logical.x - box.x,
                grabY: logical.y - box.y,
              };
              layer.setPointerCapture(e.pointerId);
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] font-semibold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap">
              {key.replace(/_/g, " ")}
            </span>
            {interactive && isSizedOverlay(key) && selected && (
              <button
                type="button"
                aria-label="Resize QR zone"
                className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-sm bg-white border border-foreground/40 cursor-nwse-resize"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const layer = layerRef.current;
                  if (!layer) return;
                  dragRef.current = {
                    kind: "resize",
                    key,
                    originX: box.x,
                    originY: box.y,
                  };
                  layer.setPointerCapture(e.pointerId);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
