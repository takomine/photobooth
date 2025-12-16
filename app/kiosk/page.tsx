"use client";

import { useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { usePhotobooth } from "../hooks/usePhotobooth";
import { useTemplates } from "../hooks/useTemplates";
import { CaptureGrid } from "../components/CaptureGrid";
import { KioskShell, KioskProgressDots, KioskHintToast } from "./components/KioskShell";
import { KioskCaptureButton } from "./components/KioskCaptureButton";
import { KioskCountdownOverlay } from "./components/KioskCountdownOverlay";
import { KioskFinal } from "./components/KioskFinal";
import { KioskHints, KioskAttractOverlay } from "./components/KioskHints";
import { useIdleTimer } from "./hooks/useIdleTimer";

const KIOSK_TEMPLATE_KEY = "photobooth.kiosk.templateId";
const KIOSK_PRESET_KEY = "photobooth.kiosk.presetId";

const exportPresets = [
  { id: "2r", label: "2R (2.5×3.5 in)", width: 750, height: 1050 },
  { id: "3r", label: "3R (3.5×5 in)", width: 1050, height: 1500 },
  { id: "4r", label: "4R (4×6 in)", width: 1200, height: 1800 },
  { id: "5r", label: "5R (5×7 in)", width: 1500, height: 2100 },
  { id: "6r", label: "6R (6×8 in)", width: 1800, height: 2400 },
  { id: "custom", label: "Custom", width: 1200, height: 1800 },
];

type KioskScreen = "capture" | "final";
type HintState = "idle" | "camera-init" | "ready" | "countdown" | "captured" | "processing" | "complete";

// Idle/attract timeouts
const CAPTURE_IDLE_TIMEOUT = 45000; // 45s on capture screen
const FINAL_AUTO_RESET_TIMEOUT = 25000; // 25s on final screen

export default function KioskPage() {
  const {
    webcamRef,
    captures,
    resetCaptures,
    captureLibrary,
    isStreaming,
    layout,
  } = usePhotobooth();

  const { templates, activeTemplate, setActiveTemplateId } = useTemplates();

  const [screen, setScreen] = useState<KioskScreen>("capture");
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [adminMode, setAdminMode] = useState(false);
  const [exportPresetId, setExportPresetId] = useState("2r");
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [autoSequence, setAutoSequence] = useState(false);
  const [hintState, setHintState] = useState<HintState>("idle");
  const [showCapturedHint, setShowCapturedHint] = useState(false);
  const [showAttract, setShowAttract] = useState(true);

  // Load stored template ID and preset on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTemplate = localStorage.getItem(KIOSK_TEMPLATE_KEY);
    if (storedTemplate && templates.find((t) => t.id === storedTemplate)) {
      setActiveTemplateId(storedTemplate);
    }
    const storedPreset = localStorage.getItem(KIOSK_PRESET_KEY);
    if (storedPreset && exportPresets.find((p) => p.id === storedPreset)) {
      setExportPresetId(storedPreset);
    }
    // Check for admin mode in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      setAdminMode(true);
    }
  }, [templates, setActiveTemplateId]);

  // Get the active template for kiosk
  const kioskTemplate = activeTemplate;
  const totalFrames = kioskTemplate?.frames.length ?? 0;
  const capturedCount = captures.length;
  const allFramesFilled = capturedCount >= totalFrames && totalFrames > 0;

  // Compute export dimensions based on preset and template aspect ratio
  const exportPreset = exportPresets.find((p) => p.id === exportPresetId) ?? exportPresets[0];
  const templateAspectRatio = kioskTemplate
    ? kioskTemplate.canvasWidth / kioskTemplate.canvasHeight
    : 2 / 3;
  const resolvedExportWidth = exportPreset.width;
  const resolvedExportHeight = Math.round(resolvedExportWidth / templateAspectRatio);

  // Handle preset change (admin only)
  const handlePresetChange = (presetId: string) => {
    setExportPresetId(presetId);
    if (typeof window !== "undefined") {
      localStorage.setItem(KIOSK_PRESET_KEY, presetId);
    }
  };

  // Idle timer for capture screen - show attract overlay
  const handleCaptureIdle = useCallback(() => {
    if (screen === "capture" && !countdownActive && !autoSequence) {
      setShowAttract(true);
    }
  }, [screen, countdownActive, autoSequence]);

  const handleCaptureActive = useCallback(() => {
    // Activity detected
  }, []);

  const { activate: resetIdleTimer } = useIdleTimer({
    timeout: CAPTURE_IDLE_TIMEOUT,
    onIdle: handleCaptureIdle,
    onActive: handleCaptureActive,
    enabled: screen === "capture" && !showAttract,
  });

  // Auto-reset on final screen
  useEffect(() => {
    if (screen !== "final") return;
    const timer = setTimeout(() => {
      handleStartOver();
    }, FINAL_AUTO_RESET_TIMEOUT);
    return () => clearTimeout(timer);
  }, [screen]);

  // Auto-transition to final screen when all frames are filled
  useEffect(() => {
    if (allFramesFilled && screen === "capture") {
      setHintState("processing");
      const timeout = setTimeout(() => {
        setScreen("final");
        setHintState("complete");
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [allFramesFilled, screen]);

  // Update hint state based on current state
  useEffect(() => {
    if (showAttract) {
      setHintState("idle");
    } else if (!isStreaming) {
      setHintState("camera-init");
    } else if (countdownActive) {
      setHintState("countdown");
    } else if (showCapturedHint) {
      setHintState("captured");
    } else if (!autoSequence && capturedCount === 0) {
      setHintState("ready");
    } else if (autoSequence && !allFramesFilled) {
      setHintState("ready");
    }
  }, [showAttract, isStreaming, countdownActive, showCapturedHint, autoSequence, capturedCount, allFramesFilled]);

  // Handle countdown and capture
  const startCountdown = () => {
    if (!isStreaming || countdownActive || allFramesFilled) return;
    setCountdownActive(true);
    setCountdownValue(3);
  };

  useEffect(() => {
    if (!countdownActive) return;

    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue((v) => v - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished - capture!
      (async () => {
        try {
          await new Promise((r) => setTimeout(r, 120));
          await captureLibrary();
          // Show captured confirmation briefly
          setShowCapturedHint(true);
          setTimeout(() => setShowCapturedHint(false), 600);
        } catch (err) {
          console.error("kiosk capture failed", err);
        }
      })();
      setCountdownActive(false);
      setCountdownValue(3);
    }
  }, [countdownActive, countdownValue, captureLibrary]);

  // After a capture finishes, automatically start the next countdown until all frames are filled
  useEffect(() => {
    if (!autoSequence) return;
    if (countdownActive) return;
    if (allFramesFilled) return;
    if (!isStreaming) return;
    const timer = setTimeout(() => startCountdown(), 800);
    return () => clearTimeout(timer);
  }, [autoSequence, countdownActive, allFramesFilled, isStreaming, captures.length]);

  // Start over handler
  const handleStartOver = () => {
    resetCaptures();
    setScreen("capture");
    setAutoSequence(false);
    setShowAttract(true);
    setHintState("idle");
  };

  // Handle attract tap
  const handleAttractTap = () => {
    setShowAttract(false);
    resetIdleTimer();
    setHintState(isStreaming ? "ready" : "camera-init");
  };

  // Admin template selection
  const handleTemplateSelect = (templateId: string) => {
    setActiveTemplateId(templateId);
    if (typeof window !== "undefined") {
      localStorage.setItem(KIOSK_TEMPLATE_KEY, templateId);
    }
  };

  // Get MediaStream from webcam for live preview
  const getMediaStream = (): MediaStream | null => {
    const videoEl = (webcamRef.current as unknown as { video?: HTMLVideoElement })?.video ?? null;
    return (videoEl?.srcObject as MediaStream | null) ?? null;
  };

  // Keep liveStream in state for consumers (CaptureGrid)
  useEffect(() => {
    const tick = () => setLiveStream(getMediaStream());
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <KioskShell>
      {/* Admin overlay for template/size selection */}
      {adminMode && (
        <div className="absolute top-4 left-4 z-50 bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 max-w-xs">
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Admin Settings</h3>
          
          {/* Template selector */}
          <div className="mb-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Template</p>
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    t.id === kioskTemplate?.id
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Size selector */}
          <div className="mb-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Export Size</p>
            <select
              value={exportPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            >
              {exportPresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setAdminMode(false)}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-xs"
          >
            Close Admin
          </button>
        </div>
      )}

      {/* Offscreen webcam element */}
      <div
        className="pointer-events-none"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1280,
          height: 720,
          opacity: 0.01,
          zIndex: -1,
        }}
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/png"
          forceScreenshotSourceSize
          minScreenshotWidth={1280}
          minScreenshotHeight={720}
          videoConstraints={{
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          }}
          style={{ width: 1280, height: 720 }}
          mirrored
        />
      </div>

      {/* Attract/Idle overlay */}
      <KioskAttractOverlay 
        visible={showAttract && screen === "capture"} 
        onTap={handleAttractTap} 
      />

      {screen === "capture" && kioskTemplate && !showAttract && (
        <div className="h-full flex flex-col items-center justify-center p-6 md:p-10">
          {/* Guidance hints - top */}
          <div className="absolute top-8 left-0 right-0 flex justify-center z-30">
            <KioskHints 
              state={hintState} 
              frameNumber={capturedCount + 1}
              totalFrames={totalFrames}
            />
          </div>

          {/* Template preview area */}
          <div className="flex-1 w-full max-w-4xl flex items-center justify-center py-16">
            <CaptureGrid
              captures={captures}
              layout={layout}
              template={kioskTemplate}
              useTemplate
              liveStream={liveStream}
              highlightNextIndex={capturedCount}
              noCard
              kioskMode
            />
          </div>

          {/* Bottom controls area */}
          <div className="flex flex-col items-center gap-6">
            {/* Capture button */}
            <KioskCaptureButton
              onCapture={() => {
                setAutoSequence(true);
                startCountdown();
              }}
              disabled={!isStreaming || countdownActive || allFramesFilled}
              framesRemaining={totalFrames - capturedCount}
              isAutoSequencing={autoSequence && !allFramesFilled}
            />

            {/* Progress dots */}
            <KioskProgressDots 
              total={totalFrames} 
              filled={capturedCount} 
            />
          </div>
        </div>
      )}

      {screen === "final" && kioskTemplate && (
        <KioskFinal
          template={kioskTemplate}
          captures={captures}
          onStartOver={handleStartOver}
          exportWidth={resolvedExportWidth}
          exportHeight={resolvedExportHeight}
          autoResetSeconds={Math.round(FINAL_AUTO_RESET_TIMEOUT / 1000)}
        />
      )}

      {/* Countdown overlay */}
      {countdownActive && (
        <KioskCountdownOverlay value={countdownValue} />
      )}
    </KioskShell>
  );
}
