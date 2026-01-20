import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { images } from '../../services/api';
import { ImageThumbnail, LoadingSpinner, Button, Input } from '../common';
import { Modal } from '../common';

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
    navigate(`/page=vinco-mam-gallery/${image.imageId}`);
  };

  const handlePreviewClick = (image: Image) => {
    setSelectedImage(image);
  };

  const imagesList = data?.data?.images || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <Button onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

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
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
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
                  <div key={image.imageId} className="relative group">
                    <ImageThumbnail
                      src={image.signedUrls?.thumbnail || image.signedUrls?.proxy || ''}
                      alt={image.filename}
                      onClick={() => handleImageClick(image)}
                      className="cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewClick(image);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleImageClick(image)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    {image.recognizedAthletes && image.recognizedAthletes.length > 0 && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        {image.recognizedAthletes.length} athlete{image.recognizedAthletes.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>

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

      {/* Preview Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title={selectedImage?.filename}
        size="xl"
      >
        {selectedImage && (
          <div>
            <img
              src={selectedImage.signedUrls?.proxy || selectedImage.signedUrls?.original || ''}
              alt={selectedImage.filename}
              className="w-full h-auto rounded-lg mb-4"
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Filename:</strong> {selectedImage.filename}
              </div>
              <div>
                <strong>Uploaded:</strong> {new Date(selectedImage.uploadedAt).toLocaleDateString()}
              </div>
              {selectedImage.photographerName && (
                <div>
                  <strong>Photographer:</strong> {selectedImage.photographerName}
                </div>
              )}
              {selectedImage.eventName && (
                <div>
                  <strong>Event:</strong> {selectedImage.eventName}
                </div>
              )}
            </div>
            {selectedImage.recognizedAthletes && selectedImage.recognizedAthletes.length > 0 && (
              <div className="mt-4">
                <strong>Recognized Athletes:</strong>
                <ul className="list-disc list-inside mt-2">
                  {selectedImage.recognizedAthletes.map((athlete, idx) => (
                    <li key={idx}>
                      {athlete.athleteName} ({(athlete.confidence * 100).toFixed(1)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <Button onClick={() => handleImageClick(selectedImage)}>
                Open in Editor
              </Button>
              <Button variant="outline" onClick={() => setSelectedImage(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
