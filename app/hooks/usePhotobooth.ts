"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type Webcam from "react-webcam";

export type LayoutConfig = {
  rows: number;
  cols: number;
  gap: number;
  padding: number;
  bg: string;
  radius: number;
  shadow: boolean;
};

export type VideoDevice = {
  deviceId: string;
  label: string;
};

type Resolution = { width: number; height: number };
type TrackInfo = { label: string; readyState: MediaStreamTrackState };
type LogEntry = { ts: string; level: "info" | "warn" | "error"; message: string };
type ConstraintLabel = {
  label: string;
  detail: string;
};
type SettingsInfo = {
  width?: number;
  height?: number;
  frameRate?: number;
  deviceLabel?: string;
};

type UsePhotoboothReturn = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webcamRef: React.RefObject<Webcam | null>;
  printRef: React.RefObject<HTMLDivElement | null>;
  layout: LayoutConfig;
  updateLayout: (partial: Partial<LayoutConfig>) => void;
  captures: string[];
  capture: () => string | null;
  resetCaptures: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  stopLibrary: () => void;
  captureLibrary: () => Promise<string | null>;
  isStreaming: boolean;
  error: string | null;
  devices: VideoDevice[];
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  refreshDevices: () => Promise<void>;
  resolution: Resolution | null;
  isEnumerating: boolean;
  trackInfo: TrackInfo | null;
  forceLowRes: boolean;
  setForceLowRes: (v: boolean) => void;
  ignoreDeviceId: boolean;
  setIgnoreDeviceId: (v: boolean) => void;
  simpleConstraints: boolean;
  setSimpleConstraints: (v: boolean) => void;
  logs: LogEntry[];
  fallbackPath: string | null;
  constraintLabel: ConstraintLabel | null;
  settingsInfo: SettingsInfo | null;
  runBasicTest: () => Promise<void>;
  startCameraSafe: () => Promise<void>;
  useLibrary: boolean;
  setUseLibrary: (v: boolean) => void;
  webcamKey: number;
  removeGreen: boolean;
  setRemoveGreen: (v: boolean) => void;
};

export function usePhotobooth(): UsePhotoboothReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [isEnumerating, setIsEnumerating] = useState(false);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [forceLowRes, setForceLowRes] = useState(false);
  const [ignoreDeviceId, setIgnoreDeviceId] = useState(false);
  const [simpleConstraints, setSimpleConstraints] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fallbackPath, setFallbackPath] = useState<string | null>(null);
  const [constraintLabel, setConstraintLabel] = useState<ConstraintLabel | null>(null);
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null);
  const safeRetryRef = useRef(false);
  const [useLibrary, setUseLibrary] = useState(true);
  const stopRequestedRef = useRef(false);
  const [webcamKey, setWebcamKey] = useState(0);
  const [layout, setLayout] = useState<LayoutConfig>({
    rows: 2,
    cols: 2,
    gap: 10,
    padding: 16,
    bg: "#ffffff",
    radius: 12,
    shadow: true,
  });
  const [removeGreen, setRemoveGreen] = useState(false);

  const cleanupStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsStreaming(false);
    setResolution(null);
    setTrackInfo(null);
    setSettingsInfo(null);
  }, [stream]);

  const pushLog = useCallback((level: "info" | "warn" | "error", message: string) => {
    const entry: LogEntry = { ts: new Date().toISOString(), level, message };
    console[level](`[photobooth] ${message}`);
    setLogs((prev) => [...prev.slice(-19), entry]);
  }, []);

  const getLibraryTrack = useCallback(() => {
    const videoEl = (webcamRef.current as unknown as { video?: HTMLVideoElement })?.video ?? null;
    const mediaStream = (videoEl?.srcObject as MediaStream | null | undefined) ?? null;
    const track = mediaStream?.getVideoTracks?.()[0] ?? null;
    return { videoEl, stream: mediaStream, track };
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      setIsEnumerating(true);
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all
        .filter((d) => d.kind === "videoinput")
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
        }));
      setDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } finally {
      setIsEnumerating(false);
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      setError("Camera is only available in the browser.");
      return;
    }

    try {
      cleanupStream();
      setFallbackPath(null);
      setConstraintLabel(null);
      pushLog(
        "info",
        `startCamera flags: simple=${simpleConstraints}, forceLowRes=${forceLowRes}, ignoreDeviceId=${ignoreDeviceId}, selected=${selectedDeviceId ?? "none"}`
      );
      const buildConstraints = (
        fallbackLowRes: boolean,
        skipDeviceId = false
      ): MediaStreamConstraints => {
        if (simpleConstraints) {
          return {
            video: true,
            audio: false,
          };
        }
        const useLowRes = forceLowRes || fallbackLowRes;
        const useSkipDevice = ignoreDeviceId || skipDeviceId;
        const label = useLowRes ? "low-res" : "hi-res";
        const deviceLabel = useSkipDevice ? "no-deviceId" : "with-deviceId";
        setConstraintLabel({
          label: `${label} ${deviceLabel}`,
          detail: JSON.stringify({
            useLowRes,
            useSkipDevice,
            selectedDeviceId,
          }),
        });
        return {
          video: {
            deviceId:
              !useSkipDevice && selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: useLowRes ? { ideal: 640, max: 640 } : { ideal: 1280 },
            height: useLowRes ? { ideal: 480, max: 480 } : { ideal: 720 },
            frameRate: useLowRes ? { ideal: 24, max: 30 } : { ideal: 30, max: 30 },
          },
          audio: false,
        };
      };

      const tryGet = async (fallbackLowRes: boolean, skipDeviceId = false, tag = "") => {
        const constraints = buildConstraints(fallbackLowRes, skipDeviceId);
        pushLog(
          "info",
          `getUserMedia attempt (${tag || "primary"}) fallbackLowRes=${fallbackLowRes} skipDeviceId=${skipDeviceId}`
        );
        return navigator.mediaDevices.getUserMedia(constraints);
      };

      const getStreamWithFallback = async (): Promise<MediaStream> => {
        try {
          setFallbackPath("hi-res deviceId");
          return await tryGet(false, false, "hi-res device");
        } catch (primaryErr) {
          const primaryMessage =
            primaryErr instanceof Error ? primaryErr.message : "primary failure";
          console.warn("Primary constraints failed, retrying low-res", primaryMessage);
          try {
            setFallbackPath("low-res deviceId");
            return await tryGet(true, false, "low-res device");
          } catch (secondErr) {
            console.warn("Low-res with device failed, trying without deviceId", secondErr);
            try {
              setFallbackPath("hi-res no-deviceId");
              return await tryGet(false, true, "hi-res no-device");
            } catch (thirdErr) {
              console.warn("No deviceId high-res failed, trying low-res only", thirdErr);
              setFallbackPath("low-res no-deviceId");
              return await tryGet(true, true, "low-res no-device");
            }
          }
        }
      };

      const media = await getStreamWithFallback();
      setStream(media);
      setError(null);
      pushLog("info", `getUserMedia success via ${fallbackPath ?? "primary"}`);

      media.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setIsStreaming(false);
          setError("Camera stopped");
          pushLog("warn", "track ended");
        };
        track.onmute = () => {
          setError("Camera muted");
          pushLog("warn", "track muted");
        };
        track.onunmute = () => {
          setError(null);
          pushLog("info", "track unmuted");
        };
        setTrackInfo({
          label: track.label || "Unknown camera",
          readyState: track.readyState,
        });
        const settings = track.getSettings();
        setSettingsInfo({
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          deviceLabel: track.label,
        });
      });

      const video = videoRef.current;
      if (video) {
        video.srcObject = media;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            const track = media.getVideoTracks()[0];
            const settings = track?.getSettings();
            setResolution({
              width: settings?.width || video.videoWidth || 0,
              height: settings?.height || video.videoHeight || 0,
            });
            if (track) {
              setTrackInfo({
                label: track.label || "Unknown camera",
                readyState: track.readyState,
              });
              setSettingsInfo((prev) => ({
                ...prev,
                width: settings?.width ?? prev?.width,
                height: settings?.height ?? prev?.height,
                frameRate: settings?.frameRate ?? prev?.frameRate,
                deviceLabel: track.label || prev?.deviceLabel,
              }));
            }
            setIsStreaming(true);
            await refreshDevices();
            pushLog(
              "info",
              `video playing w=${settings?.width || video.videoWidth} h=${
                settings?.height || video.videoHeight
              } fps=${settings?.frameRate ?? "n/a"} track=${track?.readyState ?? "n/a"}`
            );
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unable to play camera";
            setError(message);
            setIsStreaming(false);
            pushLog("error", `video play failed: ${message}`);
          }
        };
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start camera";
      setError(message);
      setIsStreaming(false);
      pushLog("error", `startCamera failed: ${message}`);
    }
  }, [
    cleanupStream,
    forceLowRes,
    ignoreDeviceId,
    selectedDeviceId,
    simpleConstraints,
    pushLog,
    refreshDevices,
    fallbackPath,
  ]);

  const startCameraSafe = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      setError("Camera is only available in the browser.");
      return;
    }

    safeRetryRef.current = false;

    const bindStream = async (
      media: MediaStream,
      allowRetryLow: boolean,
      pathLabel: string,
      constraintLabelValue: ConstraintLabel
    ) => {
      setStream(media);
      setError(null);
      setFallbackPath(pathLabel);
      setConstraintLabel(constraintLabelValue);

      media.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (allowRetryLow && !safeRetryRef.current) {
            safeRetryRef.current = true;
            pushLog("warn", "track ended; retrying safe low (320x240@15)");
            cleanupStream();
            (async () => {
              try {
                const lowMedia = await navigator.mediaDevices.getUserMedia({
                  video: {
                    width: { ideal: 320, max: 320 },
                    height: { ideal: 240, max: 240 },
                    frameRate: { ideal: 15, max: 15 },
                  },
                  audio: false,
                });
                await bindStream(lowMedia, false, "safe:320x240@15", {
                  label: "safe low",
                  detail: "320x240@15 no deviceId",
                });
              } catch (err) {
                const msg = err instanceof Error ? err.message : "safe low failed";
                setError(msg);
                pushLog("error", `safe low retry failed: ${msg}`);
              }
            })();
            return;
          }
          setIsStreaming(false);
          setError("Camera stopped");
          pushLog("warn", "track ended");
        };
        track.onmute = () => {
          setError("Camera muted");
          pushLog("warn", "track muted");
        };
        track.onunmute = () => {
          setError(null);
          pushLog("info", "track unmuted");
        };
        setTrackInfo({
          label: track.label || "Unknown camera",
          readyState: track.readyState,
        });
        const settings = track.getSettings();
        setSettingsInfo({
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          deviceLabel: track.label,
        });
      });

      const video = videoRef.current;
      if (video) {
        video.srcObject = media;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            const track = media.getVideoTracks()[0];
            const settings = track?.getSettings();
            setResolution({
              width: settings?.width || video.videoWidth || 0,
              height: settings?.height || video.videoHeight || 0,
            });
            if (track) {
              setTrackInfo({
                label: track.label || "Unknown camera",
                readyState: track.readyState,
              });
              setSettingsInfo((prev) => ({
                ...prev,
                width: settings?.width ?? prev?.width,
                height: settings?.height ?? prev?.height,
                frameRate: settings?.frameRate ?? prev?.frameRate,
                deviceLabel: track.label || prev?.deviceLabel,
              }));
            }
            setIsStreaming(true);
            await refreshDevices();
            pushLog(
              "info",
              `video playing w=${settings?.width || video.videoWidth} h=${
                settings?.height || video.videoHeight
              } fps=${settings?.frameRate ?? "n/a"} track=${track?.readyState ?? "n/a"}`
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to play camera";
            setError(message);
            setIsStreaming(false);
            pushLog("error", `video play failed: ${message}`);
          }
        };
      }
    };

    try {
      cleanupStream();
      pushLog("info", "startCameraSafe: video:true");
      setFallbackPath("safe:video:true");
      setConstraintLabel({ label: "safe video:true", detail: "video:true" });
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      await bindStream(media, true, "safe:video:true", {
        label: "safe video:true",
        detail: "video:true",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start camera (safe)";
      setError(message);
      setIsStreaming(false);
      pushLog("error", `startCameraSafe failed: ${message}`);
    }
  }, [cleanupStream, pushLog, refreshDevices]);

  const startLibrary = useCallback(() => {
    stopRequestedRef.current = false;
    setUseLibrary(true);
    setError(null);
    setFallbackPath("react-webcam");
    setConstraintLabel({ label: "react-webcam", detail: "library video" });
    setIsStreaming(false);
    setWebcamKey((k) => k + 1);
    pushLog("info", "startLibrary: react-webcam (auto)");
  }, [pushLog]);

  const stopLibrary = useCallback(() => {
    stopRequestedRef.current = true;
    const { stream, videoEl } = getLibraryTrack();
    stream?.getTracks?.().forEach((t) => t.stop());
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setIsStreaming(false);
    setTrackInfo(null);
    setSettingsInfo(null);
    setResolution(null);
    pushLog("info", "stopLibrary called");
  }, [getLibraryTrack, pushLog]);

  const chromaKey = useCallback(
    (dataUrl: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imageData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            if (g > 80 && g > r + 30 && g > b + 30) {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
      }),
    []
  );

  const captureLibrary = useCallback(async () => {
    const shot = webcamRef.current?.getScreenshot?.();
    if (!shot) {
      setError("Camera not ready");
      return null;
    }
    try {
      const processed = removeGreen ? await chromaKey(shot) : shot;
      setCaptures((prev) => [...prev, processed]);
      pushLog("info", removeGreen ? "capture via react-webcam (chroma keyed)" : "capture via react-webcam");
      return processed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "chroma key failed";
      setError(msg);
      pushLog("error", `capture processing failed: ${msg}`);
      return null;
    }
  }, [chromaKey, pushLog, removeGreen]);

  const stopCamera = useCallback(() => {
    cleanupStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    pushLog("info", "stopCamera called; stream cleaned");
  }, [cleanupStream, pushLog]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setError("Camera not ready");
      return null;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Capture not supported in this browser");
      return null;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const data = canvas.toDataURL("image/png");
    setCaptures((prev) => [...prev, data]);
    return data;
  }, []);

  const resetCaptures = useCallback(() => {
    setCaptures([]);
  }, []);

  const updateLayout = useCallback((partial: Partial<LayoutConfig>) => {
    setLayout((prev) => ({ ...prev, ...partial }));
  }, []);

  const runBasicTest = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return;
    pushLog("info", "basic test start (video:true)");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const track = media.getVideoTracks()[0];
      const settings = track?.getSettings();
      pushLog(
        "info",
        `basic test success w=${settings?.width ?? "n/a"} h=${settings?.height ?? "n/a"} fps=${
          settings?.frameRate ?? "n/a"
        } state=${track?.readyState ?? "n/a"}`
      );
      track?.stop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "basic test failed";
      pushLog("error", `basic test error: ${msg}`);
    }
  }, [pushLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    startLibrary();
  }, [startLibrary]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const id = window.setInterval(() => {
      const { track } = getLibraryTrack();
      if (!track) {
        setTrackInfo(null);
        setResolution(null);
        setIsStreaming(false);
        return;
      }
      const settings = track.getSettings();
      setTrackInfo({ label: track.label || "Camera", readyState: track.readyState });
      setSettingsInfo({
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        deviceLabel: track.label,
      });
      if (settings.width && settings.height) {
        setResolution({ width: settings.width, height: settings.height });
      }
      setIsStreaming(track.readyState === "live");
      if (track.readyState === "ended" && !stopRequestedRef.current) {
        pushLog("warn", "react-webcam track ended; retrying");
        setIsStreaming(false);
        startLibrary();
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [getLibraryTrack, pushLog, startLibrary]);

  return {
    videoRef,
    webcamRef,
    printRef,
    layout,
    updateLayout,
    captures,
    capture,
    resetCaptures,
    startCamera,
    stopCamera,
    stopLibrary,
    captureLibrary,
    isStreaming,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    refreshDevices,
    resolution,
    isEnumerating,
    trackInfo,
    forceLowRes,
    setForceLowRes,
    ignoreDeviceId,
    setIgnoreDeviceId,
    simpleConstraints,
    setSimpleConstraints,
    logs,
    fallbackPath,
    constraintLabel,
    settingsInfo,
    runBasicTest,
    startCameraSafe,
    useLibrary,
    setUseLibrary,
    webcamKey,
    removeGreen,
    setRemoveGreen,
  };
}

