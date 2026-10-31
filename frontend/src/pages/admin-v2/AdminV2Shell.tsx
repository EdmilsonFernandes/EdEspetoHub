// Shell da V2 do painel do lojista (/admin/dashboardV2).
// Composição adaptada do bloco ReUI app-shell-2 (sidebar flutuante colapsável,
// grupos aninhados) sobre a fonte canônica de navegação (adminNavigation.ts).
// Regras de papel/plano vêm de getAdminNavItems — nada é redecidido aqui.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClockCounterClockwise,
  LockKey,
  ShieldCheck,
  SignOut,
  Storefront,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import { storeService } from '../../services/storeService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { markManualLogoutRedirect } from '../../utils/sessionRedirect';
import { PlanBadge } from '../../components/PlanBadge';
import { AccountMfaPanel } from '../../components/Auth/AccountMfaPanel';
import {
  groupAdminNavItems,
  getAdminNavItems,
  resolveCanUseMotoboys,
  type AdminNavItem,
} from '../../navigation/adminNavigation';
import {
  ADMIN_V2_BASE,
  getV2SectionFromPathname,
  getV2SectionMeta,
  navItemToV2Destination,
} from '../../navigation/adminV2Routes';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '../../components/ui/sidebar';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  LOJISTA: 'Lojista',
  OPERATOR: 'Operador',
};

/** Estética do app-shell-2 ReUI: rail flutuante, ativo com borda/fundo e ícone primário. */
const SHELL_SKIN = cn(
  '[--sidebar-width:260px]',
  '[--sidebar-border:transparent]',
  '[&_[data-slot=sidebar-inner]]:border-border/80 [&_[data-slot=sidebar-inner]]:border',
  '[&_[data-slot=sidebar-inner]]:shadow-xs [&_[data-slot=sidebar-inner]]:shadow-black/5',
  '[&_[data-slot=sidebar-menu-button][data-active]]:border-border/60! [&_[data-slot=sidebar-menu-button][data-active]]:border',
  '[&_[data-slot=sidebar-menu-button][data-active]]:shadow-xs! [&_[data-slot=sidebar-menu-button][data-active]]:shadow-black/5!',
  '[&_[data-slot=sidebar-menu-button][data-active]]:bg-background! [&_[data-slot=sidebar-menu-button][data-active]]:hover:bg-background! **:data-[slot=sidebar-menu-button]:hover:bg-transparent!',
  '[&_[data-slot=sidebar-menu-button][data-active]]:text-foreground [&_[data-slot=sidebar-menu-button][data-active]>svg]:text-primary [&_[data-slot=sidebar-menu-button][data-active]>svg]:opacity-100',
  '**:data-[slot=sidebar-menu-button]:text-accent-foreground/80 **:data-[slot=sidebar-menu-button]:hover:text-foreground',
  '[&_[data-collapsible=icon]_[data-slot=sidebar-menu-button][data-active]>svg]:-ml-px',
  '[&_[data-slot=sidebar-menu-button]:hover>svg]:opacity-100 [&_[data-slot=sidebar-menu-button]>svg]:opacity-60'
);

// ————— Status da loja (mesma fonte da V1: fetchBySlug → isOpenNow) —————

const useStoreOpenNow = (slug: string) => {
  const [openNow, setOpenNow] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    if (!slug) return () => undefined;
    const load = () => {
      storeService
        .fetchBySlug(slug)
        .then((data: any) => {
          if (alive) setOpenNow(Boolean(data?.isOpenNow ?? data?.openNow ?? data?.open));
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug]);
  return openNow;
};

// ————— Badge da fila (poll leve; GrillQueue segue com o poll fino dele) —————

const useQueueCount = (storeId: string) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    if (!storeId) return () => undefined;
    const load = () => {
      orderService
        .fetchQueue(storeId)
        .then((data: any) => {
          if (!alive) return;
          const orders = Array.isArray(data) ? data : (data?.orders ?? []);
          setCount(orders.length);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [storeId]);
  return count;
};

// ————— Troca de senha (mesma chamada da V1: authService.changePassword) —————

const ChangePasswordDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (next.length < 6) {
      setError('A nova senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (next !== confirm) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(current, next, { authMode: 'admin' });
      showToast('Senha atualizada com sucesso.', 'success');
      onOpenChange(false);
    } catch (err: any) {
      setError(String(err?.message || 'Não foi possível trocar a senha. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            Atualize a senha deste acesso sem sair da operação.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm">
            Senha atual
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Nova senha
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Confirmar nova senha
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar senha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ————— Menu de conta (rodapé da sidebar) —————

const AccountMenu = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const userName = String(auth?.user?.name || auth?.user?.email || 'Conta');
  const roleLabel = ROLE_LABEL[String(auth?.user?.role || '').toUpperCase()] || 'Conta';
  const initials = userName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    markManualLogoutRedirect('admin', '/hub');
    logout();
    navigate('/hub', { replace: true });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton className="data-open:bg-accent data-open:text-accent-foreground" />
          }
        >
          <Avatar className="size-6">
            <AvatarFallback className="text-xs">{initials || '?'}</AvatarFallback>
          </Avatar>
          <span className="truncate" title={userName}>
            {userName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate">{userName}</span>
            <span className="text-muted-foreground text-xs font-normal">{roleLabel}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <LockKey className="size-4" aria-hidden="true" />
            Trocar senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMfaOpen(true)}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Segurança da conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
            <ClockCounterClockwise className="size-4" aria-hidden="true" />
            Painel clássico
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <SignOut className="size-4" aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Segurança da conta</DialogTitle>
            <DialogDescription>
              Autenticação em dois fatores deste acesso.
            </DialogDescription>
          </DialogHeader>
          <AccountMfaPanel open={mfaOpen} onClose={() => setMfaOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

// ————— Navegação V2 (executa item canônico → rota V2) —————

const useV2NavRunner = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const canUseMotoboysRef = useRef(false);
  const { auth } = useAuth();
  canUseMotoboysRef.current = resolveCanUseMotoboys(auth);

  return useCallback(
    (item: AdminNavItem) => {
      if (item.gate === 'motoboys' && !canUseMotoboysRef.current) {
        showToast('Disponível no plano Pro. Faça o upgrade para liberar entregadores.', 'info');
        navigate('/admin/renewal?focus=pro');
        return;
      }
      const destination = navItemToV2Destination(item, String(auth?.store?.slug || ''));
      if (!destination) return;
      if (destination.kind === 'external') {
        // Vitrine da própria loja: mesma aba, como a V1 (voltar retorna ao painel).
        if (destination.url.startsWith('/')) {
          navigate(destination.url);
          return;
        }
        window.open(destination.url, '_blank', 'noopener');
        return;
      }
      navigate(`${ADMIN_V2_BASE}${destination.path}`);
    },
    // auth/navigate/showToast mudam juntos na prática; estabilizar por referência
    // evita recriar o runner a cada render do shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth?.store?.slug, navigate, showToast]
  );
};

const V2SidebarNav = ({
  queueCount,
  motoboysPending,
}: {
  queueCount: number | null;
  motoboysPending: number | null;
}) => {
  const location = useLocation();
  const runItem = useV2NavRunner();
  const { auth } = useAuth();
  const role = String(auth?.user?.role || '');
  const canUseMotoboys = resolveCanUseMotoboys(auth);

  const items = useMemo(
    () =>
      getAdminNavItems({ role, canUseMotoboys }).map((item) => {
        if (item.id === 'motoboys' && item.disabled) return { ...item, badge: 'Pro' };
        if (item.badgeKey === 'queueCount' && queueCount != null && queueCount > 0) {
          return { ...item, badge: queueCount };
        }
        if (item.badgeKey === 'motoboysPending' && motoboysPending != null && motoboysPending > 0) {
          return { ...item, badge: motoboysPending };
        }
        return item;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, canUseMotoboys, queueCount, motoboysPending]
  );

  const sidebarItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.surfaces || []).some((s) => s === 'sidebar' || s === 'drawer') || !item.surfaces
      ),
    [items]
  );
  const sections = useMemo(() => groupAdminNavItems(sidebarItems), [sidebarItems]);

  const badgeFor = (item: AdminNavItem) =>
    item.badge !== undefined ? (
      <SidebarMenuBadge className={item.badge === 'Pro' ? 'text-primary' : undefined}>
        {item.badge}
      </SidebarMenuBadge>
    ) : null;

  return (
    <SidebarContent>
      {sections.map((section) => {
        if (section.type === 'item') {
          const { item } = section;
          const destination = navItemToV2Destination(item, String(auth?.store?.slug || ''));
          const isActive =
            destination?.kind === 'internal' &&
            getV2SectionFromPathname(location.pathname) === destination.sectionId &&
            (destination.sectionId !== 'config' || location.pathname.includes('/config'));
          return (
            <SidebarGroup key={item.id} className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActive}
                      onClick={() => runItem(item)}
                    >
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {badgeFor(item)}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        }
        if (section.type !== 'group') return null;
        return (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.children.map((item) => {
                  const destination = navItemToV2Destination(item, String(auth?.store?.slug || ''));
                  const isActive =
                    destination?.kind === 'internal' &&
                    getV2SectionFromPathname(location.pathname) === destination.sectionId &&
                    (destination.sectionId !== 'config' || location.pathname.includes('/config'));
                  const disabled = Boolean(item.disabled);
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={isActive}
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => runItem(item)}
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                        {badgeFor(item)}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </SidebarContent>
  );
};

// ————— Cabeçalho de identidade da loja (workspace) —————

const StoreWorkspace = () => {
  const { auth } = useAuth();
  const store: any = auth?.store || {};
  const settings: any = store?.settings || {};
  const logoUrl = resolveAssetUrl(String(settings?.logoUrl || ''));
  const storeName = String(store?.name || 'Minha loja');
  const city = String(store?.city || settings?.city || '').trim();
  const subscription: any = auth?.subscription || null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-1 py-1">
      <div className="flex min-w-0 items-center gap-2">
        {logoUrl ? (
          <Avatar className="size-8 shrink-0 rounded-md">
            <AvatarImage src={logoUrl} alt={storeName} />
          </Avatar>
        ) : (
          <span
            className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold uppercase"
            aria-hidden="true"
          >
            {storeName.slice(0, 2)}
          </span>
        )}
        <span className="min-w-0 in-data-[state=collapsed]:hidden">
          <span className="block truncate text-sm font-medium" title={storeName}>
            {storeName}
          </span>
          {city && (
            <span className="text-muted-foreground block truncate text-xs">{city}</span>
          )}
        </span>
      </div>
      <div className="in-data-[state=collapsed]:hidden">
        <PlanBadge planName={subscription?.plan?.name} details={subscription} align="left" />
      </div>
    </div>
  );
};

// ————— Shell —————

export const AdminV2Shell = ({ children }: { children?: React.ReactNode }) => {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const store: any = auth?.store || {};
  const storeId = String(store?.id || '');
  const storeSlug = String(store?.slug || '');
  const storeName = String(store?.name || 'Minha loja');
  const logoUrl = resolveAssetUrl(String(store?.settings?.logoUrl || ''));
  const openNow = useStoreOpenNow(storeSlug);
  const queueCount = useQueueCount(storeId);
  const [motoboysPending, setMotoboysPending] = useState<number | null>(null);
  const sectionId = getV2SectionFromPathname(location.pathname) || 'resumo';
  const meta = getV2SectionMeta(sectionId);

  // Solicitações de motoboy pendentes (badge) — 1 chamada por montagem do shell.
  const canUseMotoboys = resolveCanUseMotoboys(auth);
  useEffect(() => {
    let alive = true;
    if (!storeId || !canUseMotoboys) return () => undefined;
    import('../../services/motoboyAdminService').then(({ motoboyAdminService }) => {
      motoboyAdminService
        .listRequests(storeId)
        .then((data: any) => {
          if (alive) setMotoboysPending(Array.isArray(data) ? data.length : 0);
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, [storeId, canUseMotoboys]);

  return (
    <SidebarProvider className={SHELL_SKIN}>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="flex flex-row items-start justify-between gap-1 in-data-[state=collapsed]:flex-col in-data-[state=collapsed]:items-center in-data-[state=collapsed]:justify-center">
          <StoreWorkspace />
          <SidebarTrigger className="opacity-60 hover:opacity-100 in-data-[state=collapsed]:hidden" />
        </SidebarHeader>
        <V2SidebarNav queueCount={queueCount} motoboysPending={motoboysPending} />
        <SidebarFooter>
          <SidebarMenu>
            <AccountMenu />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex min-h-14 shrink-0 flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 pl-2">
            <SidebarTrigger className="-ml-1 flex opacity-60 hover:opacity-100 md:hidden" />
            {/* Identidade da loja no header mobile (desktop mora na sidebar) */}
            <span className="flex min-w-0 items-center gap-2 md:hidden">
              {logoUrl ? (
                <Avatar className="size-7 shrink-0 rounded-md">
                  <AvatarImage src={logoUrl} alt={storeName} />
                </Avatar>
              ) : (
                <span
                  className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold uppercase"
                  aria-hidden="true"
                >
                  {storeName.slice(0, 2)}
                </span>
              )}
              <span className="max-w-28 truncate text-sm font-medium">{storeName}</span>
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">{meta.title}</h1>
              <p className="text-muted-foreground hidden truncate text-xs sm:block">
                {meta.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-3">
            <span
              className={cn(
                'text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                openNow === false ? 'border-orange-500/30 text-orange-600' : 'border-emerald-500/30 text-emerald-600'
              )}
              title={
                openNow === false
                  ? 'Os clientes veem a vitrine em modo fechado'
                  : 'Recebendo pedidos agora'
              }
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  openNow === false ? 'bg-orange-500' : 'bg-emerald-500'
                )}
                aria-hidden="true"
              />
              {openNow === null ? 'Loja…' : openNow ? 'Loja aberta' : 'Loja fechada'}
            </span>
            {queueCount != null && queueCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`${ADMIN_V2_BASE}/fila`)}
              >
                {queueCount} {queueCount === 1 ? 'pedido em aberto' : 'pedidos em aberto'}
              </Button>
            )}
            {storeSlug && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/${storeSlug}`)}
              >
                <Storefront className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Ver vitrine</span>
                <span className="sr-only sm:hidden">Ver vitrine</span>
              </Button>
            )}
          </div>
        </header>
        <main className="bg-muted/40 flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
