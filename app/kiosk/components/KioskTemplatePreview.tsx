"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "../../hooks/useTemplates";

type KioskTemplatePreviewProps = {
  template: Template;
  captures: string[];
  getMediaStream: () => MediaStream | null;
  nextFrameIndex: number;
};

export function KioskTemplatePreview({
  template,
  captures,
  getMediaStream,
  nextFrameIndex,
}: KioskTemplatePreviewProps) {
  const aspectRatio = `${template.canvasWidth}/${template.canvasHeight}`;

  return (
    <div
      className="relative w-full h-full max-h-[75vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      style={{
        aspectRatio,
        background: template.bg ?? "#1e293b",
      }}
    >
      {/* Frame slots */}
      {template.frames.map((frame, idx) => {
        const hasCaptured = idx < captures.length;
        const isNext = idx === nextFrameIndex;
        const capturedSrc = captures[idx] ?? null;

        return (
          <div
            key={frame.id}
            className={`absolute overflow-hidden transition-all duration-300 ${
              isNext
                ? "ring-4 ring-emerald-400/80 ring-offset-2 ring-offset-transparent"
                : !hasCaptured
                ? "border-2 border-white/40"
                : ""
            }`}
            style={{
              left: `${frame.x * 100}%`,
              top: `${frame.y * 100}%`,
              width: `${frame.width * 100}%`,
              height: `${frame.height * 100}%`,
              borderRadius: `${frame.radius ?? 12}px`,
              boxShadow: hasCaptured ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            {hasCaptured && capturedSrc ? (
              /* Show captured image */
              <img
                src={capturedSrc}
                alt={`Capture ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Show live video + number indicator */
              <LiveFrameSlot
                frameIndex={idx}
                isNext={isNext}
                getMediaStream={getMediaStream}
              />
            )}
          </div>
        );
      })}

      {/* Template overlay (on top) */}
      {template.overlay && (
        <img
          src={template.overlay}
          alt="Overlay"
          className="pointer-events-none absolute inset-0 w-full h-full object-contain z-10"
        />
      )}
    </div>
  );
}

type LiveFrameSlotProps = {
  frameIndex: number;
  isNext: boolean;
  getMediaStream: () => MediaStream | null;
};

function LiveFrameSlot({ frameIndex, isNext, getMediaStream }: LiveFrameSlotProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attachStream = () => {
      const stream = getMediaStream();
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
        setHasStream(true);
      } else if (!stream) {
        setHasStream(false);
      }
    };

    // Initial attach
    attachStream();

    // Poll for stream (in case webcam starts later)
    const interval = setInterval(attachStream, 500);
    return () => clearInterval(interval);
  }, [getMediaStream]);

  return (
    <div className="relative w-full h-full bg-slate-800/90">
      {/* Live video feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          hasStream ? "opacity-100" : "opacity-0"
        }`}
        style={{ transform: "scaleX(-1)" }} // Mirror for selfie view
      />

      {/* Number overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isNext ? "bg-emerald-500/10" : "bg-slate-900/30"
        }`}
      >
        <span
          className={`font-black select-none transition-all duration-300 ${
            isNext
              ? "text-emerald-300 text-8xl md:text-9xl drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]"
              : "text-white/30 text-7xl md:text-8xl"
          }`}
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {frameIndex + 1}
        </span>
      </div>

      {/* Pulsing ring for next frame */}
      {isNext && (
        <div className="absolute inset-0 border-4 border-emerald-400/50 animate-pulse rounded-inherit pointer-events-none" />
      )}
    </div>
  );
}

