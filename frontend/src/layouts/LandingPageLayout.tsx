// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Buildings, CaretDown, CreditCard, CurrencyDollar, DownloadSimple, House, List, MagnifyingGlass, Moon, QrCode, ShieldCheck, SignOut, Storefront, Sun, Truck, X } from '@phosphor-icons/react';
interface LandingPageLayoutProps {
  children: React.ReactNode;
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  const COOKIE_CONSENT_KEY = 'jnk_cookie_consent_v1';
  const ATTRIBUTION_KEY = 'jnk_attribution_v1';
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsMenuOpen, setSolutionsMenuOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallCta, setShowInstallCta] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<'unknown' | 'accepted' | 'rejected'>('unknown');

  useEffect(() => {
    setMobileMenuOpen(false);
    setSolutionsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = String(localStorage.getItem(COOKIE_CONSENT_KEY) || '').toLowerCase();
    const cookieStored = String(
      document.cookie
        .split('; ')
        .find((item) => item.startsWith('jnk_cookie_consent='))
        ?.split('=')[1] || ''
    ).toLowerCase();
    const resolved = stored || cookieStored;
    if (resolved === 'accepted' || resolved === 'rejected') {
      if (resolved !== stored) {
        try {
          localStorage.setItem(COOKIE_CONSENT_KEY, resolved);
        } catch {
          // no-op
        }
      }
      setCookieConsent(resolved as 'accepted' | 'rejected');
      return;
    }
    setCookieConsent('unknown');
  }, []);

  useEffect(() => {
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true);
    if (isStandalone) {
      setShowInstallCta(false);
      return;
    }

    const onBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setShowInstallCta(true);
    };

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setShowInstallCta(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      console.error('Falha ao abrir prompt de instalação', error);
    } finally {
      setDeferredInstallPrompt(null);
      setShowInstallCta(false);
    }
  };

  const persistCookieConsent = (accepted: boolean) => {
    const decision = accepted ? 'accepted' : 'rejected';
    const maxAge = 60 * 60 * 24 * 365;
    const payload = {
      decision,
      ts: Date.now(),
      version: 1,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, decision);
    localStorage.setItem('jnk_cookie_consent_meta', JSON.stringify(payload));
    document.cookie = `jnk_cookie_consent=${decision}; path=/; max-age=${maxAge}; SameSite=Lax`;
    setCookieConsent(decision);

    // Coleta somente quando aceito, para manter origem de aquisição sem PII.
    if (accepted && !localStorage.getItem(ATTRIBUTION_KEY)) {
      const params = new URLSearchParams(window.location.search);
      const attribution = {
        ts: Date.now(),
        referrer: document.referrer || '',
        landingPath: `${window.location.pathname}${window.location.search}`,
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        utm_term: params.get('utm_term') || '',
        gclid: params.get('gclid') || '',
        fbclid: params.get('fbclid') || '',
      };
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    }
  };

  const goToDemoGuide = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollToDemoFlow', 'true');
    }
    navigate('/');
  };

  const solutionsLinks = [
    { id: 'marketplace', label: 'Hub', helper: 'Cliente, lojista e entregador no mesmo fluxo', onClick: () => navigate('/hub') },
    { id: 'condominiums', label: 'Condomínios', helper: 'Solicite acesso e gerencie feiras do condomínio', onClick: () => navigate('/condominio/solicitar') },
    { id: 'guide', label: 'Guia', helper: 'Fluxos, recursos e visão operacional da plataforma', onClick: () => navigate('/guia') },
    { id: 'architecture', label: 'Arquitetura', helper: 'Base técnica, produto e evolução da solução', onClick: () => navigate('/arquitetura') },
  ];

  const goHome = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/');
  };

  const mobilePrimaryNav = useMemo(
    () => [
      { id: 'home', label: 'Início', icon: House, onClick: () => navigate('/'), active: location.pathname === '/' },
      {
        id: 'hub',
        label: 'Hub',
        icon: MagnifyingGlass,
        onClick: () => navigate('/hub'),
        active: location.pathname === '/hub' || location.pathname === '/marketplace' || location.pathname === '/descobrir' || location.pathname === '/praca',
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: Storefront,
        onClick: () => navigate('/admin'),
        active: location.pathname.startsWith('/admin'),
      },
      {
        id: 'motoboy',
        label: 'Entregador',
        icon: Truck,
        onClick: () => navigate('/motoboy/login'),
        active: location.pathname.startsWith('/motoboy'),
      },
      { id: 'menu', label: 'Menu', icon: List, onClick: () => setMobileMenuOpen(true), active: mobileMenuOpen },
    ],
    [location.pathname, mobileMenuOpen, navigate]
  );

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#0a1426_0px,#0e1d36_148px,#f8fafc_148px),radial-gradient(circle_at_top,_rgba(47,157,247,0.14),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(95,211,90,0.16),_transparent_45%)] dark:bg-slate-950"
      style={{ fontFamily: 'Inter, Geist, system-ui, -apple-system, Segoe UI, sans-serif' }}
    >
      <header className="fixed left-1/2 top-5 z-50 w-[calc(100%-1rem)] max-w-7xl -translate-x-1/2 sm:top-5 sm:w-[calc(100%-2rem)]">
        <div className="relative rounded-[100px] border border-white/10 bg-[rgba(13,25,48,0.6)] px-4 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-[12px] ring-1 ring-white/6 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
          <div className="pointer-events-none absolute right-24 top-2 h-12 w-24 rounded-full bg-[#84cc16]/12 blur-2xl" />
          <div className="pointer-events-none absolute left-28 top-2 h-10 w-20 rounded-full bg-sky-400/12 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <a href="https://www.janocaminho.com.br" className="group ml-1 flex min-w-0 items-center gap-3 rounded-full pr-2 transition-colors hover:bg-white/[0.03]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/85 bg-white p-0.5 shadow-[0_16px_30px_-22px_rgba(255,255,255,0.5)] transition-transform group-hover:scale-[1.03]">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-base font-black tracking-[-0.03em] text-white sm:text-lg">Já no Caminho</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/78">Plataforma SaaS</p>
              </div>
            </a>

            <div className="hidden min-w-0 flex-1 justify-center xl:flex">
              <nav className="flex items-center gap-2">
                <button
                  onClick={goHome}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium tracking-[-0.02em] text-slate-300 transition-all hover:text-white"
                >
                  <House size={16} weight="duotone" className="text-sky-300" />
                  Início
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setSolutionsMenuOpen(true)}
                  onMouseLeave={() => setSolutionsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setSolutionsMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium tracking-[-0.02em] text-slate-300 transition-all hover:text-white"
                  >
                    <Buildings size={16} weight="duotone" className="text-emerald-300" />
                    Soluções
                    <CaretDown size={14} weight="bold" className={`transition-transform ${solutionsMenuOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>
                  {solutionsMenuOpen ? (
                    <div className="absolute left-1/2 top-[calc(100%+0.9rem)] w-[24rem] -translate-x-1/2 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,29,0.98)_0%,rgba(7,12,24,0.98)_100%)] p-2.5 shadow-[0_32px_70px_-32px_rgba(2,6,23,0.92)] backdrop-blur-xl">
                      <div className="border-b border-white/6 px-3.5 pb-3 pt-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Plataforma</p>
                        <p className="mt-1 text-sm font-semibold text-white">Entradas organizadas para operação, expansão e aquisição.</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        {solutionsLinks.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSolutionsMenuOpen(false);
                              item.onClick();
                            }}
                            className="flex w-full items-start gap-3 rounded-[1rem] px-3.5 py-3 text-left transition hover:bg-white/[0.05]"
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04]">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#84cc16] shadow-[0_0_18px_rgba(132,204,22,0.55)]" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold tracking-[-0.02em] text-white">{item.label}</span>
                              <span className="mt-1 block text-xs font-medium leading-5 text-slate-400">{item.helper}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => navigate('/instalar')}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium tracking-[-0.02em] text-slate-300 transition-all hover:text-white"
                >
                  <DownloadSimple size={16} weight="duotone" className="text-sky-300" />
                  Instalar app
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:inline-flex items-center rounded-full px-3 py-2.5 text-sm font-medium tracking-[-0.02em] text-slate-300 transition-all hover:text-[#84cc16]"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(180deg,#a8ea37_0%,#84cc16_100%)] px-5 py-2.5 text-sm font-black tracking-[-0.02em] text-[#07111f] shadow-[0_12px_24px_-14px_rgba(132,204,22,0.52)] transition-all hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_16px_32px_-14px_rgba(132,204,22,0.58),0_0_22px_rgba(132,204,22,0.28)] active:scale-[0.985] sm:px-6"
              >
                Criar loja grátis
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition hover:bg-white/[0.08] xl:hidden"
              >
                <List size={20} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-24 pt-20 sm:pb-0 sm:pt-24"> {children} </main>

      <div className={`sm:hidden fixed inset-0 z-[75] transition ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-250 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Fechar menu"
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[84vw] max-w-[22rem] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu mobile"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-100">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">Já no Caminho</p>
                <p className="text-xs font-semibold text-slate-500">Navegação principal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              aria-label="Fechar"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {!auth && (
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="w-full inline-flex items-center justify-between rounded-xl px-4 py-3 bg-[linear-gradient(180deg,#a3e635_0%,#84cc16_100%)] text-[#0d1930] font-black shadow-[0_16px_30px_-20px_rgba(132,204,22,0.75)]"
              >
                Criar loja grátis
                <Storefront size={18} weight="duotone" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/hub')}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Hub Já no Caminho
              <MagnifyingGlass size={18} weight="duotone" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/instalar')}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Instalar app
              <DownloadSimple size={18} weight="duotone" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/condominio/solicitar')}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Sou condomínio
              <Buildings size={18} weight="duotone" />
            </button>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Soluções</p>
              <div className="mt-3 space-y-2">
                {solutionsLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="min-w-0">
                      <span className="block">{item.label}</span>
                      <span className="mt-1 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.helper}</span>
                    </span>
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#84cc16]" />
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              {theme === 'light' ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
            </button>
            {auth && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full inline-flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300"
              >
                Sair
                <SignOut size={18} weight="bold" />
              </button>
            )}
          </div>
        </aside>
      </div>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[70] border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_-12px_24px_-20px_rgba(2,6,23,0.9)]">
        <div className="grid grid-cols-5 gap-1 px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {mobilePrimaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold tracking-[0.08em] transition ${
                  item.active
                    ? 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon size={18} weight={item.active ? 'fill' : 'duotone'} />
                <span className="mt-1 leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showInstallCta && (
        <button
          type="button"
          onClick={handleInstallApp}
          className="fixed bottom-24 sm:bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-white shadow-[0_18px_38px_-18px_rgba(15,23,42,0.7)] ring-1 ring-slate-300/20 hover:bg-slate-800 transition"
          aria-label="Instalar app"
        >
          <DownloadSimple size={16} weight="bold" />
          <span className="text-xs sm:text-sm font-bold">Instalar app</span>
        </button>
      )}
      {cookieConsent === 'unknown' && (
        <div className="fixed left-3 right-3 bottom-[5.8rem] sm:bottom-4 z-[90]">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_16px_42px_-24px_rgba(2,6,23,0.5)] p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              Usamos cookies essenciais para funcionamento e, com sua permissão, dados de navegação para melhorar aquisição e conversão.
            </p>
            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate('/terms')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
              >
                Ver política e LGPD
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => persistCookieConsent(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={() => persistCookieConsent(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Aceitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="bg-[#070b14] text-slate-300 pt-14 pb-28 sm:pb-10 border-t border-slate-800/60 animate-in fade-in duration-700 motion-reduce:animate-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="rounded-[2rem] border border-slate-700/60 bg-[linear-gradient(120deg,#111827_0%,#0f172a_50%,#111827_100%)] p-6 sm:p-8 shadow-[0_24px_60px_-36px_rgba(14,165,233,0.45)] animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] font-black text-sky-300">Plataforma profissional</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pronto para estruturar seu delivery?</h3>
                <p className="text-sm text-slate-400">Ative seu ambiente em minutos e opere com mais controle.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/create?plan=trial')}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 hover:bg-sky-50 transition"
                >
                  Começar teste grátis
                </button>
                <a
                  href="mailto:contato@janocaminho.com.br"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-white/5 px-5 py-3 text-sm font-black text-slate-100 hover:bg-white/10 transition"
                >
                  Falar por e-mail
                </a>
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 motion-reduce:animate-none">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-white p-0.5">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Já no Caminho</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Gestão de pedidos</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">Solução completa para pedidos, operação e entregas com experiência app-like.</p>
            </div>

            <div>
              <h3 className="text-sm font-black text-white mb-3 uppercase tracking-[0.12em]">Links rápidos</h3>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('/create?plan=trial')} className="block text-slate-400 hover:text-white transition-colors">
                  Criar loja
                </button>
                <button onClick={goToDemoGuide} className="block text-slate-400 hover:text-white transition-colors">
                  Ver demo
                </button>
                <button onClick={() => navigate('/arquitetura')} className="block text-slate-400 hover:text-white transition-colors">
                  Tecnologia
                </button>
                <button onClick={() => navigate('/instalar')} className="block text-slate-400 hover:text-white transition-colors">
                  Instalar app
                </button>
                <a href="/terms" className="block text-slate-400 hover:text-white transition-colors">
                  Termos e privacidade
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-white mb-3 uppercase tracking-[0.12em]">Suporte</h3>
              <div className="space-y-2 text-sm text-slate-400">
                <a href="mailto:contato@janocaminho.com.br" className="block hover:text-white transition-colors">
                  contato@janocaminho.com.br
                </a>
                <button onClick={() => navigate('/admin')} className="block hover:text-white transition-colors">
                  Acesso administrativo
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-white mb-3 uppercase tracking-[0.12em]">Integrações</h3>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(13,25,48,0.94),rgba(2,52,81,0.9))] p-4 shadow-[0_22px_48px_-28px_rgba(0,158,227,0.45)]">
                  <div className="pointer-events-none absolute -left-4 top-4 h-14 w-14 rounded-full bg-[#009ee3]/25 blur-2xl" />
                  <div className="pointer-events-none absolute -right-4 bottom-3 h-14 w-14 rounded-full bg-[#84cc16]/18 blur-2xl" />
                  <div className="relative rounded-[1rem] border border-white/70 bg-white/96 px-3 py-2 shadow-[0_18px_34px_-24px_rgba(255,255,255,0.65)]">
                    <img src="/mercado-pago-horizontal.png" alt="Mercado Pago" className="h-14 w-full object-contain object-left" />
                  </div>
                  <div className="relative mt-3 flex flex-wrap gap-2">
                    {[
                      { icon: QrCode, label: 'Pix' },
                      { icon: CreditCard, label: 'Crédito' },
                      { icon: CurrencyDollar, label: 'Débito' },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100 backdrop-blur-xl">
                        <Icon size={12} weight="duotone" className="text-sky-300" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">Pagamentos online opcionais</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  O lojista conecta a própria conta Mercado Pago e recebe Pix, crédito e débito direto no fluxo do pedido.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300 font-bold uppercase tracking-[0.12em]">
                  <ShieldCheck size={14} weight="duotone" />
                  OAuth seguro
                </div>
              </div>
            </div>
          </section>

          <div className="mt-10 border-t border-slate-800/80 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in duration-700 delay-200 motion-reduce:animate-none">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Edmilson Tecnologia da Informação • CNPJ 44.771.427/0001-69</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">© {new Date().getFullYear()} Já no Caminho. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
