import { useEffect, useCallback } from 'react';

interface UseHotkeyOptions {
  onTrigger: () => void;
  enabled?: boolean;
}

/**
 * Hook to listen for Ctrl+Enter / Cmd+Enter hotkey to trigger generation
 */
export function useHotkey({ onTrigger, enabled = true }: UseHotkeyOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check for Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const isEnterPressed = event.key === 'Enter';

      if (isModifierPressed && isEnterPressed) {
        event.preventDefault();
        onTrigger();
      }
    },
    [onTrigger, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
