import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { albums } from '../../services/api';
import { LoadingSpinner, Button, Input, Modal } from '../common';
import toast from 'react-hot-toast';

interface Album {
  albumId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  imageCount?: number;
  createdAt: string;
  isPublic: boolean;
}

export default function AlbumList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAlbum, setNewAlbum] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['albums'],
    queryFn: () => albums.list(),
  });

  const albumsList: Album[] = data?.data?.albums || [];
  const filteredAlbums = albumsList.filter(album =>
    album.name.toLowerCase().includes(search.toLowerCase()) ||
    album.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newAlbum.name.trim()) {
      toast.error('Album name is required');
      return;
    }

    try {
      await albums.create(newAlbum);
      toast.success('Album created');
      setCreateModalOpen(false);
      setNewAlbum({ name: '', description: '', isPublic: false });
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create album');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Albums</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
          Create Album
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          label="Search Albums"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error loading albums: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-4 text-gray-600">
            {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''}
          </div>

          {filteredAlbums.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">
                {search ? 'No albums match your search' : 'No albums yet'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {!search && 'Create your first album to organize images'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlbums.map((album) => (
                <div
                  key={album.albumId}
                  className="bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => navigate(`/page=vinco-mam-albums/${album.albumId}`)}
                >
                  <div className="aspect-square bg-gray-100">
                    {album.coverImageUrl ? (
                      <img
                        src={album.coverImageUrl}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{album.name}</h3>
                    {album.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{album.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{album.imageCount || 0} images</span>
                      {album.isPublic && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Public</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setNewAlbum({ name: '', description: '', isPublic: false });
        }}
        title="Create New Album"
      >
        <div className="space-y-4">
          <Input
            label="Album Name *"
            value={newAlbum.name}
            onChange={(e) => setNewAlbum({ ...newAlbum, name: e.target.value })}
            placeholder="Enter album name"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={newAlbum.description}
              onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
              placeholder="Optional description..."
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={newAlbum.isPublic}
              onChange={(e) => setNewAlbum({ ...newAlbum, isPublic: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this album publicly accessible
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setNewAlbum({ name: '', description: '', isPublic: false });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Album
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
