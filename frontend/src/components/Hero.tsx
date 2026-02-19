export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-gray-800 shadow-[0_30px_70px_-46px_rgba(15,23,42,0.7)] dark:shadow-[0_28px_70px_-48px_rgba(0,0,0,0.9)]">
          <div className="relative">
            <img
              src="/janocaminho.jpg"
              alt="Jano Caminho - Plataforma de pedidos"
              className="w-full h-[220px] sm:h-[320px] lg:h-[400px] object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-900/35 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7">
              <div className="max-w-2xl rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200 font-semibold">Jano Caminho</p>
                <p className="mt-1 text-sm sm:text-base font-black text-white">
                  Gestão de pedidos para mercado, farmácia, adega, food truck e restaurante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

