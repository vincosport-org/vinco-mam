import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { images } from '../services/api';
import toast from 'react-hot-toast';

export function useImages(filters?: any) {
  return useQuery({
    queryKey: ['images', filters],
    queryFn: () => images.list(filters),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useImage(imageId: string | undefined) {
  return useQuery({
    queryKey: ['image', imageId],
    queryFn: () => images.get(imageId!),
    enabled: !!imageId,
  });
}

export function useUpdateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, data }: { imageId: string; data: any }) =>
      images.update(imageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['image', variables.imageId] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Image updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update image');
    },
  });
}

export function useSaveEdits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, edits }: { imageId: string; edits: any }) =>
      images.saveEdits(imageId, edits),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['image', variables.imageId] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Edits saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save edits');
    },
  });
}

export function useImageVersions(imageId: string | undefined) {
  return useQuery({
    queryKey: ['imageVersions', imageId],
    queryFn: () => images.getVersions(imageId!),
    enabled: !!imageId,
  });
}

export function useRevertImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, versionTimestamp }: { imageId: string; versionTimestamp: string }) =>
      images.revert(imageId, versionTimestamp),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['image', variables.imageId] });
      queryClient.invalidateQueries({ queryKey: ['imageVersions', variables.imageId] });
      toast.success('Image reverted to previous version');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revert image');
    },
  });
}

export function useExportImage() {
  return useMutation({
    mutationFn: ({ imageId, settings }: { imageId: string; settings: any }) =>
      images.export(imageId, settings),
    onSuccess: () => {
      toast.success('Export queued successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to queue export');
    },
  });
}
