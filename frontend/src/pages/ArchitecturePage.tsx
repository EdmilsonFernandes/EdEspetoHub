import { useEffect } from 'react';
import {
  Boxes,
  Database,
  MapPinned,
  ServerCog,
  ShieldCheck,
  SquareCode,
} from 'lucide-react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';

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

const stackCards = [
  {
    title: 'Backend API (Node.js)',
    description: 'APIs performáticas para pedidos, operação de loja, autenticação e integrações externas.',
    icon: ServerCog,
  },
  {
    title: 'Frontend SPA (React + Vite)',
    description: 'Interface mobile-first com navegação fluida, foco em produtividade e UX de conversão.',
    icon: SquareCode,
  },
  {
    title: 'Banco de Dados (PostgreSQL)',
    description: 'Persistência relacional robusta, segura e preparada para consultas de alto volume.',
    icon: Database,
  },
  {
    title: 'Serviço KYC',
    description: 'Validação documental e antifraude para fluxo seguro de entregadores e conformidade.',
    icon: ShieldCheck,
  },
  {
    title: 'API de Mapas',
    description: 'Geolocalização e apoio à roteirização para cálculo de distância e entrega em tempo real.',
    icon: MapPinned,
  },
  {
    title: 'Containers Docker (Deploy Cloud AWS)',
    description: 'Ambiente containerizado com deploy contínuo, isolamento de serviços e escalabilidade.',
    icon: Boxes,
  },
];

export function ArchitecturePage() {
  useEffect(() => {
    const description =
      'Conheça a arquitetura técnica do Já no Caminho: plataforma SaaS escalável com APIs, PostgreSQL, KYC, Maps e infraestrutura cloud na AWS.';
    document.title = 'Arquitetura da Plataforma | Já no Caminho';
    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Arquitetura da Plataforma | Já no Caminho', 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', 'https://www.janocaminho.com.br/marketing/arquitetura-jano-caminho.png', 'property');
    upsertMeta('og:type', 'website', 'property');
  }, []);

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#0b1220_45%,#0f2c2c_100%)] py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.2),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(95,211,90,0.14),_transparent_45%)]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200 font-semibold">Arquitetura da Plataforma</p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-[1.05] text-white">
              Infraestrutura técnica de nível enterprise para operação em escala
            </h1>
            <p className="mt-4 text-sm sm:text-lg text-slate-200">
              Uma base cloud-native projetada para disponibilidade, segurança e crescimento contínuo.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-3 sm:p-5">
            <img
              src="/marketing/arquitetura-jano-caminho.png"
              alt="Diagrama de arquitetura da plataforma Já no Caminho"
              className="w-full max-w-[1100px] mx-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Arquitetura Cloud-Native e Escalável</h2>
          <div className="mt-5 space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
            <p>
              O Já no Caminho foi desenvolvido com arquitetura moderna baseada em microsserviços, garantindo
              escalabilidade, segurança e alta disponibilidade.
            </p>
            <p>
              A plataforma roda em ambiente cloud (AWS), utilizando containers Docker para isolamento e deploy
              contínuo. O backend é estruturado com APIs performáticas, integradas a banco de dados PostgreSQL
              robusto e seguro.
            </p>
            <p>Integrações estratégicas permitem:</p>
            <ul className="space-y-2">
              <li>API de geolocalização (Maps) para rotas e entregas em tempo real</li>
              <li>Serviço de validação de identidade (KYC)</li>
              <li>Comunicação segura entre frontend e backend</li>
              <li>Processamento assíncrono via workers dedicados</li>
            </ul>
            <p>
              Toda a infraestrutura é preparada para crescimento horizontal, permitindo expansão da plataforma
              conforme o volume de usuários e lojas aumenta.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Infraestrutura Tecnológica</p>
            <h3 className="mt-2 text-2xl sm:text-4xl font-black text-slate-900">Camadas que sustentam a operação</h3>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stackCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-white grid place-items-center">
                    <Icon size={18} />
                  </div>
                  <h4 className="mt-4 text-base font-black text-slate-900">{item.title}</h4>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}

