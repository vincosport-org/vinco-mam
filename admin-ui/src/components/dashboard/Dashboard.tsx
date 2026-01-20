import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { images, albums, validation, athletes } from '../../services/api';
import { LoadingSpinner, Button } from '../common';
import { StatsWidget } from './StatsWidget';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['dashboard-images'],
    queryFn: () => images.list({ limit: 1 }),
  });

  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['dashboard-albums'],
    queryFn: () => albums.list(),
  });

  const { data: validationData, isLoading: validationLoading } = useQuery({
    queryKey: ['dashboard-validation'],
    queryFn: () => validation.getQueue({ limit: 1 }),
  });

  const { data: athletesData, isLoading: athletesLoading } = useQuery({
    queryKey: ['dashboard-athletes'],
    queryFn: () => athletes.list({ limit: 1 }),
  });

  const isLoading = imagesLoading || albumsLoading || validationLoading || athletesLoading;

  const stats = {
    images: imagesData?.data?.total || 0,
    albums: albumsData?.data?.albums?.length || 0,
    pendingValidation: validationData?.data?.items?.length || 0,
    athletes: athletesData?.data?.athletes?.length || 0,
  };

  const recentImages = imagesData?.data?.images?.slice(0, 6) || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsWidget
              title="Total Images"
              value={stats.images}
              icon={
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatsWidget
              title="Albums"
              value={stats.albums}
              icon={
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatsWidget
              title="Pending Validation"
              value={stats.pendingValidation}
              icon={
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatsWidget
              title="Athletes"
              value={stats.athletes}
              icon={
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>

          {/* Recent Images */}
          {recentImages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recent Images</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/page=vinco-mam-gallery')}
                >
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recentImages.map((image: any) => (
                  <div
                    key={image.imageId}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/page=vinco-mam-gallery/${image.imageId}`)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={image.signedUrls?.thumbnail || image.signedUrls?.proxy || ''}
                        alt={image.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600 truncate">{image.filename}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate('/page=vinco-mam-gallery')}
                className="w-full"
              >
                Browse Gallery
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/page=vinco-mam-albums')}
                className="w-full"
              >
                Create Album
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/page=vinco-mam-athletes')}
                className="w-full"
              >
                Add Athlete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
