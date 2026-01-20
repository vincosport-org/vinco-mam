import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validation, athletes } from '../../services/api';
import { LoadingSpinner, Button, Modal, Input } from '../common';
import { ValidationItem as ValidationItemComponent } from './ValidationItem';
import { AthleteComparison as AthleteComparisonComponent } from './AthleteComparison';
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
            <div className="flex gap-6">
              {/* Queue List */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="space-y-0">
                  {items.map((item) => (
                    <ValidationItemComponent
                      key={item.queueItemId}
                      item={{
                        queueItemId: item.queueItemId,
                        imageId: item.imageId,
                        athleteId: item.suggestedAthlete?.athleteId,
                        athleteName: item.suggestedAthlete?.athleteName,
                        confidence: item.suggestedAthlete?.confidence,
                        imageUrl: item.imageUrl,
                        status: item.status,
                      }}
                      isSelected={selectedItem?.queueItemId === item.queueItemId}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>

              {/* Comparison View */}
              <div className="flex-1">
                {selectedItem ? (
                  <>
                    <AthleteComparisonComponent
                      item={{
                        queueItemId: selectedItem.queueItemId,
                        imageId: selectedItem.imageId,
                        imageUrl: selectedItem.imageUrl,
                        athleteId: selectedItem.suggestedAthlete?.athleteId,
                        athleteName: selectedItem.suggestedAthlete?.athleteName,
                        headshotUrl: undefined,
                        confidence: selectedItem.suggestedAthlete?.confidence,
                      }}
                    />
                    <div className="mt-6 flex justify-center gap-4">
                      <Button
                        variant="danger"
                        onClick={() => handleReject(selectedItem)}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleReassign(selectedItem)}
                        disabled={reassignMutation.isPending}
                      >
                        Reassign
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(selectedItem)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select an item from the queue to view details
                  </div>
                )}
              </div>
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
