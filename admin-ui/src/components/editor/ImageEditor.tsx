import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<EditParameters>({});
  const [saving, setSaving] = useState(false);
  const [glContext, setGlContext] = useState<WebGLRenderingContext | null>(null);
  const { send } = useWebSocket();

  // Load image data
  useEffect(() => {
    if (!imageId) return;

    const loadImage = async () => {
      try {
        const response = await api.get(`/images/${imageId}`);
        
        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageRef.current = img;
          setLoading(false);
          initializeWebGL();
        };
        img.src = response.data.signedUrls?.proxy || response.data.signedUrls?.original;
      } catch (error) {
        console.error('Error loading image:', error);
        setLoading(false);
      }
    };

    loadImage();
  }, [imageId]);

  // Initialize WebGL context
  const initializeWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Set canvas size
    if (imageRef.current) {
      canvas.width = imageRef.current.width;
      canvas.height = imageRef.current.height;
    }

    setGlContext(gl as WebGLRenderingContext);
  }, []);

  // Apply edits using WebGL shaders
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
    setEdits(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveEdits = async () => {
    if (!imageId) return;

    setSaving(true);
    try {
      await api.post(`/images/${imageId}/edits`, { edits });
      send({ action: 'imageUpdated', imageId });
    } catch (error) {
      console.error('Error saving edits:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEdits({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 bg-black">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          />
        </div>
      </div>

      {/* Edit controls panel */}
      <div className="w-80 bg-gray-800 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Controls</h2>

        {/* Exposure */}
        <div className="mb-4">
          <label className="block mb-2">
            Exposure: {edits.exposure || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.exposure || 0}
            onChange={(e) => handleEditChange('exposure', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div className="mb-4">
          <label className="block mb-2">
            Contrast: {edits.contrast || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.contrast || 0}
            onChange={(e) => handleEditChange('contrast', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div className="mb-4">
          <label className="block mb-2">
            Saturation: {edits.saturation || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.saturation || 0}
            onChange={(e) => handleEditChange('saturation', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Highlights */}
        <div className="mb-4">
          <label className="block mb-2">
            Highlights: {edits.highlights || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.highlights || 0}
            onChange={(e) => handleEditChange('highlights', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Shadows */}
        <div className="mb-4">
          <label className="block mb-2">
            Shadows: {edits.shadows || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.shadows || 0}
            onChange={(e) => handleEditChange('shadows', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Temperature */}
        <div className="mb-4">
          <label className="block mb-2">
            Temperature: {edits.temperature || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.temperature || 0}
            onChange={(e) => handleEditChange('temperature', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Tint */}
        <div className="mb-4">
          <label className="block mb-2">
            Tint: {edits.tint || 0}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={edits.tint || 0}
            onChange={(e) => handleEditChange('tint', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Reset
          </button>
          <button
            onClick={handleSaveEdits}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Edits'}
          </button>
        </div>
      </div>
    </div>
  );
}
