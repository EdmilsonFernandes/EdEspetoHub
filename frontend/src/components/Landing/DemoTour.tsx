// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ClipboardList, ShoppingCart } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DemoTour({ open, onClose }: Props) {
  const navigate = useNavigate();
  const steps = useMemo(
    () => [
      {
        id: 'setup',
        title: 'Cadastro em 3 minutos',
        description:
          'Defina o nome da loja, cores e cadastre seus produtos. O cardapio ja fica pronto para receber pedidos.',
        ctaLabel: 'Abrir cadastro',
        action: () => navigate('/create'),
        icon: ClipboardList,
        highlight: 'Identidade + produtos',
      },
      {
        id: 'orders',
        title: 'Pedido no cardapio',
        description:
          'O cliente escolhe, finaliza o pedido e envia para voce. Tudo organizado e pronto para produzir.',
        ctaLabel: 'Abrir cardapio demo',
        action: () => navigate('/chamanoespeto/demo'),
        icon: ShoppingCart,
        highlight: 'Fluxo do cliente',
      },
      {
        id: 'queue',
        title: 'Fila e dashboard',
        description:
          'A fila do churrasqueiro atualiza quase em tempo real. O painel mostra pedidos e resultado do dia.',
        ctaLabel: 'Abrir painel demo',
        action: () => navigate('/admin/demo'),
        icon: ChefHat,
        highlight: 'Operacao ao vivo',
      },
    ],
    [navigate]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const active = steps[activeIndex];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <aside className="md:w-1/3 bg-gray-50 dark:bg-gray-800 p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Tour interativo</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-2">Como funciona</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Clique nos passos para explorar o fluxo real da plataforma.
              </p>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveIndex(index)}
                    className={`w-full text-left p-4 rounded-2xl border transition ${
                      isActive
                        ? 'border-red-500 bg-white dark:bg-gray-900 shadow-md'
                        : 'border-transparent bg-white/60 dark:bg-gray-900/60 hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Passo {index + 1}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          <main className="flex-1 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Passo {activeIndex + 1} de 3</p>
                <h4 className="text-2xl font-black text-gray-900 dark:text-white mt-2">{active.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{active.description}</p>
              </div>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">{active.highlight}</span>
                <span className="text-xs text-gray-400">Chama no Espeto</span>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-white/80 dark:bg-gray-900/60">
                  <p className="text-xs text-gray-500">Resumo rapido</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{active.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{active.description}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-red-200 dark:border-red-900 p-4">
                  <p className="text-xs text-gray-500">Proximo ganho</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-2">
                    Menos erros, fila organizada e mais pedidos
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Em poucos cliques voce mostra ao cliente como tudo funciona.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {steps.map((step, index) => (
                  <span
                    key={step.id}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index === activeIndex ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    onClose();
                    active.action();
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  {active.ctaLabel}
                </button>
                <button
                  onClick={() => setActiveIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  disabled={activeIndex === steps.length - 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Proximo
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
