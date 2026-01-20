import React from 'react';
import { GalleryItem } from './GalleryItem';

interface Image {
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
}

interface GalleryGridProps {
  images: Image[];
  columns?: number;
  onImageClick?: (image: Image) => void;
  onImageSelect?: (imageId: string, selected: boolean) => void;
  selectedImageIds?: string[];
}

export function GalleryGrid({
  images,
  columns = 6,
  onImageClick,
  onImageSelect,
  selectedImageIds = [],
}: GalleryGridProps) {
  const gridClass = `grid grid-cols-${columns} gap-4`;
  
  return (
    <div className={gridClass}>
      {images.map((image) => (
        <GalleryItem
          key={image.imageId}
          image={image}
          onClick={() => onImageClick?.(image)}
          selected={selectedImageIds.includes(image.imageId)}
          onSelect={(selected) => onImageSelect?.(image.imageId, selected)}
        />
      ))}
    </div>
  );
}
