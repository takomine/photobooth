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
import { TemplateControls } from "./components/TemplateControls";
import { TemplateEditor } from "./components/TemplateEditor";
import { usePhotobooth } from "./hooks/usePhotobooth";
import { useTemplates } from "./hooks/useTemplates";
import { Settings, Camera, Layout, Download, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

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

  const [useTemplateMode, setUseTemplateMode] = useState(true);
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [exportPresetId, setExportPresetId] = useState(exportPresets[0].id);
  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(1800);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    exportTemplates,
    importTemplates,
  } = useTemplates();

  const exportPreset = useMemo(
    () => exportPresets.find((p) => p.id === exportPresetId) ?? exportPresets[0],
    [exportPresetId]
  );
  const useCustom = exportPresetId === "custom";
  const aspectRatio =
    useTemplateMode && activeTemplate
      ? activeTemplate.canvasWidth / activeTemplate.canvasHeight
      : 2 / 3;
  const resolvedExportWidth = useCustom ? customWidth : exportPreset.width;
  const resolvedExportHeight = useCustom
    ? customHeight
    : Math.round(exportPreset.width / aspectRatio);

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
          rotation: 0,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Photobooth Admin</h1>
              <p className="text-xs text-white/50">Template & Settings Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
              {captures.length} capture{captures.length !== 1 ? "s" : ""}
            </Badge>
            {captures.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetCaptures}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <a
              href="/kiosk"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm hover:from-emerald-400 hover:to-teal-500 transition-all"
            >
              Launch Kiosk →
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Left Column - Camera & Template Editor */}
          <div className="space-y-6">
            {/* Camera Section */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-base text-white">Camera Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CameraFeed
                  webcamRef={webcamRef}
                  webcamKey={webcamKey}
                  isStreaming={isStreaming}
                  controlsHidden={false}
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
              </CardContent>
            </Card>

            {/* Template Editor Section */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layout className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-base text-white">Template Editor</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={editingEnabled}
                        onChange={(e) => setEditingEnabled(e.target.checked)}
                        className="rounded border-white/30 bg-white/10"
                      />
                      Enable Editing
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Layout Preview & Download */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-base text-white">Output Preview</CardTitle>
                  </div>
                  <span className="text-xs text-white/50">
                    {resolvedExportWidth}×{resolvedExportHeight}px
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  ref={printRef}
                  className="print-area rounded-lg overflow-hidden"
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
                <DownloadPrint
                  printRef={printRef}
                  disabled={!captures.length}
                  exportWidth={resolvedExportWidth}
                  exportHeight={resolvedExportHeight}
                  exportLabel={exportPreset.label}
                  note=""
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Template Selection */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Templates</CardTitle>
                <CardDescription className="text-white/50">
                  Select or manage your photo templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateControls
                  templates={templates}
                  activeTemplateId={activeTemplateId}
                  onSelectTemplate={setActiveTemplateId}
                  onDuplicateTemplate={duplicateTemplate}
                  onDeleteTemplate={deleteTemplate}
                  onCreateBlank={handleCreateBlankTemplate}
                  onResetPresets={resetToPresets}
                  onUpdateActiveMeta={updateTemplateMeta}
                  onExportTemplates={exportTemplates}
                  onImportTemplates={importTemplates}
                  useTemplate={useTemplateMode}
                  onToggleUseTemplate={setUseTemplateMode}
                  editingEnabled={editingEnabled}
                  onToggleEditing={setEditingEnabled}
                  selectedFrameId={selectedFrameId}
                />
              </CardContent>
            </Card>

            {/* Export Settings */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Export Size</CardTitle>
                <CardDescription className="text-white/50">
                  Output dimensions for print/download
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  value={exportPreset.id}
                  onChange={(e) => setExportPresetId(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur"
                >
                  {exportPresets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                      {p.label}
                    </option>
                  ))}
                </select>

                {useCustom && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs text-white/50">Width (px)</span>
                      <Input
                        type="number"
                        min={200}
                        max={6000}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                        className="border-white/20 bg-white/10 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-white/50">Height (px)</span>
                      <Input
                        type="number"
                        min={200}
                        max={6000}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                        className="border-white/20 bg-white/10 text-white"
                      />
                    </label>
                  </div>
                )}

                <p className="text-xs text-white/40">
                  Final output: {resolvedExportWidth}×{resolvedExportHeight}px
                </p>
              </CardContent>
            </Card>

            {/* Advanced Settings (Collapsible) */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader
                className="pb-3 cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">Advanced Options</CardTitle>
                  {showAdvanced ? (
                    <ChevronUp className="h-5 w-5 text-white/50" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white/50" />
                  )}
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4 border-t border-white/10 pt-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={useTemplateMode}
                        onChange={(e) => setUseTemplateMode(e.target.checked)}
                        className="rounded border-white/30 bg-white/10"
                      />
                      Use Template Mode
                    </label>
                    <label className="flex items-center gap-3 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={removeGreen}
                        onChange={(e) => setRemoveGreen(e.target.checked)}
                        className="rounded border-white/30 bg-white/10"
                      />
                      Green Screen Removal
                    </label>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToPresets}
                      className="w-full border-white/20 text-white/70 hover:bg-white/10"
                    >
                      Reset Templates to Defaults
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
