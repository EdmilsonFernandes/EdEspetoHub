export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-gray-800 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.7)] dark:shadow-[0_28px_70px_-48px_rgba(0,0,0,0.9)]">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-200/50 dark:bg-sky-900/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-emerald-200/45 dark:bg-emerald-900/30 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-900/90 p-2">
              <img
                src="/janocaminho.jpg"
                alt="Jano Caminho - Plataforma de pedidos"
                className="w-full h-[180px] sm:h-[240px] lg:h-[300px] object-contain object-center rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

