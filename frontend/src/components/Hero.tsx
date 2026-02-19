export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-gray-800 shadow-[0_30px_70px_-46px_rgba(15,23,42,0.7)] dark:shadow-[0_28px_70px_-48px_rgba(0,0,0,0.9)]">
          <div className="relative bg-slate-950">
            <img
              src="/janocaminho.jpg"
              alt="Jano Caminho - Plataforma de pedidos"
              className="w-full h-[220px] sm:h-[320px] lg:h-[400px] object-contain object-center p-2 sm:p-4"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-slate-900/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

