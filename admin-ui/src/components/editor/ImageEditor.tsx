import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useImage, useSaveEdits } from '../../hooks/useImages';
import { AdjustmentPanel } from './AdjustmentPanel';
import { BeforeAfter } from './BeforeAfter';
import { CropTool } from './CropTool';
import { VersionHistory } from './VersionHistory';
import { ExportDialog } from '../export/ExportDialog';
import { LoadingSpinner, Button } from '../common';
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

const defaultEdits: EditParameters = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 5500,
  tint: 0,
  vibrance: 0,
  clarity: 0,
  sharpness: 0,
};

export default function ImageEditor() {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [edits, setEdits] = useState<EditParameters>(defaultEdits);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const { data: imageData, isLoading } = useImage(imageId);
  const saveEditsMutation = useSaveEdits();

  const originalUrl = imageData?.data?.signedUrls?.proxy || imageData?.data?.signedUrls?.original || '';

  // Load image when data is available
  useEffect(() => {
    if (!imageData?.data?.image || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      }
      if (imageData.data.image.currentEdits) {
        setEdits({ ...defaultEdits, ...imageData.data.image.currentEdits });
        applyEdits(img, { ...defaultEdits, ...imageData.data.image.currentEdits });
      } else {
        applyEdits(img, defaultEdits);
      }
    };
    img.src = originalUrl;
  }, [imageData, originalUrl]);

  // Apply edits when they change
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current) return;
    applyEdits(imageRef.current, edits);
  }, [edits]);

  const applyEdits = (image: HTMLImageElement, editParams: EditParameters) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && image) {
      ctx.drawImage(image, 0, 0);

      if (!canvasRef.current) return;
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Exposure
        const exposure = 1 + (editParams.exposure || 0) / 100;
        data[i] = Math.min(255, Math.max(0, data[i] * exposure));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * exposure));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * exposure));

        // Contrast
        const contrast = 1 + (editParams.contrast || 0) / 100;
        data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128));
        data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128));
        data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128));

        // Saturation
        const saturation = 1 + (editParams.saturation || 0) / 100;
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * saturation));
        data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * saturation));
        data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * saturation));

        // Temperature (simplified - shifts toward warm/cool)
        const tempShift = ((editParams.temperature || 5500) - 5500) / 100;
        data[i] = Math.min(255, Math.max(0, data[i] + tempShift)); // Red
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - tempShift)); // Blue

        // Highlights (affects bright areas)
        const highlightThreshold = 180;
        if (data[i] > highlightThreshold || data[i + 1] > highlightThreshold || data[i + 2] > highlightThreshold) {
          const highlightFactor = (editParams.highlights || 0) / 200;
          data[i] = Math.min(255, Math.max(0, data[i] + data[i] * highlightFactor));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + data[i + 1] * highlightFactor));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + data[i + 2] * highlightFactor));
        }

        // Shadows (affects dark areas)
        const shadowThreshold = 75;
        if (data[i] < shadowThreshold && data[i + 1] < shadowThreshold && data[i + 2] < shadowThreshold) {
          const shadowFactor = (editParams.shadows || 0) / 200;
          data[i] = Math.min(255, Math.max(0, data[i] + (255 - data[i]) * shadowFactor));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (255 - data[i + 1]) * shadowFactor));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (255 - data[i + 2]) * shadowFactor));
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }
  };

  const handleEditChange = useCallback((key: keyof EditParameters, value: number) => {
    setEdits((prev) => {
      const newEdits = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      return newEdits;
    });
  }, []);

  const handleReset = useCallback(() => {
    setEdits(defaultEdits);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!imageId) return;
    saveEditsMutation.mutate({ imageId, edits }, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        toast.success('Edits saved');
      },
    });
  }, [imageId, edits, saveEditsMutation]);

  const handleRevertToVersion = useCallback((versionEdits: EditParameters) => {
    setEdits({ ...defaultEdits, ...versionEdits });
    setHasUnsavedChanges(true);
    setShowVersionHistory(false);
    toast.success('Reverted to version');
  }, []);

  const handleCropChange = useCallback((crop: EditParameters['crop']) => {
    setEdits(prev => ({ ...prev, crop }));
    setHasUnsavedChanges(true);
  }, []);

  // Copy/paste edits
  const handleCopyEdits = useCallback(() => {
    localStorage.setItem('vinco_copied_edits', JSON.stringify(edits));
    toast.success('Edits copied');
  }, [edits]);

  const handlePasteEdits = useCallback(() => {
    const copied = localStorage.getItem('vinco_copied_edits');
    if (copied) {
      const pastedEdits = JSON.parse(copied);
      setEdits(pastedEdits);
      setHasUnsavedChanges(true);
      toast.success('Edits pasted');
    }
  }, []);

  // Keyboard shortcuts
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    handleSave();
  }, { enableOnFormTags: true }, [handleSave]);

  useHotkeys('z', () => setShowBeforeAfter(prev => !prev), []);
  useHotkeys('c', () => setShowCropTool(prev => !prev), []);
  useHotkeys('h', () => setShowVersionHistory(prev => !prev), []);
  useHotkeys('mod+shift+e', () => setShowExport(true), []);
  useHotkeys('escape', () => {
    if (showCropTool) setShowCropTool(false);
    else if (showVersionHistory) setShowVersionHistory(false);
    else if (showExport) setShowExport(false);
    else if (showBeforeAfter) setShowBeforeAfter(false);
    else navigate(-1);
  }, [showCropTool, showVersionHistory, showExport, showBeforeAfter, navigate]);

  useHotkeys('mod+c', handleCopyEdits, { enableOnFormTags: true }, [handleCopyEdits]);
  useHotkeys('mod+v', handlePasteEdits, { enableOnFormTags: true }, [handlePasteEdits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!imageData?.data?.image) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-lg text-white">Image not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 bg-black relative">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          />

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-medium">
              Unsaved changes
            </div>
          )}

          {/* Before/After overlay */}
          {showBeforeAfter && (
            <BeforeAfter
              originalUrl={originalUrl}
              editedCanvasRef={canvasRef}
            />
          )}

          {/* Crop tool overlay */}
          {showCropTool && (
            <CropTool
              currentCrop={edits.crop}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
              onCropChange={handleCropChange}
              onClose={() => setShowCropTool(false)}
            />
          )}

          {/* Toolbar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800/90 rounded-lg p-2">
            <button
              onClick={() => setShowBeforeAfter(prev => !prev)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showBeforeAfter ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Before/After (Z)
            </button>
            <button
              onClick={() => setShowCropTool(prev => !prev)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showCropTool ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Crop (C)
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm font-medium"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveEditsMutation.isPending}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saveEditsMutation.isPending ? 'Saving...' : 'Save (⌘S)'}
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-sm font-medium"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Edit controls panel */}
      <div className="w-80 bg-gray-800 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Controls</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AdjustmentPanel
            edits={edits}
            onChange={handleEditChange}
            onReset={handleReset}
          />
        </div>

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowVersionHistory(true)}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
          >
            Version History (H)
          </button>
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveEditsMutation.isPending}
            className="w-full"
          >
            {saveEditsMutation.isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Changes (⌘S)' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showVersionHistory && (
        <VersionHistory
          imageId={imageId!}
          onRevert={handleRevertToVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {showExport && (
        <ExportDialog
          imageId={imageId!}
          currentEdits={edits}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
