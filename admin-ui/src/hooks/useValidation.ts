import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validation } from '../services/api';
import toast from 'react-hot-toast';

export function useValidationQueue(filters?: any) {
  return useQuery({
    queryKey: ['validationQueue', filters],
    queryFn: () => validation.getQueue(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useClaimValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueItemId: string) => validation.claim(queueItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to claim item');
    },
  });
}

export function useApproveValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueItemId: string) => validation.approve(queueItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Validation approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve');
    },
  });
}

export function useRejectValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueItemId: string) => validation.reject(queueItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
      toast.success('Validation rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject');
    },
  });
}

export function useReassignValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueItemId, newAthleteId }: { queueItemId: string; newAthleteId: string }) =>
      validation.reassign(queueItemId, newAthleteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Athlete reassigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reassign');
    },
  });
}
