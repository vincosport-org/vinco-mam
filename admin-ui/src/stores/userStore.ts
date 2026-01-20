import { create } from 'zustand';

interface User {
  id: number;
  displayName: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'CONTENT_TEAM' | 'PHOTOGRAPHER' | 'VIEWER';
}

interface UserState {
  user: User | null;
  capabilities: string[];
  setUser: (user: User) => void;
  setCapabilities: (capabilities: string[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  capabilities: [],
  setUser: (user) => set({ user }),
  setCapabilities: (capabilities) => set({ capabilities }),
}));
