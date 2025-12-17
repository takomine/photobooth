"use client";

import { RefObject } from "react";
import Webcam from "react-webcam";
import { Camera, Square } from "lucide-react";

type CameraFeedProps = {
  webcamRef: RefObject<Webcam | null>;
  webcamKey: number;
  isStreaming: boolean;
  controlsHidden: boolean;
  stopLibrary: () => void;
  captureLibrary: () => Promise<string | null>;
  removeGreen: boolean;
  onToggleRemoveGreen: (v: boolean) => void;
  error?: string | null;
  resolution: { width: number; height: number } | null;
  trackInfo: { label: string; readyState: MediaStreamTrackState } | null;
  logs: { ts: string; level: "info" | "warn" | "error"; message: string }[];
  fallbackPath: string | null;
  constraintLabel: { label: string; detail: string } | null;
  settingsInfo: { width?: number; height?: number; frameRate?: number; deviceLabel?: string } | null;
};

export function CameraFeed({
  webcamRef,
  webcamKey,
  isStreaming,
  controlsHidden,
  stopLibrary,
  captureLibrary,
  removeGreen,
  onToggleRemoveGreen,
  error,
  resolution,
}: CameraFeedProps) {
  return (
    <div className="space-y-3">
      {/* Camera View */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900">
        <Webcam
          key={webcamKey}
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/png"
          className="block aspect-video w-full bg-slate-900 object-cover"
          videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
        />

        {/* Status overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-300">LIVE</span>
          </div>
          {resolution && (
            <span className="text-xs text-white/50 bg-black/30 px-2 py-1 rounded-full backdrop-blur">
              {resolution.width}×{resolution.height}
            </span>
          )}
        </div>

        {/* Controls */}
        {!controlsHidden && (
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur text-white/80 text-xs font-medium cursor-pointer hover:bg-white/20 transition">
                <input
                  type="checkbox"
                  className="rounded border-white/30 bg-white/10 text-emerald-500"
                  checked={removeGreen}
                  onChange={(e) => onToggleRemoveGreen(e.target.checked)}
                />
                Green screen
              </label>

              <button
                onClick={stopLibrary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur text-white font-medium text-sm transition"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>

              <button
                onClick={() => void captureLibrary()}
                disabled={!isStreaming}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
