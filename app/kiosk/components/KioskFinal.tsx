"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { RefreshCw, CheckCircle, Loader2, AlertCircle, Link2, Sparkles } from "lucide-react";
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
  autoResetSeconds = 60,
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
    if (resetCountdown <= 0) {
      onStartOver();
      return;
    }
    const timer = setInterval(() => {
      setResetCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCountdown, onStartOver]);

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
          width: 600,
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

  // Calculate timer progress for circular indicator
  const timerProgress = (resetCountdown / autoResetSeconds) * 100;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

        {/* Left: Photo Preview */}
        <div className="flex flex-col items-center">
          {/* Success header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Your Photo is Ready!
            </h1>
          </div>

          {/* Visible preview - LARGER */}
          <div
            ref={compositeRef}
            className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20"
            style={{
              aspectRatio,
              background: template.bg ?? "#1e293b",
              backgroundImage: overlayIsBackground && overlay ? `url(${overlay})` : undefined,
              backgroundSize: overlayIsBackground && overlay ? "cover" : undefined,
              backgroundPosition: overlayIsBackground && overlay ? "center" : undefined,
              backgroundRepeat: overlayIsBackground && overlay ? "no-repeat" : undefined,
            }}
          >
            {/* Decorative glow */}
            <div
              className="absolute -inset-1 rounded-3xl opacity-50 -z-10 blur-xl"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)" }}
            />

            {/* Overlay */}
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
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300 font-medium">Ready to download!</span>
            </div>
          )}
        </div>

        {/* Right: QR Code and Actions */}
        <div className="flex flex-col items-center gap-6">
          {/* QR code area */}
          <div className="relative">
            {uploadState === "idle" || uploadState === "rendering" || uploadState === "uploading" ? (
              <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl bg-slate-800/80 border border-white/10 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
                <p className="text-white/70 text-base md:text-lg font-medium">
                  {uploadState === "rendering"
                    ? "Creating your photo..."
                    : uploadState === "uploading"
                      ? "Uploading to cloud..."
                      : "Please wait..."}
                </p>
              </div>
            ) : uploadState === "error" ? (
              <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl bg-red-900/20 border border-red-500/30 flex flex-col items-center justify-center gap-6 p-8">
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
              <div className="flex flex-col items-center gap-5">
                {/* QR Code container with glow */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-[2rem] blur-xl" />
                  <div className="relative p-4 bg-white rounded-2xl shadow-2xl">
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-56 h-56 md:w-64 md:h-64"
                    />
                  </div>
                </div>

                {/* Scan instruction */}
                <div className="text-center">
                  <p className="text-white text-xl md:text-2xl font-bold">
                    Scan to Download
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    Link expires in 24 hours
                  </p>
                </div>

                {/* Share link display - beautiful card */}
                {shareLink && (
                  <div className="w-full max-w-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                        Download Link
                      </span>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/50 to-teal-500/50 rounded-xl blur opacity-30 group-hover:opacity-50 transition" />
                      <div className="relative px-4 py-3 bg-slate-800/90 rounded-xl border border-white/10">
                        <p className="text-emerald-300 text-sm md:text-base font-mono break-all leading-relaxed">
                          {shareLink}
                        </p>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs mt-2 text-center">
                      📷 Can't scan? Take a photo of this screen!
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Take New Photos button */}
          <button
            onClick={onStartOver}
            className="group w-full max-w-sm flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-900/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-white font-bold text-lg md:text-xl">
              Take New Photos
            </span>
          </button>

          {/* Prominent circular countdown timer */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Timer text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{resetCountdown}</span>
                <span className="text-xs text-white/50 uppercase tracking-wider">sec</span>
              </div>
            </div>
            <p className="text-white/40 text-sm">
              Auto-reset
            </p>
          </div>
        </div>
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
    </div>
  );
}
