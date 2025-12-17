"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { RefreshCw, CheckCircle, Loader2, AlertCircle, Clock } from "lucide-react";
import { Template } from "../../hooks/useTemplates";

type KioskFinalProps = {
  template: Template;
  captures: string[];
  onStartOver: () => void;
  exportWidth: number;
  exportHeight: number;
  autoResetSeconds?: number;
};

type UploadState = "idle" | "rendering" | "uploading" | "success" | "error";

export function KioskFinal({
  template,
  captures,
  onStartOver,
  exportWidth,
  exportHeight,
  autoResetSeconds = 25,
}: KioskFinalProps) {
  const compositeRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetCountdown, setResetCountdown] = useState(autoResetSeconds);

  // Auto-reset countdown
  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = setInterval(() => {
      setResetCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCountdown]);

  // Auto-upload on mount
  useEffect(() => {
    const doUpload = async () => {
      if (!exportRef.current || uploadState !== "idle") return;

      try {
        setUploadState("rendering");

        // Render to PNG
        const dataUrl = await toPng(exportRef.current, {
          cacheBust: true,
          width: exportWidth,
          height: exportHeight,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
            opacity: "1",
          },
        });

        setUploadState("uploading");

        // Convert to blob
        const blob = await (await fetch(dataUrl)).blob();
        const form = new FormData();
        form.append("file", blob, "photobooth.png");

        // Upload
        const res = await fetch("/api/send-upload", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          throw new Error(`Upload failed (${res.status})`);
        }

        const payload = (await res.json()) as { url: string; ttlHours?: number };

        // Generate QR - larger size for better scanning
        const qr = await QRCode.toDataURL(payload.url, {
          width: 500,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        setShareLink(payload.url);
        setQrDataUrl(qr);
        setUploadState("success");
      } catch (err) {
        console.error("Upload failed:", err);
        setErrorMessage(err instanceof Error ? err.message : "Upload failed");
        setUploadState("error");
      }
    };

    // Small delay to ensure composite is rendered
    const timeout = setTimeout(doUpload, 300);
    return () => clearTimeout(timeout);
  }, [exportWidth, exportHeight, uploadState]);

  const handleRetry = () => {
    setUploadState("idle");
    setErrorMessage(null);
    setResetCountdown(autoResetSeconds);
  };

  const aspectRatio = `${template.canvasWidth}/${template.canvasHeight}`;

  // Helper to detect JPG overlay
  const isJpegOverlay = (ov?: string | null) => {
    if (!ov) return false;
    const lower = ov.toLowerCase();
    if (lower.includes(".jpg") || lower.includes(".jpeg")) return true;
    if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) return true;
    return false;
  };
  const overlay = template.overlay;
  const overlayIsBackground = isJpegOverlay(overlay);

  return (
    <div className="h-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 p-6 md:p-10">
      {/* Left: Composite preview */}
      <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
        {/* Visible preview (responsive) */}
        <div
          ref={compositeRef}
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{
            aspectRatio,
            background: template.bg ?? "#1e293b",
            maxWidth: `${exportWidth}px`,
            backgroundImage: overlayIsBackground && overlay ? `url(${overlay})` : undefined,
            backgroundSize: overlayIsBackground && overlay ? "cover" : undefined,
            backgroundPosition: overlayIsBackground && overlay ? "center" : undefined,
            backgroundRepeat: overlayIsBackground && overlay ? "no-repeat" : undefined,
          }}
        >
          {/* Overlay (PNG/transparent overlays rendered first, frames on top) */}
          {!overlayIsBackground && overlay ? (
            <img
              src={overlay}
              alt="Overlay"
              className="pointer-events-none absolute inset-0 w-full h-full object-contain"
            />
          ) : null}

          {/* Rendered frames */}
          {template.frames.map((frame, idx) => {
            const src = captures[idx] ?? null;
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
                  className="relative h-full w-full overflow-hidden"
                  style={{
                    borderRadius: `${frame.radius ?? 12}px`,
                  }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={`Capture ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Success badge */}
        {uploadState === "success" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Photo ready!</span>
          </div>
        )}
      </div>

      {/* Hidden export surface (fixed pixels) */}
      <div
        ref={exportRef}
        className="fixed left-0 top-0 opacity-[0.01] pointer-events-none -z-10 overflow-hidden"
        style={{
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
          background: template.bg ?? "#1e293b",
          backgroundImage: overlayIsBackground && overlay ? `url(${overlay})` : undefined,
          backgroundSize: overlayIsBackground && overlay ? "cover" : undefined,
          backgroundPosition: overlayIsBackground && overlay ? "center" : undefined,
          backgroundRepeat: overlayIsBackground && overlay ? "no-repeat" : undefined,
        }}
        aria-hidden="true"
      >
        {/* Overlay first, frames on top */}
        {!overlayIsBackground && overlay ? (
          <img
            src={overlay}
            alt="Overlay"
            className="pointer-events-none absolute inset-0 w-full h-full object-contain"
          />
        ) : null}

        {template.frames.map((frame, idx) => {
          const src = captures[idx] ?? null;
          return (
            <div
              key={`export-${frame.id}`}
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
                className="relative h-full w-full overflow-hidden"
                style={{
                  borderRadius: `${frame.radius ?? 12}px`,
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt={`Capture ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-700" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: QR and actions */}
      <div className="flex flex-col items-center gap-6">
        {/* QR code area */}
        <div className="relative">
          {uploadState === "idle" || uploadState === "rendering" || uploadState === "uploading" ? (
            <div className="w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl bg-slate-800/80 border border-white/10 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
              <p className="text-white/70 text-base md:text-lg font-medium">
                {uploadState === "rendering"
                  ? "Preparing image..."
                  : uploadState === "uploading"
                    ? "Uploading..."
                    : "Please wait..."}
              </p>
            </div>
          ) : uploadState === "error" ? (
            <div className="w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl bg-red-900/20 border border-red-500/30 flex flex-col items-center justify-center gap-6 p-8">
              <AlertCircle className="w-16 h-16 text-red-400" />
              <div className="text-center">
                <p className="text-red-300 text-lg font-semibold mb-1">
                  Upload Failed
                </p>
                <p className="text-red-400/70 text-sm">
                  {errorMessage || "Something went wrong"}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-200 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : qrDataUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* Large QR code with white background */}
              <div className="p-5 bg-white rounded-3xl shadow-2xl shadow-black/30">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80"
                />
              </div>

              {/* Instruction text */}
              <div className="text-center mt-2">
                <p className="text-white/90 text-lg md:text-xl font-semibold">
                  Scan to download your photo
                </p>
                <p className="text-white/50 text-sm mt-1 flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Link expires in 24 hours
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions row */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {/* Start over button */}
          <button
            onClick={onStartOver}
            className="group w-full flex items-center justify-center gap-3 px-8 py-4 md:px-10 md:py-5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-900/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-white font-bold text-lg md:text-xl tracking-wide">
              Take New Photos
            </span>
          </button>

          {/* Auto-reset countdown */}
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <span>Auto-reset in {resetCountdown}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
