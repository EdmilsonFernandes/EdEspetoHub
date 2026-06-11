import { useEffect, useRef, useState } from 'react';

/**
 * Hook that detects when an element enters the viewport
 * and triggers a one-time reveal state.
 * Uses IntersectionObserver for performance.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.12,
  rootMargin = '0px 0px -40px 0px'
) {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isRevealed };
}
