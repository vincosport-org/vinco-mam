import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { images } from '../../services/api';
import { Modal, Button, Input, LoadingSpinner } from '../common';
import toast from 'react-hot-toast';

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
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotation?: number;
}

interface ExportPreset {
  presetId: string;
  name: string;
  format: 'JPEG' | 'PNG' | 'TIFF' | 'WEBP';
  quality: number;
  maxPixels?: number;
  maxFileSizeMB?: number;
  colorSpace: 'SRGB' | 'ADOBE_RGB' | 'PROPHOTO_RGB';
  metadata: 'ALL' | 'COPYRIGHT' | 'NONE';
  watermark?: {
    enabled: boolean;
    text?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

interface ExportDialogProps {
  imageId: string;
  currentEdits: EditParameters;
  onClose: () => void;
}

const DEFAULT_PRESETS: ExportPreset[] = [
  {
    presetId: 'web-large',
    name: 'Web (Large)',
    format: 'JPEG',
    quality: 85,
    maxPixels: 2048 * 2048,
    colorSpace: 'SRGB',
    metadata: 'COPYRIGHT',
  },
  {
    presetId: 'web-medium',
    name: 'Web (Medium)',
    format: 'JPEG',
    quality: 80,
    maxPixels: 1200 * 1200,
    colorSpace: 'SRGB',
    metadata: 'NONE',
  },
  {
    presetId: 'social-media',
    name: 'Social Media',
    format: 'JPEG',
    quality: 90,
    maxPixels: 1080 * 1080,
    colorSpace: 'SRGB',
    metadata: 'NONE',
    watermark: {
      enabled: true,
      text: 'Vinco Sport',
      position: 'bottom-right',
      opacity: 0.5,
    },
  },
  {
    presetId: 'print-high',
    name: 'Print (High Quality)',
    format: 'TIFF',
    quality: 100,
    colorSpace: 'ADOBE_RGB',
    metadata: 'ALL',
  },
  {
    presetId: 'original',
    name: 'Original Quality',
    format: 'JPEG',
    quality: 100,
    colorSpace: 'SRGB',
    metadata: 'ALL',
  },
];

export function ExportDialog({ imageId, currentEdits, onClose }: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset | null>(null);
  const [customSettings, setCustomSettings] = useState({
    format: 'JPEG' as 'JPEG' | 'PNG' | 'TIFF' | 'WEBP',
    quality: 90,
    maxPixels: undefined as number | undefined,
    colorSpace: 'SRGB' as 'SRGB' | 'ADOBE_RGB' | 'PROPHOTO_RGB',
    metadata: 'COPYRIGHT' as 'ALL' | 'COPYRIGHT' | 'NONE',
    watermarkEnabled: false,
    watermarkText: '',
    watermarkPosition: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
    watermarkOpacity: 0.5,
  });
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Fetch custom presets from API
  const { data: presetsData } = useQuery({
    queryKey: ['export-presets'],
    queryFn: () => images.getExportPresets(),
  });

  const allPresets = [...DEFAULT_PRESETS, ...(presetsData?.data?.presets || [])];

  const exportMutation = useMutation({
    mutationFn: (settings: any) => images.export(imageId, settings),
    onSuccess: (data) => {
      toast.success('Export started! You will be notified when ready.');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start export');
    },
  });

  const handleExport = () => {
    let exportSettings;

    if (activeTab === 'presets' && selectedPreset) {
      exportSettings = {
        presetId: selectedPreset.presetId,
        edits: currentEdits,
      };
    } else {
      exportSettings = {
        format: customSettings.format,
        quality: customSettings.quality,
        maxPixels: customSettings.maxPixels,
        colorSpace: customSettings.colorSpace,
        metadata: customSettings.metadata,
        watermark: customSettings.watermarkEnabled ? {
          enabled: true,
          text: customSettings.watermarkText,
          position: customSettings.watermarkPosition,
          opacity: customSettings.watermarkOpacity,
        } : undefined,
        edits: currentEdits,
      };
    }

    exportMutation.mutate(exportSettings);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Export Image" size="lg">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Custom Settings
          </button>
        </nav>
      </div>

      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {allPresets.map((preset) => (
            <div
              key={preset.presetId}
              onClick={() => setSelectedPreset(preset)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedPreset?.presetId === preset.presetId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{preset.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {preset.format} • Quality: {preset.quality}% • {preset.colorSpace}
                    {preset.maxPixels && ` • Max ${Math.sqrt(preset.maxPixels).toFixed(0)}px`}
                    {preset.watermark?.enabled && ' • Watermark'}
                  </p>
                </div>
                {selectedPreset?.presetId === preset.presetId && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Settings Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <select
                value={customSettings.format}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="JPEG">JPEG</option>
                <option value="PNG">PNG</option>
                <option value="TIFF">TIFF</option>
                <option value="WEBP">WebP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={customSettings.quality}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{customSettings.quality}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color Space
              </label>
              <select
                value={customSettings.colorSpace}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, colorSpace: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="SRGB">sRGB</option>
                <option value="ADOBE_RGB">Adobe RGB</option>
                <option value="PROPHOTO_RGB">ProPhoto RGB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metadata
              </label>
              <select
                value={customSettings.metadata}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, metadata: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="ALL">All Metadata</option>
                <option value="COPYRIGHT">Copyright Only</option>
                <option value="NONE">None</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Dimension (px)
            </label>
            <Input
              type="number"
              value={customSettings.maxPixels ? Math.sqrt(customSettings.maxPixels).toString() : ''}
              onChange={(e) => setCustomSettings(prev => ({
                ...prev,
                maxPixels: e.target.value ? parseInt(e.target.value) ** 2 : undefined
              }))}
              placeholder="Leave empty for original size"
            />
          </div>

          {/* Watermark Settings */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="watermark"
                checked={customSettings.watermarkEnabled}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="watermark" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add Watermark
              </label>
            </div>

            {customSettings.watermarkEnabled && (
              <div className="space-y-3 pl-6">
                <Input
                  label="Watermark Text"
                  value={customSettings.watermarkText}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                  placeholder="Enter watermark text"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position
                    </label>
                    <select
                      value={customSettings.watermarkPosition}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, watermarkPosition: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opacity
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={customSettings.watermarkOpacity}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, watermarkOpacity: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">{Math.round(customSettings.watermarkOpacity * 100)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending || (activeTab === 'presets' && !selectedPreset)}
        >
          {exportMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Exporting...
            </>
          ) : (
            'Export'
          )}
        </Button>
      </div>
    </Modal>
  );
}
