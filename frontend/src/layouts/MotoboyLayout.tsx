import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, IdentificationCard, ListChecks, Motorcycle, ShieldCheck, SignOut, Truck, Wallet } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { motoboyService } from '../services/motoboyService';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { ContextSideDrawer } from '../components/common/ContextSideDrawer';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { PlatformTrustFooter } from '../components/common/PlatformTrustFooter';
import { useToast } from '../contexts/ToastContext';
import { AccountMfaPanel } from '../components/Auth/AccountMfaPanel';

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
  const { showToast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<any | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [queueBadge, setQueueBadge] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [mfaPanelOpen, setMfaPanelOpen] = useState(false);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    submitting: false,
    error: '',
  });

  const motoboySession = useMemo(() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [pathname, accountDrawerOpen, sessionRefreshKey]);

  const motoboyUser = motoboySession?.user || null;
  const motoboyName = String(motoboyUser?.fullName || motoboyUser?.name || 'Entregador').trim();
  const motoboyEmail = String(motoboyUser?.email || '').trim();
  const motoboyImage = resolveAssetUrl(String(motoboyUser?.profileImageUrl || '')) || '';
  const requiresPasswordChange = Boolean(motoboyUser?.mustChangePassword);

  const tabs: Tab[] = [
    {
      id: 'home',
      to: '/motoboy/home',
      label: 'Início',
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
      id: 'delivery',
      to: '/motoboy/delivery',
      label: 'Entrega',
      icon: <Motorcycle size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/delivery') || p.startsWith('/motoboy/current') || p.startsWith('/motoboy/done'),
    },
    {
      id: 'earnings',
      to: '/motoboy/earnings',
      label: 'Ganhos',
      icon: <Wallet size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/earnings') || p.startsWith('/motoboy/history'),
    },
    {
      id: 'profile',
      label: 'Menu',
      icon: <IdentificationCard size={20} weight="duotone" />,
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
    const openMenuDrawer = () => setAccountDrawerOpen(true);
    window.addEventListener('motoboy:open-account-drawer', openAccountDrawer as EventListener);
    window.addEventListener('motoboy:open-menu-drawer', openMenuDrawer as EventListener);
    return () => {
      window.removeEventListener('motoboy:open-account-drawer', openAccountDrawer as EventListener);
      window.removeEventListener('motoboy:open-menu-drawer', openMenuDrawer as EventListener);
    };
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

  const handleForcedPasswordChange = async () => {
    if (passwordForm.submitting) return;
    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordForm((prev) => ({ ...prev, error: 'Preencha todos os campos.' }));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordForm((prev) => ({ ...prev, error: 'A nova senha precisa ter pelo menos 6 caracteres.' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordForm((prev) => ({ ...prev, error: 'A confirmação da nova senha não confere.' }));
      return;
    }

    setPasswordForm((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await authService.changePassword(currentPassword, newPassword, { authMode: 'motoboy' });
      const updatedSession = motoboySession
        ? {
            ...motoboySession,
            user: {
              ...motoboySession.user,
              mustChangePassword: false,
            },
          }
        : motoboySession;
      localStorage.setItem('motoboySession', JSON.stringify(updatedSession));
      nativeBiometricService.syncMotoboySession(updatedSession);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        submitting: false,
        error: '',
      });
      setSessionRefreshKey((prev) => prev + 1);
      showToast('Senha atualizada com sucesso.', 'success');
    } catch (error: any) {
      setPasswordForm((prev) => ({
        ...prev,
        submitting: false,
        error: error?.message || 'Não foi possível atualizar sua senha agora.',
      }));
    }
  };

  const accountActions = [
    {
      id: 'home',
      section: 'Operacao',
      label: 'Inicio',
      description: 'Resumo do dia, entrega atual e pedidos da fila.',
      icon: <Truck size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/home'),
    },
    {
      id: 'delivery',
      section: 'Operacao',
      label: 'Entrega atual',
      description: 'Abra a rota em andamento e confirme retirada ou entrega.',
      icon: <Motorcycle size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/delivery'),
    },
    {
      id: 'queue',
      section: 'Operacao',
      label: 'Fila de entregas',
      description: 'Veja os pedidos disponíveis e novas coletas.',
      icon: <ListChecks size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/available'),
    },
    {
      id: 'earnings',
      section: 'Operacao',
      label: 'Ganhos',
      description: 'Resumo do dia e histórico financeiro.',
      icon: <Wallet size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/earnings'),
    },
    {
      id: 'profile',
      section: 'Cadastro',
      label: 'Perfil e documentos',
      description: 'Cadastro, documentos, lojas aprovadas e repasses.',
      icon: <IdentificationCard size={22} weight="duotone" />,
      onClick: () => navigate('/motoboy/profile'),
    },
    {
      id: 'security',
      section: 'Conta',
      label: 'Segurança da conta',
      description: 'MFA, Authenticator e dispositivos confiáveis.',
      icon: <ShieldCheck size={22} weight="duotone" />,
      onClick: () => {
        setAccountDrawerOpen(false);
        setMfaPanelOpen(true);
      },
    },
    {
      id: 'logout',
      section: 'Sessao',
      label: 'Sair das entregas',
      description: 'Encerra somente este acesso neste aparelho.',
      icon: <SignOut size={22} weight="duotone" />,
      onClick: handleMotoboyLogout,
      tone: 'danger' as const,
    },
  ];

  return (
    <div className="min-h-screen motoboy-bg pb-28">
      <Outlet />

      {requiresPasswordChange && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.55)] p-6 space-y-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Primeiro acesso</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Troque sua senha temporária</h2>
              <p className="mt-2 text-sm text-slate-600">
                Antes de operar, confirme sua senha temporária e defina uma nova senha para sua conta.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value, error: '' }))}
                placeholder="Senha temporária"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value, error: '' }))}
                placeholder="Nova senha"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value, error: '' }))}
                placeholder="Confirmar nova senha"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
              />
            </div>

            {passwordForm.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {passwordForm.error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleForcedPasswordChange}
              disabled={passwordForm.submitting}
              className="btn-press w-full rounded-2xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-black text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordForm.submitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </div>
      )}

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
          <div className="motoboy-pill grid grid-cols-5 gap-1 p-1">
            {tabs.map((tab) => {
              const active = tab.id === 'profile' ? accountDrawerOpen || tab.match(pathname) : tab.match(pathname);
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
      {accountDrawerOpen && (
        <ContextSideDrawer
          isOpen={accountDrawerOpen}
          onClose={() => setAccountDrawerOpen(false)}
          side="left"
          eyebrow="Menu do entregador"
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
            { label: 'Entregador', tone: 'brand' },
            { label: 'Conta ativa', tone: 'neutral' },
          ]}
          actions={accountActions}
          footer={<PlatformTrustFooter compact mode="default" align="left" />}
        />
      )}
      <AccountMfaPanel open={mfaPanelOpen} authMode="motoboy" onClose={() => setMfaPanelOpen(false)} />
    </div>
  );
}
