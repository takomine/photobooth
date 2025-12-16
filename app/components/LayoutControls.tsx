"use client";

import { LayoutConfig } from "../hooks/usePhotobooth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LayoutControlsProps = {
  layout: LayoutConfig;
  updateLayout: (partial: Partial<LayoutConfig>) => void;
};

export function LayoutControls({ layout, updateLayout }: LayoutControlsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Layout designer</CardTitle>
          <CardDescription>Tweak the grid for non-template mode.</CardDescription>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-foreground">
          {layout.rows}×{layout.cols}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Rows</span>
            <Input
              type="number"
              min={1}
              max={6}
              value={layout.rows}
              onChange={(e) => updateLayout({ rows: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Columns</span>
            <Input
              type="number"
              min={1}
              max={6}
              value={layout.cols}
              onChange={(e) => updateLayout({ cols: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Gap (px)</span>
            <Input
              type="number"
              min={0}
              max={64}
              value={layout.gap}
              onChange={(e) => updateLayout({ gap: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Padding (px)</span>
            <Input
              type="number"
              min={0}
              max={96}
              value={layout.padding}
              onChange={(e) => updateLayout({ padding: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Corner radius (px)
            </span>
            <Input
              type="number"
              min={0}
              max={48}
              value={layout.radius}
              onChange={(e) => updateLayout({ radius: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Background</span>
            <Input
              type="color"
              value={layout.bg}
              onChange={(e) => updateLayout({ bg: e.target.value })}
              className="h-10"
              aria-label="Choose background color"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={layout.shadow}
            onChange={(e) => updateLayout({ shadow: e.target.checked })}
            className="h-4 w-4 rounded border-border text-foreground"
          />
          Drop shadow on frames
        </label>
      </CardContent>
    </Card>
  );
}

