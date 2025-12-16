"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CameraFeed } from "./components/CameraFeed";
import { CaptureGrid } from "./components/CaptureGrid";
import { DownloadPrint } from "./components/DownloadPrint";
import { LayoutControls } from "./components/LayoutControls";
import { TemplateControls } from "./components/TemplateControls";
import { TemplateEditor } from "./components/TemplateEditor";
import { usePhotobooth } from "./hooks/usePhotobooth";
import { useTemplates } from "./hooks/useTemplates";

const exportPresets = [
  { id: "2r", label: "2R (2.5×3.5 in)", width: 750, height: 1050 },
  { id: "3r", label: "3R (3.5×5 in)", width: 1050, height: 1500 },
  { id: "4r", label: "4R (4×6 in)", width: 1200, height: 1800 },
  { id: "5r", label: "5R (5×7 in)", width: 1500, height: 2100 },
  { id: "6r", label: "6R (6×8 in)", width: 1800, height: 2400 },
  { id: "custom", label: "Custom", width: 1200, height: 1800 },
];
const EXPORT_PRESET_KEY = "photobooth.exportPresetId";

export default function Home() {
  const {
    webcamRef,
    printRef,
    layout,
    updateLayout,
    captures,
    resetCaptures,
    stopLibrary,
    captureLibrary,
    isStreaming,
    error,
    resolution,
    trackInfo,
    logs,
    fallbackPath,
    constraintLabel,
    settingsInfo,
    webcamKey,
    removeGreen,
    setRemoveGreen,
  } = usePhotobooth();
  const [controlsHidden, setControlsHidden] = useState(false);
  const [useTemplateMode, setUseTemplateMode] = useState(true);
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [exportPresetId, setExportPresetId] = useState(exportPresets[0].id); // default 2R
  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(1800);

  const {
    templates,
    activeTemplate,
    activeTemplateId,
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
  } = useTemplates();

  const exportPreset = useMemo(
    () => exportPresets.find((p) => p.id === exportPresetId) ?? exportPresets[0],
    [exportPresetId]
  );
  const useCustom = exportPresetId === "custom";
  const aspectRatio =
    useTemplateMode && activeTemplate
      ? activeTemplate.canvasWidth / activeTemplate.canvasHeight
      : 2 / 3; // fallback 4x6 ratio
  const resolvedExportWidth = useCustom ? customWidth : exportPreset.width;
  const resolvedExportHeight = useCustom
    ? customHeight
    : Math.round(exportPreset.width / aspectRatio);
  const exportNote = useCustom
    ? "Custom size"
    : useTemplateMode && activeTemplate
    ? "Template aspect ratio applied; height adjusted"
    : "Preset aspect ratio applied";

  const handleCreateBlankTemplate = () =>
    createTemplate({
      name: "Custom template",
      canvasWidth: 1600,
      canvasHeight: 1000,
      bg: "#ffffff",
      overlay: null,
      frames: [
        {
          id: "frame-1",
          x: 0.08,
          y: 0.12,
          width: 0.4,
          height: 0.76,
          radius: 16,
        },
      ],
    });

  // Load export preset preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(EXPORT_PRESET_KEY);
    if (stored && exportPresets.find((p) => p.id === stored)) {
      setExportPresetId(stored);
    }
  }, []);

  // Persist export preset preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXPORT_PRESET_KEY, exportPresetId);
  }, [exportPresetId]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-100 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <Card className="no-print bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Photobooth Studio
              </p>
              <CardTitle className="text-3xl md:text-4xl">Simple, customizable capture</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Manual shutter, printable/downloadable layouts, fully adjustable grid.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <Badge variant="muted" className="px-3 py-1 text-[12px]">
                Shots: {captures.length}
              </Badge>
              <Badge variant="muted" className="px-3 py-1 text-[12px]">
                Layout: {layout.rows}x{layout.cols}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setControlsHidden((v) => !v)}
              >
                {controlsHidden ? "Show controls" : "Hide controls"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-4">
            <CameraFeed
              webcamRef={webcamRef}
              webcamKey={webcamKey}
              isStreaming={isStreaming}
              controlsHidden={controlsHidden}
              stopLibrary={stopLibrary}
              captureLibrary={captureLibrary}
              removeGreen={removeGreen}
              onToggleRemoveGreen={setRemoveGreen}
              error={error}
              resolution={resolution}
              trackInfo={trackInfo}
              logs={logs}
              fallbackPath={fallbackPath}
              constraintLabel={constraintLabel}
              settingsInfo={settingsInfo}
            />
            <Card className="no-print shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-foreground">
                <p className="text-muted-foreground">
                  Use the capture button to add frames to the layout.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetCaptures}
                  disabled={!captures.length}
                >
                  Clear shots
                </Button>
              </CardContent>
            </Card>
            <TemplateEditor
              template={activeTemplate}
              captures={captures}
              selectedFrameId={selectedFrameId}
              onSelectFrame={setSelectedFrameId}
              onUpdateFrame={updateFrame}
              onAddFrame={addFrame}
              onRemoveFrame={removeFrame}
              editingEnabled={editingEnabled}
            />
          </section>

          <section className="space-y-4">
            <TemplateControls
              templates={templates}
              activeTemplateId={activeTemplateId}
              onSelectTemplate={setActiveTemplateId}
              onDuplicateTemplate={duplicateTemplate}
              onDeleteTemplate={deleteTemplate}
              onCreateBlank={handleCreateBlankTemplate}
              onResetPresets={resetToPresets}
              onUpdateActiveMeta={updateTemplateMeta}
              useTemplate={useTemplateMode}
              onToggleUseTemplate={setUseTemplateMode}
              editingEnabled={editingEnabled}
              onToggleEditing={setEditingEnabled}
              selectedFrameId={selectedFrameId}
            />
            <LayoutControls layout={layout} updateLayout={updateLayout} />
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base">Output size</CardTitle>
                  <CardDescription>Print/download sizing presets</CardDescription>
                </div>
                <select
                  value={exportPreset.id}
                  onChange={(e) => {
                    setExportPresetId(e.target.value);
                  }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-inner"
                >
                  {exportPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {useCustom ? (
                  <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Width (px)
                      </span>
                      <Input
                        type="number"
                        min={200}
                        max={6000}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Height (px)
                      </span>
                      <Input
                        type="number"
                        min={200}
                        max={6000}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Exports to {resolvedExportWidth}×{resolvedExportHeight}px. {exportNote}
                </p>
                <DownloadPrint
                  printRef={printRef}
                  disabled={!captures.length}
                  exportWidth={resolvedExportWidth}
                  exportHeight={resolvedExportHeight}
                  exportLabel={exportPreset.label}
                  note={exportNote}
                />
              </CardContent>
            </Card>
          </section>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Layout preview</h2>
              <p className="text-sm text-slate-600">
                This area is used for download/print output.
              </p>
            </div>
            <span className="no-print rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              Printable & downloadable
            </span>
          </div>
          <div
            ref={printRef}
            className="print-area"
            style={{
              width: "100%",
              maxWidth: `${resolvedExportWidth}px`,
              aspectRatio: `${resolvedExportWidth}/${resolvedExportHeight}`,
            }}
          >
            <CaptureGrid
              captures={captures}
              layout={layout}
              template={activeTemplate}
              useTemplate={useTemplateMode}
            />
        </div>
        </section>
      </main>
    </div>
  );
}
