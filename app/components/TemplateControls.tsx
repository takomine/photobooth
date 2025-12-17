"use client";

import { useState, useRef } from "react";
import { Template } from "../hooks/useTemplates";
import { Copy, Trash2, Plus, RotateCcw, Upload, Download, FolderUp } from "lucide-react";

type TemplateControlsProps = {
  templates: Template[];
  activeTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onDuplicateTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateBlank: () => void;
  onResetPresets: () => void;
  onUpdateActiveMeta: (partial: Partial<Omit<Template, "id" | "frames">>) => void;
  onExportTemplates: () => void;
  onImportTemplates: (file: File) => Promise<void>;
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
  onExportTemplates,
  onImportTemplates,
}: TemplateControlsProps) {
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;
  const [overlayInfo, setOverlayInfo] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImportStatus("Importing...");
    try {
      await onImportTemplates(file);
      setImportStatus("Imported successfully!");
      setTimeout(() => setImportStatus(null), 2000);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import failed");
    }
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Active Template
        </label>
        <select
          value={activeTemplateId ?? ""}
          onChange={(e) => onSelectTemplate(e.target.value || null)}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id} className="bg-slate-800 text-white">
              {tpl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onCreateBlank}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        {activeTemplateId && (
          <>
            <button
              onClick={() => onDuplicateTemplate(activeTemplateId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            <button
              onClick={() => onDeleteTemplate(activeTemplateId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </>
        )}
        <button
          onClick={onResetPresets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Import/Export Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        <button
          onClick={onExportTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          Export All
        </button>
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition cursor-pointer">
          <FolderUp className="w-3.5 h-3.5" />
          Import
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {importStatus && (
          <span className={`text-xs py-1.5 ${importStatus.includes("success") ? "text-emerald-300" : "text-amber-300"}`}>
            {importStatus}
          </span>
        )}
      </div>

      {/* Template Settings */}
      {activeTemplate && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={activeTemplate.name}
              onChange={(e) => onUpdateActiveMeta({ name: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Background Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Background Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeTemplate.bg ?? "#ffffff"}
                onChange={(e) => onUpdateActiveMeta({ bg: e.target.value })}
                className="h-10 w-16 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
              />
              <span className="text-sm text-white/60 font-mono">
                {activeTemplate.bg ?? "#ffffff"}
              </span>
            </div>
          </div>

          {/* Overlay */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Overlay Image
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLocalOverlay(e.target.files?.[0] ?? null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/30 bg-white/5 hover:bg-white/10 transition">
                <Upload className="w-4 h-4 text-white/50" />
                <span className="text-sm text-white/70">
                  {overlayInfo || (activeTemplate.overlay ? "Overlay set" : "Click to upload overlay")}
                </span>
              </div>
            </div>
            {activeTemplate.overlay && (
              <button
                onClick={() => onUpdateActiveMeta({ overlay: null })}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Remove overlay
              </button>
            )}
          </div>

          {/* Canvas Size Info */}
          <div className="flex items-center justify-between text-xs text-white/40 pt-2">
            <span>Canvas: {activeTemplate.canvasWidth}×{activeTemplate.canvasHeight}px</span>
            <span>{activeTemplate.frames.length} frame{activeTemplate.frames.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
