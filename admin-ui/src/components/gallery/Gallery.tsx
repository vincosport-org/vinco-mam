import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { images } from '../../services/api';
import { LoadingSpinner, Button, Input, Skeleton } from '../common';
import { GalleryItem } from './GalleryItem';
import { ImagePreview } from './ImagePreview';
import { UploadDialog } from './UploadDialog';

interface Image {
  imageId: string;
  filename: string;
  photographerId?: string;
  photographerName?: string;
  eventId?: string;
  eventName?: string;
  uploadedAt: string;
  signedUrls?: {
    thumbnail?: string;
    proxy?: string;
    original?: string;
  };
  recognizedAthletes?: Array<{
    athleteId: string;
    athleteName: string;
    confidence: number;
  }>;
}

export default function Gallery() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    eventId: '',
    photographerId: '',
    athleteId: '',
    search: '',
  });
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [page, setPage] = useState(1);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const limit = 50;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['images', filters, page],
    queryFn: () => images.list({
      eventId: filters.eventId || undefined,
      photographerId: filters.photographerId || undefined,
      athleteId: filters.athleteId || undefined,
      search: filters.search || undefined,
      limit,
      offset: (page - 1) * limit,
    }),
  });

  const handleImageClick = (image: Image) => {
    navigate(`/gallery/${image.imageId}`);
  };

  const handlePreviewClick = (image: Image) => {
    setSelectedImage(image);
  };

  const imagesList = data?.data?.images || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowUploadDialog(true)}>
            Upload Images
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploadComplete={() => {
          setShowUploadDialog(false);
          refetch();
        }}
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            placeholder="Search by filename..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Input
            label="Event ID"
            placeholder="Filter by event..."
            value={filters.eventId}
            onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
          />
          <Input
            label="Photographer ID"
            placeholder="Filter by photographer..."
            value={filters.photographerId}
            onChange={(e) => setFilters({ ...filters, photographerId: e.target.value })}
          />
          <Input
            label="Athlete ID"
            placeholder="Filter by athlete..."
            value={filters.athleteId}
            onChange={(e) => setFilters({ ...filters, athleteId: e.target.value })}
          />
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={200} className="w-full aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error loading images: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-4 text-gray-600">
            Showing {imagesList.length} image{imagesList.length !== 1 ? 's' : ''}
            {data?.data?.total && ` of ${data.data.total}`}
          </div>

          {imagesList.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No images found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or upload some images</p>
            </div>
          ) : (
            <>
              {/* Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {imagesList.map((image: Image) => (
                  <GalleryItem
                    key={image.imageId}
                    image={image}
                    onClick={() => handleImageClick(image)}
                  />
                ))}
              </div>
              
              {/* Preview Modal */}
              {selectedImage && (
                <ImagePreview
                  image={selectedImage}
                  isOpen={!!selectedImage}
                  onClose={() => setSelectedImage(null)}
                  onEdit={() => {
                    setSelectedImage(null);
                    handleImageClick(selectedImage);
                  }}
                />
              )}

              {/* Pagination */}
              {data?.data?.total && data.data.total > limit && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {page} of {Math.ceil(data.data.total / limit)}
                  </span>
                  <Button
                    variant="outline"
                    disabled={imagesList.length < limit}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}
