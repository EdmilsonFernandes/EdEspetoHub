import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Buildings, ForkKnife, MapPin, Sparkle, Storefront, Truck, WifiSlash } from '@phosphor-icons/react';

const loadingSteps = [
  'Encontrando lojas por perto',
  'Preparando destinos e condomínios',
  'Sincronizando pedidos e entregas',
  'Abrindo o Já no Caminho',
];

const experienceCards = [
  { label: 'Lojas', icon: Storefront, className: 'left-0 top-[106px] text-[#8EC5DD]', delay: '0s' },
  { label: 'Destinos', icon: MapPin, className: 'left-[58px] top-3 text-[#5FD35A]', delay: '0.16s' },
  { label: 'Condomínios', icon: Buildings, className: 'right-[44px] top-5 text-[#8EC5DD]', delay: '0.32s' },
  { label: 'Entregas', icon: Truck, className: 'right-0 top-[112px] text-[#5FD35A]', delay: '0.48s' },
];

export function PremiumSplashScreen() {
  const isNativePlatform = Capacitor.isNativePlatform();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === 'undefined' ? false : !navigator.onLine));

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showDuration = isNativePlatform
      ? (prefersReducedMotion ? 260 : 950)
      : (prefersReducedMotion ? 850 : 2600);
    const fadeDuration = prefersReducedMotion ? 0 : isNativePlatform ? 260 : 480;

    const stepTimer = prefersReducedMotion
      ? 0
      : window.setInterval(() => {
          setStepIndex((current) => (current + 1) % loadingSteps.length);
        }, 620);

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, isOffline ? Math.max(showDuration, 3200) : showDuration);

    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, (isOffline ? Math.max(showDuration, 3200) : showDuration) + fadeDuration);

    return () => {
      if (stepTimer) window.clearInterval(stepTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [isNativePlatform, isOffline]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#0B0F1A] px-6 transition-opacity duration-500 ease-in-out motion-reduce:duration-0 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(51,104,134,0.2),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(95,211,90,0.1),transparent_34%),linear-gradient(180deg,#0B0F1A_0%,#0F1B2D_48%,#0B0F1A_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[14%] h-64 w-64 -translate-x-1/2 rounded-full bg-[#336886]/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] left-[12%] h-44 w-44 rounded-full bg-[#5FD35A]/8 blur-3xl" />
      <div className="splash-grid pointer-events-none absolute inset-0 opacity-[0.16]" />

      <div className="relative flex w-full max-w-[390px] flex-col items-center">
        <div className="splash-delivery-scene relative mb-7 h-[286px] w-full max-w-[370px] animate-in zoom-in-95 duration-700 motion-reduce:animate-none">
          <div className="absolute left-1/2 top-9 h-44 w-60 -translate-x-1/2 rounded-[3.5rem] bg-[#336886]/10 blur-2xl" />
          <div className="splash-orbit absolute left-1/2 top-[28px] h-[204px] w-[204px] -translate-x-1/2 rounded-full border border-white/10" />
          <div className="splash-orbit splash-orbit-secondary absolute left-1/2 top-[10px] h-[240px] w-[240px] -translate-x-1/2 rounded-full border border-dashed border-white/10" />

          <svg className="absolute left-1/2 top-[38px] h-[202px] w-[300px] -translate-x-1/2 overflow-visible" viewBox="0 0 300 202" fill="none">
            <path
              className="splash-map-route"
              d="M24 146 C74 74 116 176 158 94 C192 28 224 76 276 34"
              stroke="rgba(142,197,221,0.55)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="12 14"
            />
            <path
              className="splash-map-route-glow"
              d="M24 146 C74 74 116 176 158 94 C192 28 224 76 276 34"
              stroke="rgba(95,211,90,0.44)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="1 34"
            />
          </svg>

          {experienceCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`splash-experience-card absolute ${card.className}`}
                style={{ animationDelay: card.delay }}
              >
                <Icon size={18} weight="duotone" />
                <span>{card.label}</span>
              </div>
            );
          })}

          <div className="splash-brand-card absolute left-1/2 top-[76px] flex h-[86px] w-[86px] -translate-x-1/2 items-center justify-center rounded-[1.55rem] border border-white/10 bg-[linear-gradient(145deg,rgba(21,58,76,0.94),rgba(51,104,134,0.86))] shadow-[0_28px_62px_-34px_rgba(15,49,84,0.8)] ring-1 ring-[#336886]/10">
            <div className="absolute inset-2 rounded-[1.15rem] bg-[#336886]/10 blur-xl" />
            <span className="splash-robot-antenna absolute -top-3 left-1/2 h-5 w-[2px] -translate-x-1/2 rounded-full bg-[#5FD35A]/70" />
            <span className="splash-robot-eye absolute left-[26px] top-[27px] h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_12px_rgba(95,211,90,0.9)]" />
            <span className="splash-robot-eye splash-robot-eye-two absolute right-[26px] top-[27px] h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_12px_rgba(95,211,90,0.9)]" />
            <img
              src="/janocaminho.jpg"
              alt="Já no Caminho"
              className="relative h-[58px] w-[58px] rounded-[1.05rem] object-contain p-0.5 shadow-[0_12px_24px_-18px_rgba(15,49,84,0.72)]"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/janocaminho.jpg';
              }}
            />
          </div>

          <div className="absolute bottom-10 left-1/2 h-[62px] w-[306px] -translate-x-1/2 overflow-visible">
            <div className="absolute left-1/2 top-1/2 h-[46px] w-[286px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[999px] border border-white/10 bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur">
              <div className="splash-route absolute left-0 top-1/2 h-[3px] w-[620px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#8EC5DD_0_24px,transparent_24px_46px)] opacity-60" />
            </div>
            <div className="splash-route-rider absolute left-[42px] top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[0.86rem] bg-white p-1 shadow-[0_0_26px_rgba(95,211,90,0.66)] ring-2 ring-[#5FD35A]/60">
              <img
                src="/janocaminho.jpg"
                alt=""
                className="h-full w-full rounded-[0.58rem] object-contain"
              />
            </div>
            <div className="splash-pin absolute left-[82px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_20px_rgba(95,211,90,0.9)]" />
            <div className="splash-pin splash-pin-two absolute right-[68px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#8EC5DD] shadow-[0_0_18px_rgba(142,197,221,0.72)]" />
          </div>

          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 backdrop-blur">
            <ForkKnife size={12} weight="duotone" className="text-[#8EC5DD]" />
            pedidos
            <span className="h-1 w-1 rounded-full bg-slate-500" />
            <Sparkle size={12} weight="duotone" className="text-[#5FD35A]" />
            experiências locais
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[13px] font-black uppercase tracking-[0.28em] text-white">
            Já no Caminho
          </h1>
          <p className="splash-step-text max-w-[288px] text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
            {isOffline ? 'Sem internet agora, mantendo o app preparado' : loadingSteps[stepIndex]}
          </p>
        </div>

        <div
          className={`mt-7 flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_18px_48px_-34px_rgba(15,49,84,0.7)] backdrop-blur ${
            isOffline
              ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
              : 'border-white/10 bg-white/10 text-[#8EC5DD]'
          }`}
        >
          {isOffline ? (
            <WifiSlash size={13} weight="bold" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_14px_rgba(95,211,90,0.9)] motion-safe:animate-pulse" />
          )}
          {isOffline ? 'Aguardando conexão' : 'Conectando com segurança'}
        </div>
      </div>

      <style>{`
        @keyframes splash-brand-float {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-8px) scale(1.025); }
        }

        @keyframes splash-route {
          from { transform: translateX(0); }
          to { transform: translateX(-92px); }
        }

        @keyframes splash-rider {
          0% { transform: translate3d(0, -50%, 0) scale(0.96); }
          50% { transform: translate3d(168px, -50%, 0) scale(1.04); }
          100% { transform: translate3d(0, -50%, 0) scale(0.96); }
        }

        @keyframes splash-card-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-9px) rotate(2deg); }
        }

        @keyframes splash-orbit-spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }

        @keyframes splash-dash {
          to { stroke-dashoffset: -96; }
        }

        @keyframes splash-glow-hop {
          from { stroke-dashoffset: 0; opacity: 0.25; }
          50% { opacity: 0.68; }
          to { stroke-dashoffset: -180; opacity: 0.25; }
        }

        @keyframes splash-eye {
          0%, 88%, 100% { transform: scaleY(1); }
          92% { transform: scaleY(0.18); }
        }

        @keyframes splash-step {
          0% { opacity: 0.55; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .splash-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black, transparent 70%);
        }

        .splash-brand-card {
          animation: splash-brand-float 1.42s ease-in-out infinite;
        }

        .splash-route {
          animation: splash-route 0.86s linear infinite;
        }

        .splash-route-rider {
          animation: splash-rider 2.1s cubic-bezier(.7,0,.25,1) infinite;
        }

        .splash-orbit {
          animation: splash-orbit-spin 8s linear infinite;
        }

        .splash-orbit-secondary {
          animation-duration: 12s;
          animation-direction: reverse;
        }

        .splash-map-route {
          animation: splash-dash 1.4s linear infinite;
        }

        .splash-map-route-glow {
          animation: splash-glow-hop 1.9s ease-in-out infinite;
        }

        .splash-experience-card {
          align-items: center;
          animation: splash-card-float 1.65s ease-in-out infinite;
          backdrop-filter: blur(18px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1.15rem;
          box-shadow: 0 18px 40px -28px rgba(15, 49, 84, 0.72);
          display: flex;
          gap: 0.38rem;
          min-height: 2.45rem;
          padding: 0 0.72rem;
        }

        .splash-experience-card span {
          color: rgba(226, 232, 240, 0.88);
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .splash-robot-eye {
          animation: splash-eye 2.8s ease-in-out infinite;
          transform-origin: center;
        }

        .splash-robot-eye-two {
          animation-delay: 0.04s;
        }

        .splash-step-text {
          animation: splash-step 320ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-brand-card,
          .splash-route,
          .splash-route-rider,
          .splash-orbit,
          .splash-map-route,
          .splash-map-route-glow,
          .splash-experience-card,
          .splash-robot-eye,
          .splash-step-text {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
