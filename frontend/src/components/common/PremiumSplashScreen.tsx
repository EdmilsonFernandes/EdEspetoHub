import { useEffect, useState } from 'react';

export function PremiumSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showDuration = prefersReducedMotion ? 700 : 1800;
    const fadeDuration = prefersReducedMotion ? 0 : 450;

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, showDuration);

    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, showDuration + fadeDuration);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F8F9FB] transition-opacity duration-500 ease-in-out motion-reduce:duration-0 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(51,104,134,0.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(95,211,90,0.10),transparent_34%),linear-gradient(180deg,#F8F9FB_0%,#FFFFFF_52%,#F8F9FB_100%)]" />

      <div className="relative flex flex-col items-center">
        <div className="relative mb-6 h-24 w-24 animate-in zoom-in-90 duration-700 motion-reduce:animate-none">
          <div className="absolute inset-2 rounded-[1.75rem] bg-[#336886]/15 blur-2xl motion-safe:animate-pulse" />
          <img
            src="/janocaminho-logo.png"
            alt="Já no Caminho"
            className="relative h-full w-full object-contain"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/logo.svg';
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-sm font-black uppercase tracking-[0.24em] text-[#336886] motion-safe:animate-pulse">
            Já no Caminho
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Conectando você ao sabor
          </p>
        </div>

        <div className="absolute bottom-[-40px] h-[2px] w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="relative h-full bg-[#336886] motion-safe:animate-[splash-progress_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes splash-progress {
          0% { width: 0%; left: 0%; }
          50% { width: 70%; left: 15%; }
          100% { width: 0%; left: 100%; }
        }
      `}</style>
    </div>
  );
}
