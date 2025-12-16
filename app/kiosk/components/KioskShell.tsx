"use client";

import { ReactNode } from "react";

type KioskShellProps = {
  children: ReactNode;
  /** Animated background particles effect */
  showParticles?: boolean;
};

export function KioskShell({ children, showParticles = true }: KioskShellProps) {
  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none kiosk-shell">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Subtle animated gradient orbs */}
      {showParticles && (
        <>
          <div 
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ 
              background: "radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)",
              animationDuration: "4s",
            }} 
          />
          <div 
            className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl animate-pulse"
            style={{ 
              background: "radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)",
              animationDuration: "6s",
              animationDelay: "2s",
            }} 
          />
          <div 
            className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl animate-pulse"
            style={{ 
              background: "radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)",
              animationDuration: "5s",
              animationDelay: "1s",
            }} 
          />
        </>
      )}

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

/** Progress dots showing capture state */
type KioskProgressDotsProps = {
  total: number;
  filled: number;
  className?: string;
};

export function KioskProgressDots({ total, filled, className = "" }: KioskProgressDotsProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {Array.from({ length: total }).map((_, idx) => {
        const isFilled = idx < filled;
        const isNext = idx === filled;
        return (
          <div
            key={idx}
            className={`
              relative w-3.5 h-3.5 rounded-full transition-all duration-500 ease-out
              ${isFilled 
                ? "bg-emerald-400 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.6)]" 
                : isNext 
                  ? "bg-white/90 scale-105 shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                  : "bg-white/20"
              }
            `}
          >
            {isNext && (
              <span className="absolute inset-0 rounded-full bg-white/50 animate-ping" style={{ animationDuration: "1.5s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Hint toast for guidance messages */
type KioskHintToastProps = {
  message: string;
  variant?: "default" | "success" | "warning";
  visible?: boolean;
};

export function KioskHintToast({ message, variant = "default", visible = true }: KioskHintToastProps) {
  if (!visible || !message) return null;

  const variantStyles = {
    default: "bg-white/10 border-white/20 text-white/90",
    success: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
    warning: "bg-amber-500/20 border-amber-400/30 text-amber-300",
  };

  return (
    <div 
      className={`
        inline-flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-xl border
        text-sm md:text-base font-medium tracking-wide
        transition-all duration-300 ease-out
        ${variantStyles[variant]}
        animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
    >
      {variant === "success" && (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {message}
    </div>
  );
}

