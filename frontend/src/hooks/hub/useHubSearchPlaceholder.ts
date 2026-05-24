import { useEffect, useState } from 'react';

const SEARCH_PLACEHOLDERS = [
  'Buscar espetinho...',
  'Buscar hambúrguer...',
  'Buscar loja ou produto...',
  'Buscar churrasco...',
  'Buscar bebida...',
  'Buscar sobremesa...',
];

export function useHubSearchPlaceholder(isPaused: boolean) {
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const [searchPlaceholderVisible, setSearchPlaceholderVisible] = useState(true);

  useEffect(() => {
    if (isPaused) return;

    let transitionTimer: number | null = null;
    const cycle = window.setInterval(() => {
      setSearchPlaceholderVisible(false);
      transitionTimer = window.setTimeout(() => {
        setSearchPlaceholderIndex((index) => (index + 1) % SEARCH_PLACEHOLDERS.length);
        setSearchPlaceholderVisible(true);
      }, 350);
    }, 2800);

    return () => {
      window.clearInterval(cycle);
      if (transitionTimer != null) window.clearTimeout(transitionTimer);
    };
  }, [isPaused]);

  return {
    searchPlaceholder: SEARCH_PLACEHOLDERS[searchPlaceholderIndex],
    searchPlaceholderVisible,
  };
}
