"use client";

import { RefObject, useState } from "react";
import Webcam from "react-webcam";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  trackInfo,
  logs,
  fallbackPath,
  constraintLabel,
  settingsInfo,
}: CameraFeedProps) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden shadow-md">
        <CardContent className="p-0">
          <div className="relative">
            <Webcam
              key={webcamKey}
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/png"
              className="block aspect-video w-full bg-slate-900 object-cover"
              videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-linear-to-t from-black/60 via-black/30 to-transparent px-4 py-3 text-sm text-white">
              <Badge variant="default" className="bg-white/15 text-white backdrop-blur">
                Live preview
              </Badge>
              {constraintLabel ? (
                <Badge variant="muted" className="bg-white/10 text-white backdrop-blur">
                  {constraintLabel.label}
                </Badge>
              ) : null}
              {fallbackPath ? (
                <Badge variant="warning" className="bg-amber-200/30 text-white backdrop-blur">
                  {fallbackPath}
                </Badge>
              ) : null}
              <span className="ml-auto flex items-center gap-2 text-[12px]">
                <Badge variant="muted" className="bg-white/15 text-white backdrop-blur">
                  {resolution ? `${resolution.width}×${resolution.height}` : "Resolution n/a"}
                </Badge>
                <Badge variant="muted" className="bg-white/15 text-white backdrop-blur">
                  {trackInfo ? `Track: ${trackInfo.readyState}` : "Track n/a"}
                </Badge>
              </span>
            </div>
            {!controlsHidden ? (
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/90 p-3 shadow-lg backdrop-blur">
                <label className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-foreground"
                    checked={removeGreen}
                    onChange={(e) => onToggleRemoveGreen(e.target.checked)}
                  />
                  Green screen (remove bg)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopLibrary}
                  className="flex-1 min-w-[120px]"
                  aria-label="Stop camera"
                >
                  Stop
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void captureLibrary();
                  }}
                  disabled={!isStreaming}
                  className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-500"
                  aria-label="Capture frame"
                >
                  Capture
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      ) : null}
      <Card className="bg-card/90 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground">
            <Badge variant="muted">Diagnostics</Badge>
            {constraintLabel ? (
              <Badge variant="muted">Constraints: {constraintLabel.label}</Badge>
            ) : null}
            {fallbackPath ? (
              <Badge variant="warning">Fallback: {fallbackPath}</Badge>
            ) : (
              <Badge variant="muted">Fallback: primary</Badge>
            )}
            {settingsInfo ? (
              <Badge variant="success">
                {settingsInfo.width ?? "?"}×{settingsInfo.height ?? "?"} @ {settingsInfo.frameRate ?? "?"}fps
              </Badge>
            ) : (
              <Badge variant="muted">Resolution: n/a</Badge>
            )}
            {trackInfo ? (
              <Badge variant="muted">Track: {trackInfo.readyState}</Badge>
            ) : (
              <Badge variant="muted">Track: n/a</Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLogs((v) => !v)}
              className="ml-auto"
            >
              {showLogs ? "Hide logs" : "Show logs"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {showLogs ? (
            <div className="max-h-48 overflow-auto rounded border border-border bg-muted/60 p-2 text-[11px] text-foreground">
              {logs.length === 0 ? <div>No log entries yet.</div> : null}
              {logs
                .slice()
                .reverse()
                .map((log) => (
                  <div key={`${log.ts}-${log.message.slice(0, 12)}`}>
                    <span className="mr-1 text-muted-foreground">
                      {log.ts.split("T")[1]?.slice(0, 8)}
                    </span>
                    <span
                      className={
                        log.level === "error"
                          ? "text-red-600"
                          : log.level === "warn"
                          ? "text-amber-700"
                          : "text-foreground"
                      }
                    >
                      [{log.level}] {log.message}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <CardDescription className="text-xs text-muted-foreground">
              Toggle logs to inspect the capture pipeline and constraints.
            </CardDescription>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

