import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Storefront, 
  Motorcycle, 
  CheckCircle, 
  QrCode, 
  Printer, 
  ShieldCheck 
} from '@phosphor-icons/react';

type StepType = 'client' | 'store' | 'courier';

export function HubFlowSimulator() {
  const [activeStep, setActiveStep] = useState<StepType>('client');

  // Auto-play the simulator every 6 seconds unless user interacts
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((current) => {
        if (current === 'client') return 'store';
        if (current === 'store') return 'courier';
        return 'client';
      });
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      id: 'client' as StepType,
      title: '1. Cliente Pede',
      shortTitle: 'Cliente',
      icon: ShoppingCart,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      description: 'Cardápio digital moderno e checkout rápido em 3 cliques. Pagamento Pix integrado com aprovação instantânea.'
    },
    {
      id: 'store' as StepType,
      title: '2. Loja Produz',
      shortTitle: 'Loja',
      icon: Storefront,
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      description: 'Painel gerencia os pedidos recebidos em tempo real. Impressão automática e envio direto para a cozinha.'
    },
    {
      id: 'courier' as StepType,
      title: '3. Entregador Leva',
      shortTitle: 'Entregador',
      icon: Motorcycle,
      color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
      description: 'O entregador aceita a corrida no app, coleta o pedido na loja e confirma a entrega com código de segurança PIN.'
    }
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      {/* Esquerda: Abas e Textos */}
      <div className="space-y-6">
        <div className="space-y-3 text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
            Fluxo Orquestrado
          </span>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl leading-tight">
            Como funciona a mágica do Já no Caminho
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
            Esqueça o improviso no WhatsApp. Um ecossistema completo que sincroniza as ações de todos em tempo real.
          </p>
        </div>

        {/* Abas */}
        <div className="flex flex-col gap-3.5 mt-6">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`relative flex items-start gap-4 rounded-2xl border p-4.5 text-left transition-all duration-300 backdrop-blur-md ${
                  isActive
                    ? 'border-white/16 bg-white/[0.06] shadow-[0_20px_40px_-20px_rgba(2,6,23,0.7)]'
                    : 'border-white/4 bg-transparent hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-gradient-to-b from-sky-400 to-emerald-400 rounded-r-full" />
                )}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${step.color}`}>
                  <Icon size={20} weight="duotone" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-base font-black transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-xs leading-relaxed font-medium transition-colors duration-200 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Direita: Mockup do Celular Dinâmico */}
      <div className="relative flex items-center justify-center">
        {/* Glow de Fundo */}
        <div className="pointer-events-none absolute -inset-10 rounded-full bg-gradient-to-tr from-sky-500/10 to-violet-500/10 blur-[80px]" />
        
        {/* Mockup do Celular */}
        <div className="relative w-full max-w-[310px] aspect-[9/19] rounded-[2.8rem] border-[6px] border-slate-800 bg-slate-950 p-2.5 shadow-[0_45px_100px_-35px_rgba(2,6,23,0.95)] ring-1 ring-white/10 overflow-hidden">
          {/* Câmera/Dynamic Island */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-slate-900 rounded-full z-20 border border-white/5 flex items-center justify-between px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
            <span className="h-1 w-8 rounded-full bg-slate-800" />
          </span>

          {/* Conteúdo Interno da Tela */}
          <div className="relative w-full h-full rounded-[2.1rem] overflow-hidden bg-slate-950 flex flex-col p-4 text-white">
            
            {/* Header do App Simulado */}
            <header className="flex items-center justify-between mt-4 mb-5 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg overflow-hidden border border-white/10 bg-white p-0.5">
                  <img src="/janocaminho.jpg" alt="Logo" className="h-full w-full object-cover rounded-md" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-white leading-none">Churrasco JNC</p>
                  <p className="text-[7.5px] font-bold text-emerald-400 mt-0.5">● Aberto agora</p>
                </div>
              </div>
              <span className="text-[8px] font-black uppercase bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                Mesa #04
              </span>
            </header>

            {/* Telas Dinâmicas baseadas no Estado */}
            <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
              
              {/* ESTADO 1: CLIENTE PEDE */}
              <div className={`flex-1 flex flex-col justify-between transition-all duration-500 absolute inset-0 ${
                activeStep === 'client' ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'
              }`}>
                <div className="space-y-3.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400">Sacola de Compras</p>
                  
                  {/* Item 1 */}
                  <div className="flex items-center justify-between gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                    <span className="h-9 w-9 rounded-lg bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center">
                      🍢
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black truncate">Espeto Alcatra Premium</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Quantidade: 2x</p>
                    </div>
                    <span className="text-[10px] font-black">R$ 29,80</span>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center justify-between gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                    <span className="h-9 w-9 rounded-lg bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center">
                      🥤
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black truncate">Guaraná Lata 350ml</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Quantidade: 1x</p>
                    </div>
                    <span className="text-[10px] font-black">R$ 6,00</span>
                  </div>

                  {/* Resumo */}
                  <div className="space-y-1.5 border-t border-dashed border-white/10 pt-2.5 text-[9px] font-semibold text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white">R$ 35,80</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Entrega</span>
                      <span className="text-emerald-400">Grátis</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-white pt-1">
                      <span>Total do Pedido</span>
                      <span className="text-emerald-400">R$ 35,80</span>
                    </div>
                  </div>
                </div>

                {/* Pagamento Pix Simulado */}
                <div className="space-y-2 pb-2">
                  <div className="flex items-center gap-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20 p-2.5">
                    <QrCode size={20} className="text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-[8.5px] font-black text-white leading-none">Pagamento via Pix</p>
                      <p className="text-[7.5px] text-cyan-300/80 mt-0.5">Código PIX Copia e Cola gerado</p>
                    </div>
                  </div>
                  <button type="button" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 text-[10px] font-black rounded-xl shadow-[0_12px_24px_-10px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5">
                    Finalizar e Pagar
                  </button>
                </div>
              </div>

              {/* ESTADO 2: LOJA PRODUZ */}
              <div className={`flex-1 flex flex-col justify-between transition-all duration-500 absolute inset-0 ${
                activeStep === 'store' ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'
              }`}>
                <div className="space-y-3.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">Painel Operacional</p>
                  
                  {/* Novo Pedido Piscando */}
                  <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2.5 animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-[9.5px] font-black text-white">PEDIDO RECEBIDO #1024</p>
                      <p className="text-[8px] text-slate-300 mt-0.5">Aprovado e pago via PIX</p>
                    </div>
                  </div>

                  {/* Etapas de Produção */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1">
                      <span>Status do Preparo</span>
                      <span className="text-amber-400">Na grelha (70%)</span>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <span className="block h-full w-[70%] bg-gradient-to-r from-amber-500 to-orange-400 rounded-full" />
                    </div>
                  </div>

                  {/* Informações de Impressão */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 space-y-2">
                    <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-300">
                      <Printer size={13} className="text-amber-400" />
                      <span>Impressão automática via Bluetooth</span>
                    </div>
                    <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-[8.5px] text-slate-400">
                      <span>Vias impressas: 2 (Cozinha e Caixa)</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="pb-2 space-y-2">
                  <div className="flex justify-between gap-2">
                    <button type="button" className="flex-1 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black rounded-lg">
                      Recusar
                    </button>
                    <button type="button" className="flex-1 py-2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-lg shadow-lg flex items-center justify-center gap-1">
                      <CheckCircle size={12} weight="bold" />
                      Pronto p/ Entrega
                    </button>
                  </div>
                </div>
              </div>

              {/* ESTADO 3: ENTREGADOR LEVA */}
              <div className={`flex-1 flex flex-col justify-between transition-all duration-500 absolute inset-0 ${
                activeStep === 'courier' ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'
              }`}>
                <div className="space-y-3.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-violet-400">App do Entregador</p>
                  
                  {/* Status do Rastreio */}
                  <div className="rounded-xl border border-violet-500/20 bg-violet-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-violet-300">Pedido Saiu para Entrega</span>
                      <span className="inline-flex h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                    </div>
                    <p className="text-[8.5px] text-slate-300 leading-normal">
                      Entregador <span className="font-bold text-white">Carlos Silva</span> coletou seu pedido e está a caminho.
                    </p>
                  </div>

                  {/* Rota do Mapa Simulado */}
                  <div className="relative h-20 rounded-xl overflow-hidden border border-white/5 bg-slate-900 flex items-center justify-center">
                    {/* Linha de rota simulada */}
                    <span className="absolute h-0.5 w-24 bg-dashed border-t border-violet-400/50" />
                    <span className="absolute left-8 h-4.5 w-4.5 rounded-full bg-white/10 flex items-center justify-center">
                      🏠
                    </span>
                    <span className="absolute right-8 h-4.5 w-4.5 rounded-full bg-white/10 flex items-center justify-center animate-bounce">
                      🛵
                    </span>
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded-full border border-white/5 text-[7.5px] font-semibold text-slate-300">
                      Chegada em 4 min
                    </div>
                  </div>

                  {/* Código PIN Segura */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-violet-400 shrink-0" />
                      <div>
                        <p className="text-[8.5px] font-black text-white leading-none">Código de Segurança PIN</p>
                        <p className="text-[7px] text-slate-400 mt-0.5">Informe ao entregador na entrega</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-violet-300 border border-violet-500/20 bg-violet-500/5 px-2 py-1 rounded">
                      4821
                    </span>
                  </div>
                </div>

                <div className="pb-2">
                  <a href={`https://wa.me/551239334979`} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-black rounded-xl shadow-[0_12px_24px_-10px_rgba(139,92,246,0.4)] flex items-center justify-center gap-1.5">
                    Falar com Entregador
                  </a>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
