import React from 'react';

interface EditParameters {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  temperature?: number;
  tint?: number;
  vibrance?: number;
  clarity?: number;
  sharpness?: number;
}

interface AdjustmentPanelProps {
  edits: EditParameters;
  onChange: (key: keyof EditParameters, value: number) => void;
  onReset: () => void;
}

export function AdjustmentPanel({ edits, onChange, onReset }: AdjustmentPanelProps) {
  const adjustments = [
    { key: 'exposure' as const, label: 'Exposure', min: -5, max: 5, step: 0.1, value: edits.exposure || 0 },
    { key: 'contrast' as const, label: 'Contrast', min: -100, max: 100, step: 1, value: edits.contrast || 0 },
    { key: 'highlights' as const, label: 'Highlights', min: -100, max: 100, step: 1, value: edits.highlights || 0 },
    { key: 'shadows' as const, label: 'Shadows', min: -100, max: 100, step: 1, value: edits.shadows || 0 },
    { key: 'whites' as const, label: 'Whites', min: -100, max: 100, step: 1, value: edits.whites || 0 },
    { key: 'blacks' as const, label: 'Blacks', min: -100, max: 100, step: 1, value: edits.blacks || 0 },
    { key: 'temperature' as const, label: 'Temperature', min: 2000, max: 10000, step: 50, value: edits.temperature || 5500 },
    { key: 'tint' as const, label: 'Tint', min: -150, max: 150, step: 1, value: edits.tint || 0 },
    { key: 'saturation' as const, label: 'Saturation', min: -100, max: 100, step: 1, value: edits.saturation || 0 },
    { key: 'vibrance' as const, label: 'Vibrance', min: -100, max: 100, step: 1, value: edits.vibrance || 0 },
    { key: 'clarity' as const, label: 'Clarity', min: -100, max: 100, step: 1, value: edits.clarity || 0 },
    { key: 'sharpness' as const, label: 'Sharpness', min: 0, max: 150, step: 1, value: edits.sharpness || 0 },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjustments</h2>
        <button
          onClick={onReset}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-4">
        {adjustments.map((adj) => (
          <div key={adj.key}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {adj.label}
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-right">
                {adj.value > 0 ? '+' : ''}{adj.value.toFixed(adj.step < 1 ? 1 : 0)}
              </span>
            </div>
            <input
              type="range"
              min={adj.min}
              max={adj.max}
              step={adj.step}
              value={adj.value}
              onChange={(e) => onChange(adj.key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
