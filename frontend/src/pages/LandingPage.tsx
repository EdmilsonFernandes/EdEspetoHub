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
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { platformService } from '../services/platformService';
import { storeService } from '../services/storeService';
import { formatCurrency } from '../utils/format';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';

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
  const [activeProof, setActiveProof] = useState<{ title: string; image: string } | null>(null);
  const [featuredStores, setFeaturedStores] = useState<Array<{ id: string; name: string; slug: string; logoUrl?: string | null }>>([]);

  useEffect(() => {
    document.title = 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas';
    const description =
      'Plataforma de gestão de pedidos, entregas e retirada para qualquer comércio. Sistema moderno com painel administrativo completo.';

    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas', 'property');
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

  useEffect(() => {
    let mounted = true;
    storeService
      .listPortfolio()
      .then((data: any) => {
        if (!mounted) return;
        const normalized = Array.isArray(data)
          ? data
              .map((store: any, index: number) => ({
                id: String(store?.id || store?.slug || `store-${index}`),
                name: String(store?.name || 'Loja ativa'),
                slug: String(store?.slug || ''),
                logoUrl: store?.settings?.logoUrl || null,
              }))
              .filter((store: any) => Boolean(store.slug))
          : [];
        setFeaturedStores(normalized.slice(0, 20));
      })
      .catch(() => {
        if (!mounted) return;
        setFeaturedStores([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ctaPrimaryHref = 'https://wa.me/5512997822784';
  const trustBadges = [
    'Cloud-native na AWS',
    'Operação em tempo real',
    'Segurança e rastreabilidade',
    'Mobile-first para equipes',
  ];
  const proofVisuals = [
    {
      title: 'Dashboard de gestão',
      image: '/marketing/dashboard-real.png',
      alt: 'Dashboard administrativo com indicadores de vendas, operação e desempenho da loja',
    },
    {
      title: 'Fila de pedidos',
      image: '/marketing/fila-real.png',
      alt: 'Tela de fila de pedidos em tempo real com status operacionais e priorização',
    },
    {
      title: 'Painel de pedidos',
      image: '/marketing/pedidos-real.png',
      alt: 'Painel de pedidos com controle de produção, pagamento e acompanhamento logístico',
    },
  ];

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#050b16_0%,#0f172a_50%,#111827_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.24),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-28 lg:py-32 relative">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Rocket size={14} weight="duotone" />
                Plataforma SaaS profissional
              </span>
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-3xl sm:text-5xl font-black text-transparent leading-[1.05]">
                Transforme sua operação em um padrão de alta performance
              </h1>
              <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto lg:mx-0">
                Estruture pedidos, produção e entrega em um único fluxo profissional, com experiência mobile e dados em tempo real.
              </p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={ctaPrimaryHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Solicitar demonstração no WhatsApp"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-base sm:text-sm font-black text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
                >
                  Solicitar demonstração
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  aria-label="Criar minha loja agora"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-transparent px-5 py-3 text-base sm:text-sm font-black text-white hover:bg-white/10 transition-all"
                >
                  Criar minha loja
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur p-5 shadow-[0_26px_64px_-36px_rgba(0,0,0,0.6)]">
              <img
                src="/janocaminho.jpg"
                alt="Logo da plataforma Já no Caminho em destaque no hero"
                className="w-full h-52 sm:h-60 rounded-2xl bg-slate-950 object-contain p-2"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl border border-white/25 bg-white/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-slate-300 uppercase tracking-[0.2em]">Lojas ativas</p>
                  <p className="text-base sm:text-lg font-black text-white leading-tight">{metrics?.activeStores ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-slate-300 uppercase tracking-[0.2em]">Pedidos processados</p>
                  <p className="text-base sm:text-lg font-black text-white leading-tight">{metrics?.totalOrders ?? '-'}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-300/35 bg-emerald-400/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-emerald-200 uppercase tracking-[0.2em]">Receita pública</p>
                  <p className="text-base sm:text-lg font-black text-emerald-100 leading-tight">
                    {metrics ? formatCurrency(metrics.totalRevenue || 0) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredStores.length > 0 && <SocialProofMarquee clients={featuredStores} />}

      <section className="bg-[linear-gradient(140deg,#020617,#0f172a_55%,#111827)] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300 font-semibold">Padrão empresarial</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Disponibilidade</p>
                <p className="text-sm font-black text-white">Infraestrutura escalável</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Confiabilidade</p>
                <p className="text-sm font-black text-white">Fluxo estável de operação</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Crescimento</p>
                <p className="text-sm font-black text-white">Pronto para expansão</p>
              </div>
            </div>
          </div>
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Como funciona</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Fluxo simples para vender todos os dias</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl mx-auto">
              Um processo claro, auditável e padronizado para qualquer operação comercial.
            </p>
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
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 text-white grid place-items-center">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <h3 className="text-base font-black text-white mt-4">{item.title}</h3>
                  <p className="text-sm text-slate-300 mt-2">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#0b1220,#111827_60%,#0f172a)] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Benefícios</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Valor direto para o seu negócio</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                'Aumente suas vendas com pedidos online',
                'Centralize toda operação em um único painel',
                'Controle entregas e retirada em tempo real',
                'Compatível com qualquer tipo de comércio',
              ].map((text) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex items-center gap-3 transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                  <CheckCircle size={18} weight="duotone" className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-slate-100">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Segmentos atendidos</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Pronto para diferentes operações</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl">
              Arquitetura flexível para restaurantes, varejo local, conveniência, farmácia, adega e novos formatos.
            </p>
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
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-4 text-center transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                    <div className="mx-auto h-10 w-10 rounded-2xl bg-white/10 text-white grid place-items-center">
                      <Icon size={18} weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-slate-100 mt-3">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Prova visual</p>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Painel administrativo em operação real</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Interface projetada para decisão rápida, execução diária e escala operacional.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {proofVisuals.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveProof(item)}
                aria-label={`Abrir visual do painel: ${item.title}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-26px_rgba(15,23,42,0.35)]"
              >
                <div className="rounded-[2rem] border-[8px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
                  <img src={item.image} alt={item.alt} loading="lazy" className="w-full h-40 sm:h-56 object-cover" />
                </div>
                <p className="text-sm italic text-slate-400 mt-3">{item.title}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeProof && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-extrabold text-slate-900">{activeProof.title}</p>
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
                aria-label="Fechar zoom"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="bg-slate-950 p-3 sm:p-5">
              <img src={activeProof.image} alt={`Visual ampliado: ${activeProof.title}`} className="w-full max-h-[78vh] object-contain rounded-2xl" />
            </div>
          </div>
        </div>
      )}

      <section className="bg-[linear-gradient(120deg,#0f172a,#1e293b)] py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-200 font-semibold">Próximo passo</p>
              <h2 className="text-2xl sm:text-4xl font-black mt-2">Transforme sua operação em um padrão de alta performance</h2>
              <p className="text-sm text-slate-200 mt-2 max-w-2xl">
                Estruture pedidos, produção e entrega em um único fluxo profissional, com experiência mobile, dados confiáveis e gestão em tempo real.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ctaPrimaryHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Solicitar demonstração com especialista"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-base sm:text-sm font-black text-slate-900"
              >
                Solicitar demonstração
              </a>
              <button
                type="button"
                onClick={() => navigate('/create')}
                aria-label="Criar minha loja e começar agora"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-transparent px-5 py-3 text-base sm:text-sm font-black text-white hover:bg-white/10"
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

