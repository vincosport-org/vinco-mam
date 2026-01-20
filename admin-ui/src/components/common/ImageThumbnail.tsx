import React, { useState } from 'react';

interface ImageThumbnailProps {
  src: string;
  alt?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  src,
  alt = '',
  onClick,
  selected = false,
  className = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer transition-all ${
        selected ? 'ring-4 ring-blue-500' : 'hover:ring-2 ring-gray-300'
      } ${className}`}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
};
