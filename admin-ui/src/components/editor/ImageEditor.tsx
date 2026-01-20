import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useImage, useSaveEdits } from '../../hooks/useImages';
import { AdjustmentPanel } from './AdjustmentPanel';
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

export default function ImageEditor() {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [edits, setEdits] = useState<EditParameters>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: imageData, isLoading } = useImage(imageId);
  const saveEditsMutation = useSaveEdits();

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
      }
      if (imageData.data.image.currentEdits) {
        setEdits(imageData.data.image.currentEdits);
        applyEdits(img, imageData.data.image.currentEdits);
      } else {
        applyEdits(img, {});
      }
    };
    img.src = imageData.data.signedUrls?.proxy || imageData.data.signedUrls?.original || '';
  }, [imageData]);

  // Apply edits when they change
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current) return;
    applyEdits(imageRef.current, edits);
  }, [edits]);

  const applyEdits = (image: HTMLImageElement, editParams: EditParameters) => {
    // Use 2D canvas for image editing (WebGL implementation would require proper shader compilation)
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && image) {
      ctx.drawImage(image, 0, 0);
      
      // Apply basic edits using canvas filters (simpler approach)
      if (!canvasRef.current) return;
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Exposure
        const exposure = 1 + (editParams.exposure || 0) / 100;
        data[i] = Math.min(255, data[i] * exposure);
        data[i + 1] = Math.min(255, data[i + 1] * exposure);
        data[i + 2] = Math.min(255, data[i + 2] * exposure);

        // Contrast
        const contrast = 1 + (editParams.contrast || 0) / 100;
        data[i] = Math.min(255, ((data[i] - 128) * contrast) + 128);
        data[i + 1] = Math.min(255, ((data[i + 1] - 128) * contrast) + 128);
        data[i + 2] = Math.min(255, ((data[i + 2] - 128) * contrast) + 128);

        // Saturation
        const saturation = 1 + (editParams.saturation || 0) / 100;
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, gray + (data[i] - gray) * saturation);
        data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * saturation);
        data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * saturation);
      }

      ctx.putImageData(imageData, 0, 0);
    }
  };

  const handleEditChange = (key: keyof EditParameters, value: number) => {
    setEdits((prev) => {
      const newEdits = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      if (imageRef.current) {
        applyEdits(imageRef.current, newEdits);
      }
      return newEdits;
    });
  };

  const handleReset = () => {
    setEdits({});
    setHasUnsavedChanges(true);
    if (imageRef.current) {
      applyEdits(imageRef.current, {});
    }
  };

  const handleSave = () => {
    if (!imageId) return;
    saveEditsMutation.mutate({ imageId, edits }, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!imageData?.data?.image) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Image not found</div>
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
          {hasUnsavedChanges && (
            <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-medium">
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Edit controls panel */}
      <div className="w-80 bg-gray-800 overflow-y-auto">
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
        <AdjustmentPanel
          edits={edits}
          onChange={handleEditChange}
          onReset={handleReset}
        />
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveEditsMutation.isPending}
            className="w-full"
          >
            {saveEditsMutation.isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Changes (⌘S)' : 'Saved'}
          </Button>
        </div>
      </div>
    </div>
  );
}
