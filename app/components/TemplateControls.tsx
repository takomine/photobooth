"use client";

import { useState } from "react";
import { Template } from "../hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TemplateControlsProps = {
  templates: Template[];
  activeTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onDuplicateTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateBlank: () => void;
  onResetPresets: () => void;
  onUpdateActiveMeta: (partial: Partial<Omit<Template, "id" | "frames">>) => void;
  useTemplate: boolean;
  onToggleUseTemplate: (v: boolean) => void;
  editingEnabled: boolean;
  onToggleEditing: (v: boolean) => void;
  selectedFrameId: string | null;
};

export function TemplateControls({
  templates,
  activeTemplateId,
  onSelectTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onCreateBlank,
  onResetPresets,
  onUpdateActiveMeta,
  useTemplate,
  onToggleUseTemplate,
  editingEnabled,
  onToggleEditing,
  selectedFrameId,
}: TemplateControlsProps) {
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;
  const [overlayInfo, setOverlayInfo] = useState<string | null>(null);

  const handleLocalOverlay = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setOverlayInfo(`${file.name} (${img.width}×${img.height})`);
        onUpdateActiveMeta({
          overlay: dataUrl,
          canvasWidth: img.width,
          canvasHeight: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Templates</CardTitle>
          <CardDescription>Freeform layouts with overlays and frames.</CardDescription>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-foreground"
            checked={useTemplate}
            onChange={(e) => onToggleUseTemplate(e.target.checked)}
          />
          Use template mode
        </label>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-col gap-2 text-sm">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Active template
            </span>
            <select
              value={activeTemplateId ?? ""}
              onChange={(e) => onSelectTemplate(e.target.value || null)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-inner"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button type="button" variant="outline" onClick={onCreateBlank} size="sm">
              New blank
            </Button>
            {activeTemplateId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDuplicateTemplate(activeTemplateId)}
                  size="sm"
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDeleteTemplate(activeTemplateId)}
                  size="sm"
                >
                  Delete
                </Button>
              </>
            ) : null}
            <Button type="button" variant="secondary" onClick={onResetPresets} size="sm">
              Reset presets
            </Button>
          </div>
        </div>

        {activeTemplate ? (
          <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Name</span>
              <Input
                type="text"
                value={activeTemplate.name}
                onChange={(e) => onUpdateActiveMeta({ name: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Background</span>
              <Input
                type="color"
                value={activeTemplate.bg ?? "#ffffff"}
                onChange={(e) => onUpdateActiveMeta({ bg: e.target.value })}
                className="h-10"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Overlay image URL</span>
              <Input
                type="url"
                value={activeTemplate.overlay ?? ""}
                onChange={(e) => onUpdateActiveMeta({ overlay: e.target.value })}
                placeholder="https://example.com/overlay.png"
              />
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <label className="relative inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(e) => handleLocalOverlay(e.target.files?.[0] ?? null)}
                  />
                  <span className="rounded border border-border bg-card px-3 py-1 font-semibold text-foreground shadow-sm hover:bg-muted">
                    Upload overlay (local)
                  </span>
                </label>
                <span>
                  {overlayInfo ? overlayInfo : "Uses image file; canvas resizes to its pixels."}
                </span>
              </div>
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-foreground">
          <div className="space-y-0.5">
            <p className="font-semibold">Editor mode</p>
            <p className="text-muted-foreground">
              Drag/resize frames directly on the canvas. Selected frame: {selectedFrameId ?? "none"}.
            </p>
          </div>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-foreground"
              checked={editingEnabled}
              onChange={(e) => onToggleEditing(e.target.checked)}
            />
            Editing
          </label>
        </div>
      </CardContent>
    </Card>
  );
}


