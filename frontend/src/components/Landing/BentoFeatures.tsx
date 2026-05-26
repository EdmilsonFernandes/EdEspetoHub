import { 
  ListChecks, 
  Motorcycle, 
  CreditCard, 
  ShieldCheck, 
  Buildings, 
  QrCode, 
  Sparkle 
} from '@phosphor-icons/react';

export function BentoFeatures() {
  const ctaPrimaryHref = 'https://wa.me/551239334979?text=Olá,%20quero%20saber%20mais%20sobre%20o%20Já%20no%20Caminho';

  return (
    <div className="space-y-12">
      {/* Header da Seção */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
          <Sparkle size={12} weight="fill" className="text-emerald-400 animate-pulse" />
          Tudo Incluso no Hub
        </span>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          Tudo o que sua operação precisa em um único lugar
        </h2>
        <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
          Sem ferramentas fragmentadas. Centralize seus pedidos, pagamentos, entregadores e captação de clientes locais.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        
        {/* Card 1: Cardápio Digital (Double Column on Large) */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          {/* Spotlight Effect Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <ListChecks size={24} weight="duotone" />
            </div>
            <span className="rounded-full border border-sky-400/20 bg-sky-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-300">
              0% Taxas por Pedido
            </span>
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">Cardápio Digital Inteligente</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              Um link profissional pronto para WhatsApp e Instagram. Seus clientes pedem com facilidade, escolhem adicionais e finalizam em instantes, sem comissão por pedido.
            </p>
          </div>

          {/* Mini-showcase visual */}
          <div className="mt-6 flex flex-wrap gap-2.5 border-t border-white/5 pt-5">
            {['Adicionais Condicionais', 'Horários Automáticos', 'Gestão de Estoque', 'Pedidos Balcão/Mesa'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-300 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-full">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Gestão de Entregadores */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
            <Motorcycle size={24} weight="duotone" />
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">Entregadores Conectados</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
              Vincule sua própria frota ou motoqueiros parceiros. O sistema gera a corrida, notifica os entregadores via app e faz a distribuição automática do pedido.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 flex items-center justify-between text-[11px] font-black uppercase text-violet-300">
            <span>Rastreio de Localização</span>
            <span>App Dedicado</span>
          </div>
        </div>

        {/* Card 3: Pagamento MP Direto (Double Column on Large) */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <CreditCard size={24} weight="duotone" />
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
              Mercado Pago Integrado
            </span>
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">Pagamento Direto na sua Conta</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              Integração direta com o Mercado Pago da própria loja. O cliente paga via Pix, crédito ou débito no fluxo do checkout e o dinheiro cai na hora no seu saldo, sem intermediários ou atrasos.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 flex flex-wrap gap-2.5">
            {['Segurança SSL', 'Taxas Oficiais MP', 'Pix Pix Copia/Cola', 'Estorno em 1 clique'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-300 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-full">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Card 4: PIN de Segurança */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <ShieldCheck size={24} weight="duotone" />
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">PIN de Segurança</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
              Evite golpes e desentendimentos. O cliente gera um código PIN de 4 dígitos e fornece ao entregador, confirmando eletronicamente que o pedido foi entregue com sucesso.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 flex items-center justify-between text-[11px] font-black uppercase text-indigo-300">
            <span>Controle Antifraude</span>
            <span>Validação Real</span>
          </div>
        </div>

        {/* Card 5: Condomínios e Feiras */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Buildings size={24} weight="duotone" />
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">Condomínios & Feiras</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
              Crie vitrines hiperlocais. O morador acessa a página do condomínio, faz o pedido nas barracas ou feiras participantes e agenda a retirada ou entrega de forma unificada.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 flex items-center justify-between text-[11px] font-black uppercase text-emerald-300">
            <span>Marketplace Fechado</span>
            <span>Venda Hiperlocal</span>
          </div>
        </div>

        {/* Card 6: Hospedagens e Turismo */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.8))] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-[60px] transition-transform group-hover:scale-125" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <QrCode size={24} weight="duotone" />
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
              Turismo & Guias Locais
            </span>
          </div>

          <div className="mt-8 space-y-2">
            <h3 className="text-xl font-black text-white leading-tight">Chalés e Pousadas Inteligentes</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              Disponibilize QR Codes nos chalés e recepções de pousadas. O hóspede escaneia, acessa o Já no Caminho e visualiza imediatamente quais estabelecimentos locais e entregadores atendem aquela região geográfica.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 flex flex-wrap gap-2.5">
            {['Indicação Geográfica', 'Cardápios do Entorno', 'Agendamento de Passeios', 'Fidelidade Turista'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-300 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-full">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Mini CTA abaixo do Grid */}
      <div className="text-center pt-4">
        <a 
          href={ctaPrimaryHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4.5 text-sm font-black text-slate-950 shadow-[0_20px_40px_-15px_rgba(255,255,255,0.15)] ring-1 ring-white/10 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Falar com Consultor no WhatsApp
          <span className="text-emerald-500">→</span>
        </a>
      </div>
    </div>
  );
}
