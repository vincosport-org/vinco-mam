import React, { useState } from 'react';
import { Modal } from '../common';

interface ImagePreviewProps {
  image: {
    imageId: string;
    title?: string;
    filename?: string;
    signedUrls?: {
      original?: string;
      proxy?: string;
      thumbnail?: string;
    };
    recognizedAthletes?: Array<{
      athleteId: string;
      athleteName: string;
      confidence?: number;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

export function ImagePreview({ image, isOpen, onClose, onEdit }: ImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={image.title || image.filename || 'Image Preview'} size="xl">
      <div className="space-y-4">
        <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
          <img
            src={image.signedUrls?.proxy || image.signedUrls?.original || image.signedUrls?.thumbnail}
            alt={image.title || image.filename || 'Preview'}
            className={`w-full h-auto ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {image.recognizedAthletes && image.recognizedAthletes.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Recognized Athletes
            </h3>
            <ul className="space-y-1">
              {image.recognizedAthletes.map((athlete) => (
                <li key={athlete.athleteId} className="text-sm text-gray-700 dark:text-gray-300">
                  {athlete.athleteName}
                  {athlete.confidence && (
                    <span className="ml-2 text-gray-500">
                      ({(athlete.confidence * 100).toFixed(1)}%)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Edit Image
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
