import React from 'react';
import { ImageThumbnail } from '../common';
import { formatDate } from '../../utils/formatters';

interface GalleryItemProps {
  image: {
    imageId: string;
    filename?: string;
    title?: string;
    photographerName?: string;
    uploadedAt?: string;
    captureTime?: string;
    signedUrls?: {
      thumbnail?: string;
    };
    recognizedAthletes?: Array<{
      athleteId: string;
      athleteName: string;
    }>;
  };
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function GalleryItem({ image, onClick, selected, onSelect }: GalleryItemProps) {
  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative aspect-square">
        <ImageThumbnail
          src={image.signedUrls?.thumbnail || ''}
          alt={image.title || image.filename || `Image ${image.imageId}`}
          className="w-full h-full object-cover"
        />
        {onSelect && (
          <div
            className="absolute top-2 left-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(!selected);
            }}
          >
            <input
              type="checkbox"
              checked={selected || false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        )}
        {image.recognizedAthletes && image.recognizedAthletes.length > 0 && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {image.recognizedAthletes.length} athlete{image.recognizedAthletes.length > 1 ? 's' : ''}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
            View Details
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {image.title || image.filename || `Image ${image.imageId}`}
        </h3>
        {image.photographerName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {image.photographerName}
          </p>
        )}
        {image.captureTime && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(image.captureTime)}
          </p>
        )}
      </div>
    </div>
  );
}
