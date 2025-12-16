"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TemplateFrame = {
  id: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
  radius?: number;
  rotation?: number; // reserved for future use
};

export type Template = {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  bg?: string;
  overlay?: string | null;
  frames: TemplateFrame[];
};

type UseTemplatesReturn = {
  templates: Template[];
  activeTemplateId: string | null;
  activeTemplate: Template | null;
  selectedFrameId: string | null;
  setActiveTemplateId: (id: string | null) => void;
  createTemplate: (template: Omit<Template, "id">) => string;
  duplicateTemplate: (id: string) => string | null;
  deleteTemplate: (id: string) => void;
  updateTemplateMeta: (partial: Partial<Omit<Template, "id" | "frames">>) => void;
  updateFrame: (frameId: string, partial: Partial<TemplateFrame>) => void;
  addFrame: (frame?: Partial<TemplateFrame>) => void;
  removeFrame: (frameId: string) => void;
  setSelectedFrameId: (id: string | null) => void;
  resetToPresets: () => void;
};

const STORAGE_KEY = "photobooth.templates.v1";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const presetTemplates: Template[] = [
  {
    id: "preset-grid-2x2",
    name: "Grid 2×2",
    canvasWidth: 1200,
    canvasHeight: 1200,
    bg: "#ffffff",
    frames: [
      { id: "f1", x: 0.05, y: 0.05, width: 0.45, height: 0.45, radius: 12 },
      { id: "f2", x: 0.5, y: 0.05, width: 0.45, height: 0.45, radius: 12 },
      { id: "f3", x: 0.05, y: 0.5, width: 0.45, height: 0.45, radius: 12 },
      { id: "f4", x: 0.5, y: 0.5, width: 0.45, height: 0.45, radius: 12 },
    ],
  },
  {
    id: "preset-strip-3",
    name: "Strip 3",
    canvasWidth: 800,
    canvasHeight: 1600,
    bg: "#f8fafc",
    frames: [
      { id: "s1", x: 0.08, y: 0.05, width: 0.84, height: 0.28, radius: 16 },
      { id: "s2", x: 0.08, y: 0.36, width: 0.84, height: 0.28, radius: 16 },
      { id: "s3", x: 0.08, y: 0.67, width: 0.84, height: 0.28, radius: 16 },
    ],
  },
  {
    id: "preset-postcard",
    name: "Postcard 2",
    canvasWidth: 1600,
    canvasHeight: 1000,
    bg: "#ffffff",
    frames: [
      { id: "p1", x: 0.06, y: 0.1, width: 0.42, height: 0.8, radius: 18 },
      { id: "p2", x: 0.52, y: 0.1, width: 0.42, height: 0.8, radius: 18 },
    ],
  },
];

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>(presetTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(presetTemplates[0].id);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // Load from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { templates: Template[]; activeTemplateId: string | null };
        if (parsed.templates?.length) {
          setTemplates(parsed.templates);
          setActiveTemplateId(parsed.activeTemplateId ?? parsed.templates[0]?.id ?? null);
        }
      }
    } catch (err) {
      console.warn("Failed to load templates", err);
    }
  }, []);

  // Persist to storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ templates, activeTemplateId });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [templates, activeTemplateId]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  const createTemplate = useCallback(
    (template: Omit<Template, "id">) => {
      const id = uuid();
      const withId: Template = { ...template, id };
      setTemplates((prev) => [...prev, withId]);
      setActiveTemplateId(id);
      return id;
    },
    []
  );

  const duplicateTemplate = useCallback(
    (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (!tpl) return null;
      const cloneId = uuid();
      const clone: Template = {
        ...tpl,
        id: cloneId,
        name: `${tpl.name} (copy)`,
        frames: tpl.frames.map((f) => ({ ...f, id: uuid() })),
      };
      setTemplates((prev) => [...prev, clone]);
      setActiveTemplateId(cloneId);
      return cloneId;
    },
    [templates]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setSelectedFrameId((prev) => (prev ? null : prev));
      setActiveTemplateId((prev) => {
        if (prev === id) {
          const remaining = templates.filter((t) => t.id !== id);
          return remaining[0]?.id ?? null;
        }
        return prev;
      });
    },
    [templates]
  );

  const updateTemplateMeta = useCallback(
    (partial: Partial<Omit<Template, "id" | "frames">>) => {
      if (!activeTemplateId) return;
      setTemplates((prev) =>
        prev.map((t) => (t.id === activeTemplateId ? { ...t, ...partial } : t))
      );
    },
    [activeTemplateId]
  );

  const updateFrame = useCallback(
    (frameId: string, partial: Partial<TemplateFrame>) => {
      if (!activeTemplateId) return;
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === activeTemplateId
            ? {
                ...tpl,
                frames: tpl.frames.map((f) => (f.id === frameId ? { ...f, ...partial } : f)),
              }
            : tpl
        )
      );
    },
    [activeTemplateId]
  );

  const addFrame = useCallback(
    (frame?: Partial<TemplateFrame>) => {
      if (!activeTemplateId) return;
      const base: TemplateFrame = {
        id: uuid(),
        x: 0.1,
        y: 0.1,
        width: 0.3,
        height: 0.3,
        radius: 12,
        ...frame,
      };
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === activeTemplateId ? { ...tpl, frames: [...tpl.frames, base] } : tpl
        )
      );
      setSelectedFrameId(base.id);
    },
    [activeTemplateId]
  );

  const removeFrame = useCallback(
    (frameId: string) => {
      if (!activeTemplateId) return;
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === activeTemplateId
            ? { ...tpl, frames: tpl.frames.filter((f) => f.id !== frameId) }
            : tpl
        )
      );
      setSelectedFrameId((prev) => (prev === frameId ? null : prev));
    },
    [activeTemplateId]
  );

  const resetToPresets = useCallback(() => {
    setTemplates(presetTemplates);
    setActiveTemplateId(presetTemplates[0].id);
    setSelectedFrameId(null);
  }, []);

  return {
    templates,
    activeTemplateId,
    activeTemplate,
    selectedFrameId,
    setActiveTemplateId,
    createTemplate,
    duplicateTemplate,
    deleteTemplate,
    updateTemplateMeta,
    updateFrame,
    addFrame,
    removeFrame,
    setSelectedFrameId,
    resetToPresets,
  };
}


