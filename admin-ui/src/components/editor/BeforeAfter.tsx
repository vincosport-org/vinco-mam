import { useState, useRef, useCallback } from 'react';

interface BeforeAfterProps {
  originalUrl: string;
  editedCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export function BeforeAfter({ originalUrl, editedCanvasRef }: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Original image (before) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={originalUrl}
          alt="Before"
          className="w-full h-full object-contain"
        />
        <span className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
          Before
        </span>
      </div>

      {/* Edited image (after) - shown from the canvas */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        {editedCanvasRef.current && (
          <>
            <canvas
              className="w-full h-full object-contain"
              ref={(ref) => {
                if (ref && editedCanvasRef.current) {
                  const ctx = ref.getContext('2d');
                  if (ctx) {
                    ref.width = editedCanvasRef.current.width;
                    ref.height = editedCanvasRef.current.height;
                    ctx.drawImage(editedCanvasRef.current, 0, 0);
                  }
                }
              }}
            />
            <span className="absolute top-4 right-4 bg-blue-600/90 text-white px-2 py-1 rounded text-sm font-medium">
              After
            </span>
          </>
        )}
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
