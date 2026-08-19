import { useEffect, useState } from 'react';

const SEARCH_PLACEHOLDERS = [
  'Buscar espetinho...',
  'Buscar hambúrguer...',
  'Buscar loja ou produto...',
  'Buscar churrasco...',
  'Buscar bebida...',
  'Buscar sobremesa...',
];

const normalizeTerm = (term: string) =>
  term
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 28);

/**
 * Sugestões dinâmicas vindas do catálogo real (categorias/produtos da região)
 * substituem as fixas quando disponíveis — placeholder nunca promete o que
 * a região não tem.
 */
export function useHubSearchPlaceholder(isPaused: boolean, dynamicTerms?: string[]) {
  // Auditoria 2 (18/08): o repouso da busca é uma pergunta humana — a rotação
  // pelo catálogo real continua ensinando o que existe na região.
  const pool = [
    'O que você procura hoje?',
    ...(Array.isArray(dynamicTerms) && dynamicTerms.length > 0
      ? Array.from(
          new Set(
            dynamicTerms
              .map(normalizeTerm)
              .filter(Boolean),
          ),
        ).slice(0, 6)
      : SEARCH_PLACEHOLDERS
    ).map((term) => (term.toLowerCase().startsWith('buscar ') ? term : `Buscar ${term.toLowerCase()}...`)),
  ];

  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const [searchPlaceholderVisible, setSearchPlaceholderVisible] = useState(true);

  useEffect(() => {
    if (isPaused) return;

    let transitionTimer: number | null = null;
    const cycle = window.setInterval(() => {
      setSearchPlaceholderVisible(false);
      transitionTimer = window.setTimeout(() => {
        setSearchPlaceholderIndex((index) => (index + 1) % pool.length);
        setSearchPlaceholderVisible(true);
      }, 350);
    }, 2800);

    return () => {
      window.clearInterval(cycle);
      if (transitionTimer != null) window.clearTimeout(transitionTimer);
    };
  }, [isPaused, pool.length]);

  // Ao trocar o pool (catálogo carregou), reinicia no primeiro termo real
  useEffect(() => {
    setSearchPlaceholderIndex(0);
  }, [pool.join('|')]);

  return {
    searchPlaceholder: pool[searchPlaceholderIndex] ?? SEARCH_PLACEHOLDERS[0],
    searchPlaceholderVisible,
  };
}
