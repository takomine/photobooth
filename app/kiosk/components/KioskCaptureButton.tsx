"use client";

import { Camera } from "lucide-react";

type KioskCaptureButtonProps = {
  onCapture: () => void;
  disabled: boolean;
  framesRemaining: number;
  /** Whether auto-sequence has started (show different text) */
  isAutoSequencing?: boolean;
};

export function KioskCaptureButton({
  onCapture,
  disabled,
  framesRemaining,
  isAutoSequencing = false,
}: KioskCaptureButtonProps) {
  const allCaptured = framesRemaining <= 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onCapture}
        disabled={disabled}
        className={`
          group relative w-32 h-32 md:w-40 md:h-40 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-emerald-400/50
          ${
            disabled
              ? "bg-slate-800/60 cursor-not-allowed"
              : "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 hover:scale-105 hover:shadow-[0_0_80px_rgba(52,211,153,0.5)] active:scale-95"
          }
          shadow-2xl
        `}
        aria-label="Capture photo"
        style={{
          // Ensure large touch target
          minWidth: 128,
          minHeight: 128,
        }}
      >
        {/* Outer pulse ring - only when enabled and not yet started */}
        {!disabled && !isAutoSequencing && (
          <span 
            className="absolute inset-0 rounded-full border-4 border-emerald-300/40 animate-ping" 
            style={{ animationDuration: "2s" }}
          />
        )}
        
        {/* Subtle inner glow ring */}
        <span
          className={`
            absolute inset-3 rounded-full
            ${disabled ? "bg-slate-700/30" : "bg-white/10"}
            transition-all duration-300
          `}
        />

        {/* Camera icon */}
        <Camera
          className={`
            relative z-10 w-14 h-14 md:w-18 md:h-18
            transition-all duration-300
            ${disabled ? "text-slate-500" : "text-white drop-shadow-lg group-hover:scale-110"}
          `}
          strokeWidth={2}
          style={{ width: 56, height: 56 }}
        />

        {/* Success checkmark when all captured */}
        {allCaptured && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/90 rounded-full">
            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>

      {/* Helper text */}
      <p
        className={`
          text-base md:text-lg font-semibold tracking-wide uppercase
          transition-all duration-300 text-center
          ${disabled && !allCaptured ? "text-slate-500" : "text-white/80"}
        `}
      >
        {allCaptured
          ? "All captured!"
          : isAutoSequencing
            ? `Capturing... (${framesRemaining} left)`
            : `Tap to capture (${framesRemaining} left)`
        }
      </p>
    </div>
  );
}
