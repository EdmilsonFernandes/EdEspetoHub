import { useEffect, useState } from 'react';

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

      <div className="relative flex w-full max-w-[360px] flex-col items-center">
        <div className="splash-delivery-scene relative mb-7 h-[190px] w-full max-w-[330px] animate-in zoom-in-95 duration-700 motion-reduce:animate-none">
          <div className="absolute left-1/2 top-5 h-28 w-52 -translate-x-1/2 rounded-full bg-white/80 blur-2xl" />
          <div className="splash-sun absolute right-9 top-4 h-10 w-10 rounded-full bg-[#B6E36F]/70 shadow-[0_0_42px_rgba(182,227,111,0.65)]" />
          <div className="splash-cloud splash-cloud-one absolute left-3 top-10 h-5 w-16 rounded-full bg-white/75 shadow-[22px_5px_0_rgba(255,255,255,0.72)]" />
          <div className="splash-cloud splash-cloud-two absolute right-5 top-20 h-4 w-12 rounded-full bg-white/68 shadow-[18px_4px_0_rgba(255,255,255,0.66)]" />

          <div className="splash-moto absolute left-1/2 top-14 h-[104px] w-[214px] -translate-x-1/2">
            <div className="absolute left-[72px] top-[2px] h-11 w-16 rounded-[48%_52%_46%_48%] border-[5px] border-[#0B2447] bg-[#EAF4FA] shadow-[inset_0_-10px_0_rgba(51,104,134,0.1)]">
              <div className="absolute -left-1 top-5 h-8 w-3 rounded-l-full bg-[#EAF4FA]" />
              <div className="absolute -right-1 top-5 h-8 w-3 rounded-r-full bg-[#EAF4FA]" />
              <div className="absolute left-[12px] top-[15px] h-3 w-3 rounded-full bg-[#48A9D6]" />
              <div className="absolute right-[12px] top-[15px] h-3 w-3 rounded-full bg-[#48A9D6]" />
              <div className="absolute left-1/2 top-[34px] h-3 w-8 -translate-x-1/2 rounded-sm border border-[#D7E3EB] bg-white" />
            </div>
            <div className="absolute left-[63px] -top-[16px] h-14 w-[86px] rounded-t-[44px] border-[5px] border-[#0B2447] bg-[#7FBD44] shadow-[inset_0_-12px_0_rgba(11,36,71,0.08)]">
              <div className="absolute left-[34px] -top-5 h-5 w-8 rounded-t-full bg-[#7FBD44]" />
              <div className="absolute left-[10px] top-[30px] h-5 w-[68px] rounded-[50%] bg-[#8CCF4B]" />
            </div>
            <div className="absolute left-[54px] top-[52px] h-12 w-[106px] rounded-[2rem] bg-[#0F3154] shadow-[0_15px_24px_-18px_rgba(11,36,71,0.9)]" />
            <div className="absolute left-[23px] top-[62px] h-10 w-10 rounded-full border-[7px] border-[#0F3154] bg-[#F7FAFC] shadow-[inset_0_0_0_3px_rgba(51,104,134,0.14)]" />
            <div className="absolute right-[25px] top-[62px] h-10 w-10 rounded-full border-[7px] border-[#0F3154] bg-[#F7FAFC] shadow-[inset_0_0_0_3px_rgba(51,104,134,0.14)]" />
            <div className="absolute left-[48px] top-[58px] h-6 w-20 rounded-t-full bg-[#5FD35A]" />
            <div className="absolute right-[35px] top-[45px] h-4 w-11 rotate-12 rounded-full bg-[#0F3154]" />
            <div className="absolute right-[24px] top-[43px] h-4 w-4 rounded-full bg-[#C8F06E] shadow-[0_0_18px_rgba(200,240,110,0.85)]" />
            <div className="absolute left-[5px] top-[76px] h-[3px] w-9 rounded-full bg-[#336886]/30" />
          </div>

          <div className="absolute bottom-7 left-1/2 h-[4px] w-[280px] -translate-x-1/2 overflow-hidden rounded-full bg-[#D8E7EE]">
            <div className="splash-road-stripes h-full w-[520px] bg-[repeating-linear-gradient(90deg,#336886_0_26px,transparent_26px_54px)] opacity-55" />
          </div>
          <div className="absolute bottom-0 left-1/2 h-6 w-44 -translate-x-1/2 rounded-[50%] bg-[#0B2447]/10 blur-md" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[13px] font-black uppercase tracking-[0.28em] text-[#0F3154]">
            Já no Caminho
          </h1>
          <p className="max-w-[260px] text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
            Preparando sua rota de sabores
          </p>
        </div>

        <div className="mt-7 flex items-center gap-2 rounded-full border border-white/80 bg-white/74 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_18px_48px_-34px_rgba(15,49,84,0.7)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_14px_rgba(95,211,90,0.9)] motion-safe:animate-pulse" />
          Conectando com segurança
        </div>
      </div>

      <style>{`
        @keyframes splash-ride {
          0%, 100% { transform: translateX(-50%) translateY(0) rotate(-1deg); }
          50% { transform: translateX(-50%) translateY(-8px) rotate(1.5deg); }
        }

        @keyframes splash-road {
          from { transform: translateX(0); }
          to { transform: translateX(-108px); }
        }

        @keyframes splash-cloud {
          0% { transform: translateX(18px); opacity: 0; }
          12%, 82% { opacity: 1; }
          100% { transform: translateX(-28px); opacity: 0; }
        }

        @keyframes splash-sun {
          0%, 100% { transform: scale(1); opacity: 0.78; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .splash-moto {
          animation: splash-ride 1.05s ease-in-out infinite;
          transform-origin: 50% 80%;
        }

        .splash-road-stripes {
          animation: splash-road 0.72s linear infinite;
        }

        .splash-cloud {
          animation: splash-cloud 2.3s ease-in-out infinite;
        }

        .splash-cloud-two {
          animation-delay: 0.65s;
        }

        .splash-sun {
          animation: splash-sun 1.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-moto,
          .splash-road-stripes,
          .splash-cloud,
          .splash-sun {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
