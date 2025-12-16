"use client";

import { useRef, useEffect } from "react";
import { LayoutConfig } from "../hooks/usePhotobooth";
import { Template } from "../hooks/useTemplates";

// helper to detect jpg overlay
function isJpegOverlay(overlay: string | null | undefined): boolean {
  if (!overlay) return false;
  const lower = overlay.toLowerCase();
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return true;
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg"))
    return true;
  return false;
}

type CaptureGridProps = {
  captures: string[];
  layout: LayoutConfig;
  template?: Template | null;
  useTemplate?: boolean;
  liveStream?: MediaStream | null;
  highlightNextIndex?: number | null;
  noCard?: boolean;
  /** Kiosk mode: stronger contrast, disabled look for non-next frames */
  kioskMode?: boolean;
};

export function CaptureGrid({
  captures,
  layout,
  template,
  useTemplate = false,
  liveStream = null,
  highlightNextIndex = null,
  noCard = false,
  kioskMode = false,
}: CaptureGridProps) {
  // If we are using a template, always render the template (even when empty)
  if (useTemplate && template) {
    const aspectRatio = `${template.canvasWidth}/${template.canvasHeight}`;
    const overlayIsBackground = isJpegOverlay(template.overlay);
    const containerClasses = noCard
      ? "relative w-full overflow-hidden"
      : "relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

    return (
      <div
        className={containerClasses}
        style={{
          background: template.bg ?? layout.bg,
          aspectRatio,
          maxWidth: "100%",
          backgroundImage: template.overlay && overlayIsBackground ? `url(${template.overlay})` : undefined,
          backgroundSize: template.overlay && overlayIsBackground ? "cover" : undefined,
          backgroundPosition: template.overlay && overlayIsBackground ? "center" : undefined,
          backgroundRepeat: template.overlay && overlayIsBackground ? "no-repeat" : undefined,
        }}
      >
        {/* If overlay is JPG, use it as CSS background under frames */}
        {template.overlay && overlayIsBackground ? null : template.overlay ? (
          <img
            src={template.overlay}
            alt="Overlay"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain z-20"
          />
        ) : null}

        {template.frames.map((frame, idx) => {
          const src = captures[idx] ?? null;
          const isNext = highlightNextIndex === idx;
          const isFuture = highlightNextIndex !== null && idx > highlightNextIndex && !src;
          const justCaptured = src && highlightNextIndex !== null && idx === highlightNextIndex - 1;

          // Kiosk mode: stronger contrast for numbered placeholders
          const placeholderClasses = kioskMode
            ? "flex h-full w-full items-center justify-center bg-slate-800/80 text-slate-400"
            : "flex h-full w-full items-center justify-center bg-slate-100 text-slate-500";

          // Kiosk mode: disabled look for future frames
          const futureOverlay = kioskMode && isFuture ? (
            <div className="absolute inset-0 bg-slate-900/40 pointer-events-none" />
          ) : null;

          return (
            <div
              key={frame.id}
              className={`absolute overflow-hidden transition-all duration-300 ${noCard ? "" : "border border-white/60"}`}
              style={{
                left: `${frame.x * 100}%`,
                top: `${frame.y * 100}%`,
                width: `${frame.width * 100}%`,
                height: `${frame.height * 100}%`,
                borderRadius: `${frame.radius ?? layout.radius}px`,
                boxShadow: layout.shadow ? "0 10px 30px rgba(15,23,42,0.2)" : undefined,
                // Subtle scale-in animation for just-captured frames
                transform: justCaptured ? "scale(1)" : undefined,
                animation: justCaptured ? "kiosk-snap 0.3s ease-out" : undefined,
              }}
            >
              {src ? (
                <img 
                  src={src} 
                  alt={`Captured ${idx + 1}`} 
                  className="h-full w-full object-cover"
                  style={{
                    // Apply snap animation for newly captured
                    animation: justCaptured ? "kiosk-snap 0.3s ease-out" : undefined,
                  }}
                />
              ) : isNext && liveStream ? (
                <VideoInFrame stream={liveStream} />
              ) : (
                <div className={placeholderClasses}>
                  <span 
                    className={`font-extrabold select-none ${
                      kioskMode 
                        ? "text-5xl md:text-6xl lg:text-7xl text-slate-500/80" 
                        : "text-6xl md:text-7xl"
                    }`}
                  >
                    {idx + 1}
                  </span>
                </div>
              )}
              {futureOverlay}
              {isNext ? (
                <div 
                  className={`absolute inset-0 pointer-events-none ${
                    kioskMode 
                      ? "ring-4 ring-emerald-400/80 shadow-[inset_0_0_20px_rgba(52,211,153,0.2)]" 
                      : "ring-4 ring-emerald-400/60"
                  }`} 
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="grid w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{
        padding: `${layout.padding}px`,
        gap: `${layout.gap}px`,
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        background: layout.bg,
      }}
    >
      {captures.map((src, idx) => (
        <div
          key={idx}
          className={`overflow-hidden ${layout.shadow ? "shadow" : ""} bg-white`}
          style={{ borderRadius: `${layout.radius}px` }}
        >
          <img src={src} alt={`Captured ${idx + 1}`} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function VideoInFrame({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}


