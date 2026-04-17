
import { CaretRight, MagnifyingGlass, UserCircle, Buildings, House, Receipt, Heart, Storefront } from '@phosphor-icons/react';

export function PremiumHomePrototype() {
  return (
    <div className="relative min-h-screen bg-slate-50 font-sans pb-24">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#336886]/10 blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] h-72 w-72 rounded-full bg-emerald-100/40 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <header className="px-5 pt-[env(safe-area-inset-top,1.5rem)] pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 transition-transform active:scale-95">
                  <UserCircle size={24} className="text-[#336886]" weight="duotone" />
                </div>
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-50 bg-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#336886]/70">Bom dia</p>
                <h1 className="text-lg font-black tracking-tight text-slate-900">Edmilson</h1>
              </div>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 active:scale-95">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
              </span>
            </button>
          </div>

          {/* SEARCH BAR PREMIUM */}
          <div className="group relative w-full overflow-hidden rounded-[1.6rem] border border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.6)_100%)] p-1 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all focus-within:border-[#336886]/20 focus-within:shadow-[0_16px_40px_-16px_rgba(51,104,134,0.15)]">
            <div className="absolute inset-0 bg-white/40" />
            <div className="relative flex items-center">
              <div className="pl-4 pr-2 text-slate-400">
                <MagnifyingGlass size={20} weight="bold" />
              </div>
              <div className="w-full h-12 flex items-center text-sm font-semibold text-slate-500">
                O que você quer comer hoje?
              </div>
            </div>
          </div>
        </header>



        {/* HORIZONTAL CHIPS (Squircles) */}
        <section className="mb-8">
          <div className="flex px-5 gap-3 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
            {['🔥 Churrasco', '🍔 Burgers', '🍕 Pizzas', '🥤 Bebidas', '🍰 Doces'].map((cat, i) => (
              <button key={i} className={`snap-center flex shrink-0 items-center justify-center rounded-[1.2rem] border px-5 py-3 shadow-sm transition-all active:scale-95 ${i === 0 ? 'border-[#336886]/20 bg-[#336886]/5 text-[#336886]' : 'border-white bg-white/70 text-slate-600 backdrop-blur-md'}`}>
                <span className="text-sm font-bold">{cat}</span>
              </button>
            ))}
          </div>
        </section>

        {/* STORE CARDS */}
        <section className="px-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-slate-900">Em destaque</h3>
            <span className="text-xs font-bold text-[#336886]">Ver tudo</span>
          </div>

          <div className="grid gap-4">
            {[1, 2].map((store) => (
              <div key={store} className="group relative flex items-center gap-4 overflow-hidden rounded-[1.7rem] border border-white/60 bg-white/50 p-3 shadow-[0_12px_24px_-12px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all active:scale-95">
                <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-[1.2rem] bg-slate-200">
                  <div className="absolute inset-0 grid place-items-center bg-slate-100 text-slate-300">
                    <Storefront size={32} weight="duotone" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">Aberto</span>
                    <span className="text-xs font-bold text-slate-400">4.9 ★</span>
                  </div>
                  <h4 className="truncate text-base font-black text-slate-900">EdEspeto Hub</h4>
                  <p className="truncate text-xs font-medium text-slate-500">Carnes premium, Porções, Bebidas</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* BOTTOM NAVIGATION MAC-STYLE */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.92)_100%)] shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] backdrop-blur-3xl pb-[env(safe-area-inset-bottom,0.5rem)]">
        <div className="grid h-[4.5rem] grid-cols-4 items-center px-2">
          <button className="flex flex-col items-center justify-center gap-1 text-[#336886]">
            <House size={24} weight="fill" />
            <span className="text-[10px] font-bold">Início</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors">
            <Receipt size={24} weight="regular" />
            <span className="text-[10px] font-semibold">Pedidos</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors">
            <Buildings size={24} weight="regular" />
            <span className="text-[10px] font-semibold">Condo</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors">
            <Heart size={24} weight="regular" />
            <span className="text-[10px] font-semibold">Favoritos</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
