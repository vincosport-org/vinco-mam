/**
 * Keyboard shortcut mappings
 */

export const keyboardShortcuts = {
  // Global
  search: { key: 'k', ctrl: true },
  escape: { key: 'Escape' },
  
  // Image Editor
  save: { key: 's', ctrl: true },
  reset: { key: 'r', ctrl: true },
  export: { key: 'e', ctrl: true, shift: true },
  beforeAfter: { key: 'z' },
  crop: { key: 'c' },
  versions: { key: 'h' },
  
  // Validation
  approve: { key: 'y' },
  reject: { key: 'n' },
  reassign: { key: 'r' },
  next: { key: 'j' },
  previous: { key: 'k' },
  
  // Navigation
  gallery: { key: 'g', ctrl: true },
  validation: { key: 'v', ctrl: true },
  athletes: { key: 'a', ctrl: true },
  albums: { key: 'l', ctrl: true },
};

export function getShortcutDisplay(shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('⌘');
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push('⌥');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('');
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.altKey === !!shortcut.alt
  );
}
