"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Template, TemplateFrame } from "../hooks/useTemplates";

type TemplateEditorProps = {
  template: Template | null;
  captures: string[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string | null) => void;
  onUpdateFrame: (id: string, partial: Partial<TemplateFrame>) => void;
  onAddFrame: () => void;
  onRemoveFrame: (id: string) => void;
  editingEnabled: boolean;
};

type DragState =
  | null
  | {
    frameId: string;
    mode: "move" | "resize";
    handle?: "tl" | "tr" | "bl" | "br";
    startX: number;
    startY: number;
    startFrame: TemplateFrame;
    bounds: DOMRect;
  };

const snapValue = (v: number, step = 0.01) => Math.round(v / step) * step;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const pct = (v: number) => Math.round(v * 1000) / 10; // one decimal %

export function TemplateEditor({
  template,
  captures,
  selectedFrameId,
  onSelectFrame,
  onUpdateFrame,
  onAddFrame,
  onRemoveFrame,
  editingEnabled,
}: TemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>(null);

  const selectedFrame = useMemo(
    () => template?.frames.find((f) => f.id === selectedFrameId) ?? null,
    [template?.frames, selectedFrameId]
  );

  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const { bounds, startFrame, mode, handle } = drag;
      const dx = (e.clientX - drag.startX) / bounds.width;
      const dy = (e.clientY - drag.startY) / bounds.height;
      let next: TemplateFrame = { ...startFrame };

      if (mode === "move") {
        next.x = clamp01(startFrame.x + dx);
        next.y = clamp01(startFrame.y + dy);
        next.x = clamp01(Math.min(next.x, 1 - next.width));
        next.y = clamp01(Math.min(next.y, 1 - next.height));
      } else if (mode === "resize" && handle) {
        const applyResize = () => {
          if (handle === "tl") {
            const newX = clamp01(startFrame.x + dx);
            const newY = clamp01(startFrame.y + dy);
            const newW = clamp01(startFrame.width - dx);
            const newH = clamp01(startFrame.height - dy);
            next = { ...next, x: newX, y: newY, width: newW, height: newH };
          }
          if (handle === "tr") {
            const newY = clamp01(startFrame.y + dy);
            const newW = clamp01(startFrame.width + dx);
            const newH = clamp01(startFrame.height - dy);
            next = { ...next, y: newY, width: newW, height: newH };
          }
          if (handle === "bl") {
            const newX = clamp01(startFrame.x + dx);
            const newW = clamp01(startFrame.width - dx);
            const newH = clamp01(startFrame.height + dy);
            next = { ...next, x: newX, width: newW, height: newH };
          }
          if (handle === "br") {
            const newW = clamp01(startFrame.width + dx);
            const newH = clamp01(startFrame.height + dy);
            next = { ...next, width: newW, height: newH };
          }
        };
        applyResize();
        next.width = Math.max(0.05, Math.min(1, next.width));
        next.height = Math.max(0.05, Math.min(1, next.height));
        next.x = clamp01(Math.min(next.x, 1 - next.width));
        next.y = clamp01(Math.min(next.y, 1 - next.height));
      }

      next.x = snapValue(next.x);
      next.y = snapValue(next.y);
      next.width = snapValue(next.width);
      next.height = snapValue(next.height);
      onUpdateFrame(drag.frameId, next);
    };

    const handleUp = () => setDrag(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, onUpdateFrame]);

  const beginDrag = (
    frame: TemplateFrame,
    e: React.PointerEvent,
    mode: "move" | "resize",
    handle?: DragState["handle"]
  ) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    onSelectFrame(frame.id);
    setDrag({
      frameId: frame.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startFrame: frame,
      bounds,
    });
  };

  if (!template) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 text-sm text-slate-500">
        No template selected.
      </div>
    );
  }

  const aspectRatio = `${template.canvasWidth}/${template.canvasHeight}`;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner"
        style={{ aspectRatio, background: template.bg ?? "#ffffff" }}
      >
        {template.overlay ? (
          <img
            src={template.overlay}
            alt="Overlay"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
        {template.frames.map((frame, idx) => {
          const src = captures[idx] ?? null;
          const isSelected = frame.id === selectedFrameId;
          return (
            <div
              key={frame.id}
              className="absolute"
              style={{
                left: `${frame.x * 100}%`,
                top: `${frame.y * 100}%`,
                width: `${frame.width * 100}%`,
                height: `${frame.height * 100}%`,
                transform: `rotate(${frame.rotation ?? 0}deg)`,
                transformOrigin: "center center",
              }}
            >
              <div
                className={`relative h-full w-full overflow-hidden border ${isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-white/60"
                  } ${editingEnabled ? "cursor-move" : "cursor-default"}`}
                style={{
                  borderRadius: `${frame.radius ?? 12}px`,
                  boxShadow: "0 10px 30px rgba(15,23,42,0.18)",
                }}
                onPointerDown={(e) => {
                  if (!editingEnabled) return;
                  beginDrag(frame, e, "move");
                }}
              >
                {src ? (
                  <img src={src} alt={`Frame ${idx + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[11px] text-slate-500">
                    Empty
                  </div>
                )}

                {editingEnabled && (
                  <>
                    {["tl", "tr", "bl", "br"].map((h) => (
                      <span
                        key={h}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          beginDrag(frame, e, "resize", h as DragState["handle"]);
                        }}
                        className="absolute h-3 w-3 rounded-full border border-white bg-blue-500"
                        style={{
                          left: h.includes("l") ? -6 : undefined,
                          right: h.includes("r") ? -6 : undefined,
                          top: h.includes("t") ? -6 : undefined,
                          bottom: h.includes("b") ? -6 : undefined,
                          cursor:
                            h === "tl"
                              ? "nwse-resize"
                              : h === "tr"
                                ? "nesw-resize"
                                : h === "bl"
                                  ? "nesw-resize"
                                  : "nwse-resize",
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFrame(frame.id);
                      }}
                      className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-white"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {editingEnabled ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => onAddFrame()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Add frame
          </button>
          {selectedFrame ? (
            <>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                Radius
              </span>
              <input
                type="range"
                min={0}
                max={48}
                value={selectedFrame.radius ?? 12}
                onChange={(e) =>
                  onUpdateFrame(selectedFrame.id, { radius: Number(e.target.value) })
                }
              />
              <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">
                Rotation
              </span>
              <input
                type="range"
                min={-180}
                max={180}
                value={selectedFrame.rotation ?? 0}
                onChange={(e) =>
                  onUpdateFrame(selectedFrame.id, { rotation: Number(e.target.value) })
                }
              />
              <span className="text-slate-500">{selectedFrame.rotation ?? 0}°</span>
            </>
          ) : (
            <span className="text-slate-500">Select a frame to tweak radius.</span>
          )}
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white/90 p-3 text-xs text-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">Frame metrics</span>
          <span className="text-[11px] text-slate-500">
            Canvas: {template.canvasWidth} × {template.canvasHeight}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {template.frames.map((frame, idx) => {
            const xPx = Math.round(frame.x * template.canvasWidth);
            const yPx = Math.round(frame.y * template.canvasHeight);
            const wPx = Math.round(frame.width * template.canvasWidth);
            const hPx = Math.round(frame.height * template.canvasHeight);
            const isSel = frame.id === selectedFrameId;
            return (
              <div
                key={frame.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1 ${isSel ? "bg-blue-50 text-blue-900" : "bg-slate-50 text-slate-700"
                  }`}
              >
                <span className="font-semibold">
                  Frame {idx + 1}
                  {isSel ? " (selected)" : ""}
                </span>
                <span className="flex flex-wrap gap-2 text-[11px]">
                  <span>
                    x {pct(frame.x)}% ({xPx}px) · y {pct(frame.y)}% ({yPx}px)
                  </span>
                  <span>
                    w {pct(frame.width)}% ({wPx}px) · h {pct(frame.height)}% ({hPx}px)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


