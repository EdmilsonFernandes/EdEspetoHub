type AppRobotLoaderProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
};

export function AppRobotLoader({
  eyebrow = 'Já no Caminho',
  title = 'Carregando experiência',
  subtitle = 'Preparando lojas, pedidos e rotas sem travar o app.',
  fullScreen = false,
  className = '',
}: AppRobotLoaderProps) {
  const content = (
    <div className={`jnc-robot-loader-card ${className}`} role="status" aria-live="polite">
      <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#5FD35A]/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-[#336886]/14 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <div className="jnc-robot-loader-orbit" />
        <div className="jnc-robot-loader-brand">
          <span className="jnc-robot-loader-antenna" />
          <span className="jnc-robot-loader-eye jnc-robot-loader-eye-left" />
          <span className="jnc-robot-loader-eye jnc-robot-loader-eye-right" />
          <img src="/janocaminho.jpg" alt="" className="h-12 w-12 rounded-[1rem] object-contain p-0.5" />
        </div>

        <div className="mt-5 h-10 w-64 max-w-full overflow-hidden rounded-full border border-white/80 bg-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
          <div className="jnc-robot-loader-route" />
          <span className="jnc-robot-loader-pin jnc-robot-loader-pin-one" />
          <span className="jnc-robot-loader-pin jnc-robot-loader-pin-two" />
          <span className="jnc-robot-loader-rider">
            <img src="/janocaminho.jpg" alt="" className="h-full w-full rounded-[0.55rem] object-contain" />
          </span>
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">{eyebrow}</p>
        <h2 className="mt-1 text-base font-black text-slate-900">{title}</h2>
        <p className="mt-1 max-w-[280px] text-xs font-semibold leading-relaxed text-slate-500">{subtitle}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#336886]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#5FD35A] [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8EC5DD] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#EEF2F7_0%,#F8FAFC_52%,#EEF2F7_100%)] px-4 py-[max(2rem,env(safe-area-inset-top))]">
      {content}
    </div>
  );
}
