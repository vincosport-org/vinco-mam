import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { athletes } from '../../services/api';
import { LoadingSpinner, Button, Input, Modal } from '../common';
import toast from 'react-hot-toast';

interface Athlete {
  athleteId: string;
  name: string;
  nationality?: string;
  dateOfBirth?: string;
  headshotUrl?: string;
  imageCount?: number;
}

export default function AthleteList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAthlete, setNewAthlete] = useState({
    name: '',
    nationality: '',
    dateOfBirth: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['athletes', search],
    queryFn: () => athletes.list({ search: search || undefined }),
  });

  const athletesList: Athlete[] = data?.data?.athletes || [];

  const handleCreate = async () => {
    if (!newAthlete.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await athletes.create({
        name: newAthlete.name,
        nationality: newAthlete.nationality || undefined,
        dateOfBirth: newAthlete.dateOfBirth || undefined,
      });
      toast.success('Athlete created');
      setCreateModalOpen(false);
      setNewAthlete({ name: '', nationality: '', dateOfBirth: '' });
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create athlete');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Athletes</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
          Add Athlete
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          label="Search Athletes"
          placeholder="Search by name or nationality..."
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
          Error loading athletes: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-4 text-gray-600">
            {athletesList.length} athlete{athletesList.length !== 1 ? 's' : ''}
          </div>

          {athletesList.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No athletes found</p>
              <p className="text-gray-400 text-sm mt-2">
                {search ? 'Try a different search term' : 'Add your first athlete to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {athletesList.map((athlete) => (
                <div
                  key={athlete.athleteId}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/athletes/${athlete.athleteId}`)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                    {athlete.headshotUrl ? (
                      <img
                        src={athlete.headshotUrl}
                        alt={athlete.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{athlete.name}</h3>
                  {athlete.nationality && (
                    <p className="text-sm text-gray-500 mb-2">{athlete.nationality}</p>
                  )}
                  {athlete.imageCount !== undefined && (
                    <p className="text-xs text-gray-400">
                      {athlete.imageCount} image{athlete.imageCount !== 1 ? 's' : ''}
                    </p>
                  )}
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
          setNewAthlete({ name: '', nationality: '', dateOfBirth: '' });
        }}
        title="Add New Athlete"
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={newAthlete.name}
            onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
            placeholder="Enter athlete name"
            required
          />
          <Input
            label="Nationality"
            value={newAthlete.nationality}
            onChange={(e) => setNewAthlete({ ...newAthlete, nationality: e.target.value })}
            placeholder="e.g., GBR, USA"
          />
          <Input
            label="Date of Birth"
            type="date"
            value={newAthlete.dateOfBirth}
            onChange={(e) => setNewAthlete({ ...newAthlete, dateOfBirth: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setNewAthlete({ name: '', nationality: '', dateOfBirth: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Athlete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
