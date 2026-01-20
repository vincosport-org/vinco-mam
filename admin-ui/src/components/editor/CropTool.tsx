import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../common';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropToolProps {
  currentCrop?: CropArea;
  imageWidth: number;
  imageHeight: number;
  onCropChange: (crop: CropArea) => void;
  onClose: () => void;
}

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:2', value: 3/2 },
  { label: '16:9', value: 16/9 },
  { label: '2:3', value: 2/3 },
  { label: '3:4', value: 3/4 },
  { label: '9:16', value: 9/16 },
];

export function CropTool({ currentCrop, imageWidth, imageHeight, onCropChange, onClose }: CropToolProps) {
  const [crop, setCrop] = useState<CropArea>(currentCrop || {
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight,
  });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (handle) setResizeHandle(handle);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const scaleX = imageWidth / rect.width;
    const scaleY = imageHeight / rect.height;

    setCrop(prev => {
      let newCrop = { ...prev };

      if (dragType === 'move') {
        newCrop.x = Math.max(0, Math.min(imageWidth - prev.width, prev.x + deltaX * scaleX));
        newCrop.y = Math.max(0, Math.min(imageHeight - prev.height, prev.y + deltaY * scaleY));
      } else if (dragType === 'resize' && resizeHandle) {
        const handle = resizeHandle;

        if (handle.includes('e')) {
          newCrop.width = Math.max(50, Math.min(imageWidth - prev.x, prev.width + deltaX * scaleX));
        }
        if (handle.includes('w')) {
          const newWidth = Math.max(50, prev.width - deltaX * scaleX);
          const newX = prev.x + (prev.width - newWidth);
          if (newX >= 0) {
            newCrop.x = newX;
            newCrop.width = newWidth;
          }
        }
        if (handle.includes('s')) {
          newCrop.height = Math.max(50, Math.min(imageHeight - prev.y, prev.height + deltaY * scaleY));
        }
        if (handle.includes('n')) {
          const newHeight = Math.max(50, prev.height - deltaY * scaleY);
          const newY = prev.y + (prev.height - newHeight);
          if (newY >= 0) {
            newCrop.y = newY;
            newCrop.height = newHeight;
          }
        }

        // Apply aspect ratio constraint
        if (aspectRatio) {
          const targetHeight = newCrop.width / aspectRatio;
          if (handle.includes('e') || handle.includes('w')) {
            newCrop.height = targetHeight;
          } else {
            newCrop.width = newCrop.height * aspectRatio;
          }
        }
      }

      return newCrop;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragType, dragStart, resizeHandle, imageWidth, imageHeight, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleApply = () => {
    onCropChange(crop);
    onClose();
  };

  const handleReset = () => {
    setCrop({
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight,
    });
  };

  // Calculate display percentages
  const displayCrop = {
    left: `${(crop.x / imageWidth) * 100}%`,
    top: `${(crop.y / imageHeight) * 100}%`,
    width: `${(crop.width / imageWidth) * 100}%`,
    height: `${(crop.height / imageHeight) * 100}%`,
  };

  return (
    <div className="absolute inset-0 z-20">
      {/* Overlay */}
      <div ref={containerRef} className="absolute inset-0">
        {/* Darkened areas outside crop */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Crop area */}
        <div
          className="absolute cursor-move"
          style={displayCrop}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          {/* Clear center */}
          <div className="absolute inset-0 bg-black/0 border-2 border-white">
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>
          </div>

          {/* Resize handles */}
          {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((handle) => (
            <div
              key={handle}
              className={`absolute w-4 h-4 bg-white rounded-full border-2 border-gray-800 cursor-${
                handle === 'n' || handle === 's' ? 'ns' :
                handle === 'e' || handle === 'w' ? 'ew' :
                handle === 'nw' || handle === 'se' ? 'nwse' : 'nesw'
              }-resize`}
              style={{
                left: handle.includes('w') ? '-8px' : handle.includes('e') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                top: handle.includes('n') ? '-8px' : handle.includes('s') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'resize', handle)}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800/95 rounded-lg p-4 z-30">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-300">Aspect Ratio:</span>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.label}
                onClick={() => setAspectRatio(ratio.value)}
                className={`px-2 py-1 text-xs rounded ${
                  aspectRatio === ratio.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-4">
          {Math.round(crop.width)} x {Math.round(crop.height)} px
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
