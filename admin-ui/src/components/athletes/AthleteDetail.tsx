import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { athletes, images } from '../../services/api';
import { LoadingSpinner, Button, Input, ImageThumbnail } from '../common';
import toast from 'react-hot-toast';

export default function AthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: () => athletes.list({ athleteId }),
    enabled: !!athleteId,
  });

  const { data: imagesData } = useQuery({
    queryKey: ['athlete-images', athleteId],
    queryFn: () => images.list({ athleteId }),
    enabled: !!athleteId,
  });

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    dateOfBirth: '',
  });

  const athlete = data?.data?.athletes?.[0];
  const athleteImages = imagesData?.data?.images || [];

  // Initialize form data when athlete loads
  if (athlete && !editing && formData.name === '') {
    setFormData({
      name: athlete.name || '',
      nationality: athlete.nationality || '',
      dateOfBirth: athlete.dateOfBirth || '',
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => athletes.update(athleteId!, data),
    onSuccess: () => {
      toast.success('Athlete updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update athlete');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => athletes.uploadHeadshot(athleteId!, file),
    onSuccess: () => {
      toast.success('Headshot uploaded');
      queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload headshot');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error instanceof Error ? error.message : 'Athlete not found'}
        </div>
        <Button variant="outline" onClick={() => navigate('/athletes')}>
          Back to Athletes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/athletes')}>
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Athlete Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
              {athlete.headshotUrl ? (
                <img
                  src={athlete.headshotUrl}
                  alt={athlete.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Headshot'}
            </Button>

            {editing ? (
              <div className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="e.g., GBR, USA"
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: athlete.name || '',
                        nationality: athlete.nationality || '',
                        dateOfBirth: athlete.dateOfBirth || '',
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
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{athlete.name}</h2>
                {athlete.nationality && (
                  <p className="text-gray-600">Nationality: {athlete.nationality}</p>
                )}
                {athlete.dateOfBirth && (
                  <p className="text-gray-600">
                    Date of Birth: {new Date(athlete.dateOfBirth).toLocaleDateString()}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setEditing(true)}
                >
                  Edit Details
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Images */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Images ({athleteImages.length})
            </h2>

            {athleteImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No images found for this athlete
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {athleteImages.map((image: any) => (
                  <ImageThumbnail
                    key={image.imageId}
                    src={image.signedUrls?.thumbnail || image.signedUrls?.proxy || ''}
                    alt={image.filename}
                    onClick={() => navigate(`/gallery/${image.imageId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
