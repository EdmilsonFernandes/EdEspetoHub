import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, House, IdentificationCard, ListChecks, Motorcycle, SignOut, Truck, UserCircle, Wallet } from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { ContextSideDrawer } from '../components/common/ContextSideDrawer';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';

const MOTOBOY_QUEUE_BADGE_EVENT = 'jnc:motoboy-queue-badge';

type Tab = {
  id: string;
  to?: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
  onClick?: () => void;
};

export function MotoboyLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<any | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [queueBadge, setQueueBadge] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  const motoboySession = useMemo(() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [pathname, accountDrawerOpen]);

  const motoboyUser = motoboySession?.user || null;
  const motoboyName = String(motoboyUser?.fullName || motoboyUser?.name || 'Entregador').trim();
  const motoboyEmail = String(motoboyUser?.email || '').trim();
  const motoboyImage = resolveAssetUrl(String(motoboyUser?.profileImageUrl || '')) || '';

  const tabs: Tab[] = [
    {
      id: 'home',
      to: '/motoboy/home',
      label: 'Home',
      icon: <House size={20} weight="duotone" />,
      match: (p) => p === '/motoboy' || p.startsWith('/motoboy/home'),
    },
    {
      id: 'queue',
      to: '/motoboy/available',
      label: 'Fila',
      icon: <ListChecks size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/available'),
    },
    {
      id: 'earnings',
      to: '/motoboy/earnings',
      label: 'Ganhos',
      icon: <Wallet size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/earnings') || p.startsWith('/motoboy/history'),
    },
    {
      id: 'account',
      label: 'Conta',
      icon: <UserCircle size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/profile'),
      onClick: () => setAccountDrawerOpen(true),
    },
  ];

  useEffect(() => {
    const dismissed = localStorage.getItem('motoboy:pwa_dismissed') === '1';
    const handler = (e: any) => {
      try {
        e.preventDefault();
      } catch {}
      setInstallPrompt(e);
      if (!dismissed) setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const readBadge = () => {
      const flag = localStorage.getItem('motoboy:queue_badge') === '1';
      setQueueBadge(flag);
    };
    readBadge();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'motoboy:queue_badge') readBadge();
    };
    const onQueueBadge = () => readBadge();
    window.addEventListener('storage', onStorage);
    window.addEventListener(MOTOBOY_QUEUE_BADGE_EVENT, onQueueBadge as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MOTOBOY_QUEUE_BADGE_EVENT, onQueueBadge as EventListener);
    };
  }, []);

  useEffect(() => {
    // Visiting the queue clears the badge.
    if (pathname.startsWith('/motoboy/available')) {
      if (localStorage.getItem('motoboy:queue_badge') === '1') {
        localStorage.setItem('motoboy:queue_badge', '0');
      }
      setQueueBadge(false);
    }
  }, [pathname]);

  useEffect(() => {
    const openAccountDrawer = () => setAccountDrawerOpen(true);
    window.addEventListener('motoboy:open-account-drawer', openAccountDrawer as EventListener);
    return () => window.removeEventListener('motoboy:open-account-drawer', openAccountDrawer as EventListener);
  }, []);

  useEffect(() => {
    setAccountDrawerOpen(false);
  }, [pathname]);

  const handleMotoboyLogout = async () => {
    markManualLogoutRedirect('motoboy', '/hub');
    const token = String(motoboySession?.token || '').trim();
    if (token) {
      void motoboyService.unregisterPushToken({ token }).catch(() => undefined);
    }
    try {
      nativeBiometricService.syncMotoboySession(null);
    } catch {
      // ignore
    }
    setAccountDrawerOpen(false);
    navigate('/hub', { replace: true });
  };

  const accountActions = [
    {
      id: 'home',
      label: 'Painel do entregador',
      description: 'Resumo rápido da conta, corrida atual e próximos passos.',
      icon: <Truck size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/home'),
    },
    {
      id: 'delivery',
      label: 'Entrega atual',
      description: 'Abra a rota em andamento e confirme retirada ou entrega.',
      icon: <Motorcycle size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/delivery'),
    },
    {
      id: 'profile',
      label: 'Dados da conta',
      description: 'Cadastro, documentos, vínculos e repasses.',
      icon: <IdentificationCard size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/profile'),
    },
    {
      id: 'queue',
      label: 'Fila de entregas',
      description: 'Veja os pedidos disponíveis e novas coletas.',
      icon: <ListChecks size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/available'),
    },
    {
      id: 'earnings',
      label: 'Ganhos',
      description: 'Resumo do dia e histórico financeiro.',
      icon: <Wallet size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/earnings'),
    },
    {
      id: 'logout',
      label: 'Sair das entregas',
      description: 'Encerra somente este acesso neste aparelho.',
      icon: <SignOut size={22} weight="duotone" />,
      onClick: handleMotoboyLogout,
      tone: 'danger' as const,
    },
  ];

  return (
    <div className="min-h-screen motoboy-bg pb-28">
      {/* ── Mode indicator pill (fixed, above bottom nav) ── */}
      <div
        className="fixed left-3 z-[75] animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden rounded-full border border-white/[0.08] bg-slate-950/90 py-1.5 pl-2.5 pr-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.9)]" />
          <Truck size={11} weight="duotone" className="shrink-0 text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Entregador</span>
          <span className="mx-0.5 h-3 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => navigate('/hub')}
            className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[9px] font-black text-amber-400 transition hover:bg-amber-500/25 active:scale-95"
          >
            <ArrowLeft size={9} weight="bold" />
            Hub
          </button>
        </div>
      </div>
      <Outlet />

      {showInstall && installPrompt && (
        <div
          className="fixed left-0 right-0 z-[69] px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 98px)' }}
        >
          <div className="motoboy-screen !max-w-[72rem] !pt-0 !pb-0 !px-0">
            <div className="premium-card-glass px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900">Instalar o app do Entregador</p>
              <p className="text-[11px] text-slate-600 truncate">Mais rápido, sem abas, igual aplicativo.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('motoboy:pwa_dismissed', '1');
                  setShowInstall(false);
                }}
                className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await installPrompt.prompt?.();
                    const choice = await installPrompt.userChoice;
                    if (choice?.outcome === 'accepted') {
                      localStorage.setItem('motoboy:pwa_dismissed', '1');
                    }
                  } catch {}
                  setShowInstall(false);
                }}
                className="btn-press rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-3 py-2 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Instalar
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] motoboy-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação do entregador"
      >
        <div className="motoboy-screen !max-w-[72rem] !pt-0 !pb-0">
          <div className="motoboy-pill grid grid-cols-4 gap-1 p-1">
            {tabs.map((tab) => {
              const active = tab.id === 'account' ? accountDrawerOpen || tab.match(pathname) : tab.match(pathname);
              const showDot = tab.label === 'Fila' && queueBadge && !pathname.startsWith('/motoboy/available');
              const sharedClassName = [
                'motoboy-tab relative flex flex-col items-center justify-center gap-1 rounded-[999px] px-2 py-2 text-[11px] font-semibold',
                active
                  ? 'bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_65%,#f59e0b))] text-white shadow-[0_18px_34px_-26px_rgba(239,68,68,0.8)]'
                  : 'text-slate-700 hover:bg-slate-100/80',
              ].join(' ');

              if (tab.to) {
                return (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    className={sharedClassName}
                    aria-current={active ? 'page' : undefined}
                  >
                    {showDot && <span className="motoboy-dot" aria-hidden="true" />}
                    <span className={active ? 'text-white' : 'text-slate-700'}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.onClick}
                  className={sharedClassName}
                  aria-current={active ? 'page' : undefined}
                >
                  {showDot && <span className="motoboy-dot" aria-hidden="true" />}
                  <span className={active ? 'text-white' : 'text-slate-700'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
      <ContextSideDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        side="left"
        eyebrow="Conta do entregador"
        title={motoboyName || 'Entregador'}
        subtitle={motoboyEmail || 'Acesso ativo neste aparelho'}
        leading={
          motoboyImage ? (
            <img
              src={motoboyImage}
              alt={motoboyName || 'Entregador'}
              className="h-10 w-10 rounded-[0.95rem] object-cover"
            />
          ) : (
            <Motorcycle size={26} weight="duotone" className="text-[#f59e0b]" />
          )
        }
        badges={[
          { label: 'Entregador', tone: 'dark' },
          { label: 'Conta ativa', tone: 'neutral' },
        ]}
        actions={accountActions}
        footer={<PlatformTrustFooter compact mode="default" align="left" />}
      />
    </div>
  );
}
