import { useEffect, useState } from 'react';
import { ForkKnife, Package, Sparkle, TShirt } from '@phosphor-icons/react';

export function PremiumSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showDuration = prefersReducedMotion ? 700 : 2100;
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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#F7FAFC] px-6 transition-opacity duration-500 ease-in-out motion-reduce:duration-0 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(95,211,90,0.15),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(51,104,134,0.16),transparent_34%),linear-gradient(180deg,#F7FAFC_0%,#FFFFFF_48%,#EDF6F8_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[16%] h-56 w-56 -translate-x-1/2 rounded-full bg-[#336886]/10 blur-3xl" />

      <div className="relative flex w-full max-w-[320px] flex-col items-center">
        <div className="splash-delivery-scene relative mb-7 h-[220px] w-full max-w-[300px] animate-in zoom-in-95 duration-700 motion-reduce:animate-none">
          <div className="absolute left-1/2 top-7 h-40 w-52 -translate-x-1/2 rounded-[3rem] bg-white/72 blur-2xl" />
          <div className="splash-orbit absolute left-1/2 top-[24px] h-[168px] w-[168px] -translate-x-1/2 rounded-full border border-[#336886]/10" />

          <div className="splash-category splash-category-food absolute left-4 top-[108px] text-[#336886]">
            <ForkKnife size={19} weight="duotone" />
          </div>
          <div className="splash-category splash-category-drink absolute right-4 top-[108px] text-[#5CA536]">
            <Package size={19} weight="duotone" />
          </div>
          <div className="splash-category splash-category-beauty absolute left-16 top-9 text-[#336886]">
            <Sparkle size={19} weight="duotone" />
          </div>
          <div className="splash-category splash-category-bag absolute right-16 top-9 text-[#5CA536]">
            <TShirt size={19} weight="duotone" />
          </div>

          <div className="splash-brand-card absolute left-1/2 top-[64px] flex h-[96px] w-[96px] -translate-x-1/2 items-center justify-center rounded-[1.8rem] border border-white/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(232,245,246,0.88))] shadow-[0_30px_70px_-34px_rgba(15,49,84,0.75)] ring-1 ring-[#336886]/10">
            <div className="absolute inset-2.5 rounded-[1.35rem] bg-[#336886]/10 blur-xl" />
            <img
              src="/janocaminho.jpg"
              alt="Já no Caminho"
              className="relative h-[70px] w-[70px] rounded-[1.2rem] object-contain p-1 shadow-[0_16px_32px_-18px_rgba(15,49,84,0.72)]"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/janocaminho-logo.png';
              }}
            />
          </div>

          <div className="absolute bottom-10 left-1/2 h-[34px] w-[232px] -translate-x-1/2 overflow-hidden rounded-[999px] border border-white/80 bg-white/58 shadow-[inset_0_0_0_1px_rgba(51,104,134,0.08)] backdrop-blur">
            <div className="splash-route absolute left-0 top-1/2 h-[3px] w-[560px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#336886_0_24px,transparent_24px_45px)] opacity-42" />
            <div className="splash-pin absolute left-[46px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_20px_rgba(95,211,90,0.9)]" />
            <div className="splash-pin splash-pin-two absolute right-[48px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#336886] shadow-[0_0_18px_rgba(51,104,134,0.55)]" />
          </div>
          <div className="absolute bottom-2 left-1/2 h-6 w-44 -translate-x-1/2 rounded-[50%] bg-[#0B2447]/10 blur-md" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[13px] font-black uppercase tracking-[0.28em] text-[#0F3154]">
            Já no Caminho
          </h1>
          <p className="max-w-[260px] text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
            Preparando lojas, produtos e entregas
          </p>
        </div>

        <div className="mt-7 flex items-center gap-2 rounded-full border border-white/80 bg-white/74 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_18px_48px_-34px_rgba(15,49,84,0.7)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_14px_rgba(95,211,90,0.9)] motion-safe:animate-pulse" />
          Conectando com segurança
        </div>
      </div>

      <style>{`
        @keyframes splash-brand-float {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-7px) scale(1.02); }
        }

        @keyframes splash-route {
          from { transform: translateX(0); }
          to { transform: translateX(-90px); }
        }

        @keyframes splash-category-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }

        @keyframes splash-orbit-spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }

        .splash-brand-card {
          animation: splash-brand-float 1.35s ease-in-out infinite;
        }

        .splash-route {
          animation: splash-route 0.9s linear infinite;
        }

        .splash-orbit {
          animation: splash-orbit-spin 8s linear infinite;
        }

        .splash-category {
          align-items: center;
          animation: splash-category-float 1.6s ease-in-out infinite;
          backdrop-filter: blur(16px);
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 1.1rem;
          box-shadow: 0 18px 38px -28px rgba(15, 49, 84, 0.72);
          display: flex;
          height: 2.35rem;
          justify-content: center;
          width: 2.35rem;
        }

        .splash-category-drink {
          animation-delay: 0.18s;
        }

        .splash-category-beauty {
          animation-delay: 0.34s;
        }

        .splash-category-bag {
          animation-delay: 0.52s;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-brand-card,
          .splash-route,
          .splash-orbit,
          .splash-category {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
