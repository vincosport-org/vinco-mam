import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validation, athletes } from '../../services/api';
import { LoadingSpinner, Button, Modal, Input } from '../common';
import toast from 'react-hot-toast';

interface ValidationItem {
  queueItemId: string;
  imageId: string;
  imageUrl?: string;
  detectedFace?: {
    boundingBox: any;
    confidence: number;
  };
  detectedBib?: {
    text: string;
    boundingBox: any;
  };
  suggestedAthlete?: {
    athleteId: string;
    athleteName: string;
    confidence: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ValidationQueue() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignAthleteId, setReassignAthleteId] = useState('');
  const [athletesSearch, setAthletesSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['validation-queue'],
    queryFn: () => validation.getQueue({ limit: 100 }),
  });

  const { data: athletesData } = useQuery({
    queryKey: ['athletes-search', athletesSearch],
    queryFn: () => athletes.list({ search: athletesSearch }),
    enabled: reassignModalOpen && athletesSearch.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: (queueItemId: string) => validation.approve(queueItemId),
    onSuccess: () => {
      toast.success('Validation approved');
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve validation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (queueItemId: string) => validation.reject(queueItemId),
    onSuccess: () => {
      toast.success('Validation rejected');
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject validation');
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ queueItemId, newAthleteId }: { queueItemId: string; newAthleteId: string }) =>
      validation.reassign(queueItemId, newAthleteId),
    onSuccess: () => {
      toast.success('Athlete reassigned');
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
      setReassignModalOpen(false);
      setSelectedItem(null);
      setReassignAthleteId('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reassign athlete');
    },
  });

  const items: ValidationItem[] = data?.data?.items || [];

  const handleApprove = (item: ValidationItem) => {
    if (confirm(`Approve recognition of ${item.suggestedAthlete?.athleteName || 'athlete'}?`)) {
      approveMutation.mutate(item.queueItemId);
    }
  };

  const handleReject = (item: ValidationItem) => {
    if (confirm('Reject this recognition?')) {
      rejectMutation.mutate(item.queueItemId);
    }
  };

  const handleReassign = (item: ValidationItem) => {
    setSelectedItem(item);
    setReassignModalOpen(true);
  };

  const handleReassignSubmit = () => {
    if (!selectedItem || !reassignAthleteId) {
      toast.error('Please select an athlete');
      return;
    }
    reassignMutation.mutate({
      queueItemId: selectedItem.queueItemId,
      newAthleteId: reassignAthleteId,
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Validation Queue</h1>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error loading validation queue: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-4 text-gray-600">
            {items.length} item{items.length !== 1 ? 's' : ''} pending validation
          </div>

          {items.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No items pending validation</p>
              <p className="text-gray-400 text-sm mt-2">All recognition results have been validated</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.queueItemId}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.imageUrl && (
                    <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={item.imageUrl}
                        alt="Validation item"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {item.suggestedAthlete && (
                      <div>
                        <p className="text-sm text-gray-500">Suggested Athlete</p>
                        <p className="font-semibold">{item.suggestedAthlete.athleteName}</p>
                        <p className="text-xs text-gray-400">
                          Confidence: {(item.suggestedAthlete.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}

                    {item.detectedBib && (
                      <div>
                        <p className="text-sm text-gray-500">Detected Bib</p>
                        <p className="font-mono text-sm">{item.detectedBib.text}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item);
                        }}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReassign(item);
                        }}
                        disabled={reassignMutation.isPending}
                      >
                        Reassign
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(item);
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => {
          setReassignModalOpen(false);
          setReassignAthleteId('');
          setSelectedItem(null);
        }}
        title="Reassign Athlete"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Athletes
            </label>
            <Input
              value={athletesSearch}
              onChange={(e) => setAthletesSearch(e.target.value)}
              placeholder="Search by name..."
            />
          </div>

          {athletesSearch && (
            <div className="max-h-60 overflow-y-auto border rounded">
              {athletesData?.data?.athletes?.map((athlete: any) => (
                <div
                  key={athlete.athleteId}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    reassignAthleteId === athlete.athleteId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setReassignAthleteId(athlete.athleteId)}
                >
                  <p className="font-medium">{athlete.name}</p>
                  {athlete.nationality && (
                    <p className="text-sm text-gray-500">{athlete.nationality}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setReassignModalOpen(false);
                setReassignAthleteId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignSubmit}
              disabled={!reassignAthleteId || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
