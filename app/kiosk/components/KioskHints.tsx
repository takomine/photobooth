"use client";

import { useEffect, useState } from "react";

type HintState = 
  | "idle"           // Waiting for user to start
  | "camera-init"    // Camera is initializing
  | "ready"          // Ready to capture, waiting for button press
  | "countdown"      // Countdown active
  | "captured"       // Just captured, brief confirmation
  | "processing"     // All frames captured, processing
  | "complete";      // Session complete

type KioskHintsProps = {
  state: HintState;
  frameNumber?: number;
  totalFrames?: number;
  countdownValue?: number;
};

const hintMessages: Record<HintState, { primary: string; secondary?: string }> = {
  idle: {
    primary: "Tap the button to start",
    secondary: "Your photos will be ready in seconds",
  },
  "camera-init": {
    primary: "Starting camera...",
    secondary: "Please wait a moment",
  },
  ready: {
    primary: "Look at the camera",
    secondary: "Strike a pose and tap capture!",
  },
  countdown: {
    primary: "Get ready!",
    secondary: "Look at the camera",
  },
  captured: {
    primary: "Nice!",
  },
  processing: {
    primary: "Processing...",
    secondary: "Creating your photo",
  },
  complete: {
    primary: "All done!",
    secondary: "Scan the QR code to download",
  },
};

export function KioskHints({ state, frameNumber, totalFrames, countdownValue }: KioskHintsProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [displayState, setDisplayState] = useState<HintState>(state);

  // Handle captured state with brief display
  useEffect(() => {
    if (state === "captured") {
      setShowConfirmation(true);
      setDisplayState("captured");
      const timer = setTimeout(() => {
        setShowConfirmation(false);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setDisplayState(state);
    }
  }, [state]);

  // Don't show hints during countdown (the overlay handles that)
  if (displayState === "countdown") {
    return null;
  }

  const hint = hintMessages[displayState];
  if (!hint) return null;

  // Show captured confirmation
  if (displayState === "captured" && showConfirmation) {
    return (
      <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-emerald-300 text-lg font-semibold">{hint.primary}</p>
      </div>
    );
  }

  // Ready state with frame info
  if (displayState === "ready" && frameNumber !== undefined && totalFrames !== undefined) {
    return (
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-white/50 text-sm font-medium tracking-wide uppercase">
          Photo {frameNumber} of {totalFrames}
        </p>
        <p className="text-white/90 text-lg md:text-xl font-semibold">
          {hint.primary}
        </p>
        {hint.secondary && (
          <p className="text-white/50 text-sm">
            {hint.secondary}
          </p>
        )}
      </div>
    );
  }

  // Default hint display
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-white/90 text-lg md:text-xl font-semibold">
        {hint.primary}
      </p>
      {hint.secondary && (
        <p className="text-white/50 text-sm">
          {hint.secondary}
        </p>
      )}
    </div>
  );
}

/** Attract mode overlay for idle kiosk */
type KioskAttractOverlayProps = {
  visible: boolean;
  onTap: () => void;
};

export function KioskAttractOverlay({ visible, onTap }: KioskAttractOverlayProps) {
  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      onClick={onTap}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        {/* Animated camera icon */}
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-emerald-400/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/30">
            <svg className="w-16 h-16 md:w-20 md:h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Photo Booth
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-medium">
            Tap anywhere to start
          </p>
        </div>

        {/* Animated hint */}
        <div className="flex items-center gap-2 text-white/40 animate-bounce" style={{ animationDuration: "2s" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <span className="text-sm font-medium tracking-wide">Touch to begin</span>
        </div>
      </div>
    </div>
  );
}

