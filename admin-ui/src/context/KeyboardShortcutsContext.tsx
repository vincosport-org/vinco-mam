import React, { createContext, ReactNode } from 'react';

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  // Keyboard shortcuts are handled via react-hotkeys-hook in individual components
  return <>{children}</>;
}
