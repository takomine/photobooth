"use client";

type KioskCountdownOverlayProps = {
  value: number;
};

export function KioskCountdownOverlay({ value }: KioskCountdownOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      {/* Animated countdown number */}
      <div className="relative">
        {/* Outer pulse ring */}
        <div
          className="absolute inset-0 -m-8 rounded-full bg-emerald-400/20 animate-ping"
          style={{ animationDuration: "1s" }}
        />
        
        {/* Inner glow circle */}
        <div className="absolute inset-0 -m-12 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-500/10 blur-2xl" />

        {/* Number container */}
        <div
          className="relative flex items-center justify-center w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-4 border-emerald-400/50 shadow-2xl"
          style={{
            boxShadow: "0 0 100px rgba(52, 211, 153, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span
            className="text-9xl md:text-[12rem] font-black text-emerald-300 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)] animate-pulse select-none"
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              letterSpacing: "-0.05em",
              animationDuration: "0.5s",
            }}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-12 md:bottom-20 text-center">
        <p className="text-white/80 text-xl md:text-2xl font-semibold tracking-wide">
          Get ready!
        </p>
        <p className="text-white/50 text-sm md:text-base mt-1">
          Look at the camera
        </p>
      </div>
    </div>
  );
}

