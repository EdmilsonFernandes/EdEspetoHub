import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Cube,
  Handshake,
  Package,
  Pill,
  Rocket,
  ShoppingCart,
  Storefront,
  Truck,
  Wine,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { platformService } from '../services/platformService';
import { formatCurrency } from '../utils/format';

const upsertMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export function LandingPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<{
    activeStores?: number;
    totalOrders?: number;
    totalRevenue?: number;
  } | null>(null);

  useEffect(() => {
    document.title = 'Jano Caminho | Plataforma completa para gestão de pedidos e entregas';
    const description =
      'Plataforma de gestão de pedidos, entregas e retirada para qualquer comércio. Sistema moderno com painel administrativo completo.';

    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Jano Caminho | Plataforma completa para gestão de pedidos e entregas', 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', 'https://www.janocaminho.com.br/janocaminho.jpg', 'property');
    upsertMeta('og:type', 'website', 'property');
  }, []);

  useEffect(() => {
    let mounted = true;
    platformService
      .getPublicMetrics()
      .then((data) => {
        if (!mounted) return;
        setMetrics({
          activeStores: Number(data?.activeStores) || 0,
          totalOrders: Number(data?.totalOrders) || 0,
          totalRevenue: Number(data?.totalRevenue) || 0,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setMetrics(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ctaPrimaryHref = 'https://wa.me/5512997822784';

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef7ff_0%,#f8fafc_45%,#ecfeff_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_55%)]" />
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20 relative">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                <Rocket size={14} weight="duotone" />
                SaaS para operação comercial
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-[1.05]">
                Jano Caminho - Plataforma completa para gestão de pedidos e entregas
              </h1>
              <p className="text-sm sm:text-lg text-slate-600 max-w-2xl">
                Centralize pedidos online, organize sua operação e aumente suas vendas com um sistema moderno e inteligente.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={ctaPrimaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-black text-white shadow-[0_18px_46px_-32px_rgba(30,64,175,0.8)]"
                >
                  Solicitar demonstração
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                >
                  Criar minha loja
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_26px_64px_-36px_rgba(15,23,42,0.45)]">
              <img
                src="/janocaminho.jpg"
                alt="Jano Caminho"
                className="w-full h-52 sm:h-60 rounded-2xl bg-slate-950 object-contain p-2"
              />
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">Lojas</p>
                  <p className="text-lg font-black text-slate-900">{metrics?.activeStores ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">Pedidos</p>
                  <p className="text-lg font-black text-slate-900">{metrics?.totalOrders ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] text-emerald-700 uppercase tracking-[0.2em]">Vendas</p>
                  <p className="text-lg font-black text-emerald-700">
                    {metrics ? formatCurrency(metrics.totalRevenue || 0) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Como funciona</p>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Fluxo simples para vender todos os dias</h2>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {[
              {
                title: 'Cliente realiza pedido online',
                icon: ShoppingCart,
                text: 'Link da loja compartilhado no WhatsApp, Instagram e Google, com compra rápida no celular.',
              },
              {
                title: 'Pedido aparece no painel administrativo',
                icon: Package,
                text: 'A equipe recebe o pedido com status organizado para produção e operação sem confusão.',
              },
              {
                title: 'Entrega ou retirada com status em tempo real',
                icon: Truck,
                text: 'Cliente, loja e entregador acompanham o andamento com atualização de cada etapa.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-4">{item.title}</h3>
                  <p className="text-sm text-slate-600 mt-2">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Benefícios</p>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Valor direto para o seu negócio</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                'Aumente suas vendas com pedidos online',
                'Centralize toda operação em um único painel',
                'Controle entregas e retirada em tempo real',
                'Compatível com qualquer tipo de comércio',
              ].map((text) => (
                <div key={text} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <CheckCircle size={18} weight="duotone" className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-slate-800">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Segmentos atendidos</p>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Pronto para diferentes operações</h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Restaurantes', icon: Storefront },
                { label: 'Adegas', icon: Wine },
                { label: 'Farmácias', icon: Pill },
                { label: 'Lanchonetes', icon: Handshake },
                { label: 'Mercados', icon: Cube },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center">
                    <div className="mx-auto h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center">
                      <Icon size={18} weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-3">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Prova visual</p>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Painel administrativo em operação real</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { title: 'Dashboard de gestão', image: '/marketing/dashboard.png' },
              { title: 'Fila de produção', image: '/marketing/grill-queue.png' },
              { title: 'Checkout e pedido', image: '/marketing/checkout.png' },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <img src={item.image} alt={item.title} className="w-full h-52 rounded-2xl object-cover" />
                <p className="text-sm font-semibold text-slate-800 mt-3">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(120deg,#0f172a,#1e293b)] py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-200 font-semibold">Próximo passo</p>
              <h2 className="text-2xl sm:text-4xl font-black mt-2">Leve sua operação para o nível SaaS</h2>
              <p className="text-sm text-slate-200 mt-2 max-w-2xl">
                Estruture pedidos, produção e entrega em um único fluxo profissional, com desempenho mobile e gestão em tempo real.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ctaPrimaryHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900"
              >
                Solicitar demonstração
              </a>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-transparent px-5 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                Criar minha loja
              </button>
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
