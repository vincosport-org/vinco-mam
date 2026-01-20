import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { athletes } from '../services/api';
import toast from 'react-hot-toast';

export function useAthletes(filters?: any) {
  return useQuery({
    queryKey: ['athletes', filters],
    queryFn: () => athletes.list(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateAthlete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; externalId?: string }) => athletes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      toast.success('Athlete created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create athlete');
    },
  });
}

export function useUpdateAthlete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ athleteId, data }: { athleteId: string; data: any }) =>
      athletes.update(athleteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      queryClient.invalidateQueries({ queryKey: ['athlete', variables.athleteId] });
      toast.success('Athlete updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update athlete');
    },
  });
}

export function useUploadHeadshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ athleteId, file }: { athleteId: string; file: File }) =>
      athletes.uploadHeadshot(athleteId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['athlete', variables.athleteId] });
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      toast.success('Headshot uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload headshot');
    },
  });
}
