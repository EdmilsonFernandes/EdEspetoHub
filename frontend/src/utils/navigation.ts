import type { NavigateFunction } from 'react-router-dom';

export const navigateBackOrFallback = (
  navigate: NavigateFunction,
  fallbackPath: string,
  options?: { replace?: boolean }
) => {
  if (typeof window !== 'undefined') {
    const historyIndex = Number(window.history.state?.idx);
    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }
  }

  navigate(fallbackPath, { replace: options?.replace ?? true });
};
