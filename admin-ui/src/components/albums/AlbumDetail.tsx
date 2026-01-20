import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { albums, images } from '../../services/api';
import { LoadingSpinner, Button, Input, ImageThumbnail, Modal } from '../common';
import toast from 'react-hot-toast';

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [addImagesModalOpen, setAddImagesModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  const { data: albumData, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albums.list(),
    enabled: !!albumId,
  });

  const { data: allImagesData } = useQuery({
    queryKey: ['all-images'],
    queryFn: () => images.list({ limit: 1000 }),
    enabled: addImagesModalOpen,
  });

  // Handle response structure: axios wraps in .data, then API returns { albums: [...] }
  const albumsArray: any[] = (albumData?.data as any)?.albums || (albumData?.data as any) || [];
  const album = albumsArray.find((a: any) => a.albumId === albumId);
  const albumImages = album?.imageIds?.map((id: string) => ({ imageId: id })) || [];
  const allImages = allImagesData?.data?.images || [];

  // Initialize form data
  if (album && !editing && formData.name === '') {
    setFormData({
      name: album.title || album.name || '',
      description: album.description || '',
      isPublic: album.isPublic || false,
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => albums.update(albumId!, {
      title: data.name, // Lambda expects 'title'
      description: data.description,
      isPublic: data.isPublic,
    }),
    onSuccess: () => {
      toast.success('Album updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
    onError: (error: any) => {
      console.error('Album update error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update album');
    },
  });

  const addImagesMutation = useMutation({
    mutationFn: (imageIds: string[]) => albums.addImages(albumId!, imageIds),
    onSuccess: () => {
      toast.success('Images added to album');
      setAddImagesModalOpen(false);
      setSelectedImages([]);
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add images');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleAddImages = () => {
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }
    addImagesMutation.mutate(selectedImages);
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Album not found
        </div>
        <Button variant="outline" onClick={() => navigate('/page=vinco-mam-albums')}>
          Back to Albums
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/page=vinco-mam-albums')}>
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">{album.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Album Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            {editing ? (
              <div className="space-y-4">
                <Input
                  label="Album Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Public</label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: album.name || '',
                        description: album.description || '',
                        isPublic: album.isPublic || false,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {album.description && (
                  <p className="text-gray-600">{album.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <p>{albumImages.length} images</p>
                  {album.isPublic && (
                    <p className="mt-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Public</span>
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditing(true)}
                >
                  Edit Album
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setAddImagesModalOpen(true)}
                >
                  Add Images
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Images Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Images ({albumImages.length})
            </h2>

            {albumImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No images in this album yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setAddImagesModalOpen(true)}
                >
                  Add Images
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albumImages.map((image: any) => (
                  <ImageThumbnail
                    key={image.imageId}
                    src={image.signedUrls?.thumbnail || image.signedUrls?.proxy || ''}
                    alt={image.filename}
                    onClick={() => navigate(`/page=vinco-mam-gallery/${image.imageId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Images Modal */}
      <Modal
        isOpen={addImagesModalOpen}
        onClose={() => {
          setAddImagesModalOpen(false);
          setSelectedImages([]);
        }}
        title="Add Images to Album"
        size="xl"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allImages.map((image: any) => (
              <div
                key={image.imageId}
                className={`cursor-pointer border-2 rounded-lg overflow-hidden ${
                  selectedImages.includes(image.imageId)
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => toggleImageSelection(image.imageId)}
              >
                <ImageThumbnail
                  src={image.signedUrls?.thumbnail || image.signedUrls?.proxy || ''}
                  alt={image.filename}
                  selected={selectedImages.includes(image.imageId)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAddImagesModalOpen(false);
                setSelectedImages([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddImages}
              disabled={selectedImages.length === 0 || addImagesMutation.isPending}
            >
              {addImagesMutation.isPending ? 'Adding...' : 'Add Selected Images'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
