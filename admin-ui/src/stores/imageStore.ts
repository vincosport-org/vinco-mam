import { create } from 'zustand';

interface ImageFilters {
  search?: string;
  photographerId?: string;
  eventId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ImageStore {
  filters: ImageFilters;
  selectedImages: string[];
  setFilters: (filters: Partial<ImageFilters>) => void;
  toggleImageSelection: (imageId: string) => void;
  clearSelection: () => void;
  selectAll: (imageIds: string[]) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  filters: {},
  selectedImages: [],
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  toggleImageSelection: (imageId) =>
    set((state) => ({
      selectedImages: state.selectedImages.includes(imageId)
        ? state.selectedImages.filter((id) => id !== imageId)
        : [...state.selectedImages, imageId],
    })),
  clearSelection: () => set({ selectedImages: [] }),
  selectAll: (imageIds) => set({ selectedImages: imageIds }),
}));
