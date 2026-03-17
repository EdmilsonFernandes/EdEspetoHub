import { useEffect } from 'react';
import {
  Boxes,
  Database,
  Linkedin,
  MapPinned,
  Printer,
  RadioTower,
  ServerCog,
  ShieldCheck,
  Sparkles,
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
    title: 'Auto-Print Engine',
    description: 'Conexão direta com impressoras térmicas Bluetooth/RawBT para impressão operacional imediata.',
    icon: Printer,
  },
  {
    title: 'Real-Time Sync',
    description: 'Sincronização instantânea de pedidos e status com arquitetura orientada a eventos e tempo real.',
    icon: RadioTower,
  },
  {
    title: 'Smart Dashboard',
    description: 'Painel executivo com UX glassmorphism e visão operacional/financeira integrada.',
    icon: Sparkles,
  },
  {
    title: 'Containers Docker (Deploy Cloud AWS)',
    description: 'Ambiente containerizado com deploy contínuo, isolamento de serviços e escalabilidade.',
    icon: Boxes,
  },
];

const teamMembers = [
  {
    name: 'Edmilson Lopes Fernandes',
    role: 'Arquiteto de Software e Desenvolvedor Full Stack Sênior',
    badge: 'Arquiteto Principal & Liderança Técnica',
    years: 15,
    profileUrl: 'https://www.linkedin.com/in/edmilson-santos-6805a515/',
    profileImage: '/team/ed.png',
    color: 'from-red-500 to-amber-500',
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

          <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Clientes e Operação', desc: 'Vitrine, pedido e monitor em tempo real', icon: SquareCode },
                { title: 'Core APIs', desc: 'Autenticação, pedidos, catálogo e pagamentos', icon: ServerCog },
                { title: 'Integrações Locais', desc: 'RawBT, impressão térmica e logística local', icon: Printer },
                { title: 'Dados e Escala', desc: 'PostgreSQL + Docker + AWS com observabilidade', icon: Database },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="h-10 w-10 rounded-xl bg-white/15 text-white grid place-items-center">
                      <Icon size={18} />
                    </div>
                    <p className="mt-3 text-sm font-black text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-200">{item.desc}</p>
                  </article>
                );
              })}
            </div>
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
              <li>Impressão térmica operacional via RawBT/Bluetooth</li>
              <li>Sincronização instantânea via canais em tempo real</li>
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

      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#f8fafc,#f1f5f9)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Time de desenvolvimento</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Especialistas por trás da plataforma</h3>
                <p className="text-sm text-slate-600 mt-2">Engenharia de produto focada em performance, escala e experiência premium.</p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                Equipe técnica
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {teamMembers.map((member) => (
                <article key={member.name} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className={`h-16 bg-gradient-to-r ${member.color}`} />
                  <div className="p-4 -mt-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-white">
                        <img src={member.profileImage} alt={member.name} className="h-full w-full object-cover object-center" />
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {member.badge} • {member.years} anos
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-base font-black text-slate-900">{member.name}</h4>
                      <p className="text-sm font-semibold text-sky-700 mt-0.5">{member.role}</p>
                    </div>
                    <a
                      href={member.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-3 py-2.5 text-sm font-bold text-white hover:opacity-95"
                    >
                      <Linkedin size={16} />
                      Ver LinkedIn
                    </a>
                  </div>
                </article>
              ))}
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-white grid place-items-center">
                  <Boxes size={18} />
                </div>
                <h4 className="mt-4 text-base font-black text-slate-900">Infraestrutura Autogerenciada</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Operação técnica com deploy contínuo em AWS, orquestração de serviços e monitoramento de ponta a ponta para garantir estabilidade da plataforma.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
