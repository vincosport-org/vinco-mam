import { create } from 'zustand';

interface ValidationStore {
  currentIndex: number;
  filter: 'all' | 'pending' | 'claimed';
  setCurrentIndex: (index: number) => void;
  setFilter: (filter: 'all' | 'pending' | 'claimed') => void;
  next: () => void;
  previous: () => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  currentIndex: 0,
  filter: 'pending',
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setFilter: (filter) => set({ filter, currentIndex: 0 }),
  next: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
  previous: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
}));
