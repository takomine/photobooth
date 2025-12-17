"use client";

import { useEffect, useRef, useState } from "react";

type KioskCountdownOverlayProps = {
  value: number;
  getMediaStream?: () => MediaStream | null;
};

export function KioskCountdownOverlay({ value, getMediaStream }: KioskCountdownOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !getMediaStream) return;

    const attachStream = () => {
      const stream = getMediaStream();
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(() => { });
        setHasStream(true);
      }
    };

    attachStream();
    const interval = setInterval(attachStream, 500);
    return () => clearInterval(interval);
  }, [getMediaStream]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      {/* Live video preview - full screen background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {getMediaStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${hasStream ? "opacity-100" : "opacity-0"
              }`}
            style={{ transform: "scaleX(-1)" }} // Mirror for selfie view
          />
        ) : (
          <div className="w-full h-full bg-slate-800" />
        )}

        {/* Subtle vignette effect for focus */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)"
          }}
        />
      </div>

      {/* Countdown timer - positioned at top */}
      <div className="relative z-10 mt-8">
        {/* Outer pulse ring */}
        <div
          className="absolute inset-0 -m-4 rounded-full bg-emerald-400/30 animate-ping"
          style={{ animationDuration: "1s" }}
        />

        {/* Glow effect */}
        <div className="absolute inset-0 -m-8 rounded-full bg-emerald-400/20 blur-2xl" />

        {/* Number container */}
        <div
          className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-4 border-emerald-400/60 shadow-2xl"
          style={{
            boxShadow: "0 0 60px rgba(52, 211, 153, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span
            className="text-7xl md:text-8xl font-black text-emerald-300 drop-shadow-[0_0_30px_rgba(52,211,153,0.7)] select-none"
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              letterSpacing: "-0.05em",
            }}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Bottom instruction text */}
      <div className="relative z-10 mt-auto mb-16 text-center">
        <div className="px-8 py-4 rounded-2xl bg-slate-900/80 backdrop-blur-sm border border-white/10">
          <p className="text-white text-2xl md:text-3xl font-bold tracking-wide">
            Get ready!
          </p>
          <p className="text-emerald-300/80 text-base md:text-lg mt-1 font-medium">
            Look at the camera and smile 📸
          </p>
        </div>
      </div>

      {/* Frame indicator corners for visual guide */}
      <div className="absolute inset-16 md:inset-24 pointer-events-none">
        {/* Top-left corner */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400/60 rounded-tl-lg" />
        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400/60 rounded-tr-lg" />
        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400/60 rounded-bl-lg" />
        {/* Bottom-right corner */}
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400/60 rounded-br-lg" />
      </div>
    </div>
  );
}
