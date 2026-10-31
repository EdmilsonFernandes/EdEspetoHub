// Página-mãe da V2 (/admin/dashboardV2). Rotas aninhadas de verdade: deep-link,
// refresh, voltar/avançar. Guarda por papel dentro da seção (a fonte é o campo
// `roles` do item canônico em adminNavigation.ts — não uma segunda opinião).
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminItemById } from '../../navigation/adminNavigation';
import { AdminV2Shell } from './AdminV2Shell';
import { V2EmptyRegion } from './v2ui';
import { Button } from '../../components/ui/Button';
import { ADMIN_V2_BASE } from '../../navigation/adminV2Routes';

const ResumoSection = lazy(() =>
  import('./sections/ResumoSection').then((module) => ({ default: module.ResumoSection }))
);
const FilaSection = lazy(() =>
  import('./sections/FilaSection').then((module) => ({ default: module.FilaSection }))
);
const ProdutosSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.ProdutosSection }))
);
const EstoqueSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.EstoqueSection }))
);
const CuponsSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.CuponsSection }))
);
const DestaquesSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.DestaquesSection }))
);
const DestinosSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.DestinosSection }))
);
const CondominiosSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.CondominiosSection }))
);
const UsuariosSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.UsuariosSection }))
);
const MotoboysSection = lazy(() =>
  import('./sections/WrappedSections').then((module) => ({ default: module.MotoboysSection }))
);
const PedidosSection = lazy(() =>
  import('./sections/PedidosSection').then((module) => ({ default: module.PedidosSection }))
);
const AvaliacoesSection = lazy(() =>
  import('./sections/AvaliacoesSection').then((module) => ({ default: module.AvaliacoesSection }))
);
const AssinaturaSection = lazy(() =>
  import('./sections/AssinaturaSection').then((module) => ({ default: module.AssinaturaSection }))
);
const GatewaySection = lazy(() =>
  import('./sections/GatewaySection').then((module) => ({ default: module.GatewaySection }))
);
const ConfigSection = lazy(() =>
  import('./sections/ConfigSection').then((module) => ({ default: module.ConfigSection }))
);

const SectionFallback = () => (
  <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3" aria-busy="true">
    <div className="bg-muted h-8 w-56 rounded-md" />
    <div className="bg-muted h-32 w-full rounded-lg" />
    <div className="bg-muted h-48 w-full rounded-lg" />
  </div>
);

/** Papéis exigidos por seção — espelha o `roles` do item canônico. */
const sectionRoles = (sectionId: string): string[] | null => {
  const item = getAdminItemById(sectionId);
  if (!item) return ['ADMIN', 'LOJISTA'];
  return item.roles || null;
};

/** Resumo é ADMIN/LOJISTA: OPERATOR que cair no índice vai pra Fila (base dele).
 *  Fora do WithRoleGate — senão o gate renderiza "Acesso restrito" antes do
 *  redirect (bug pego no E2E). */
const IndexRoute = () => {
  const { auth, hydrated } = useAuth() as any;
  const isOperator = String(auth?.user?.role || '').toUpperCase() === 'OPERATOR';
  if (hydrated && isOperator) return <Navigate to={`${ADMIN_V2_BASE}/fila`} replace />;
  if (hydrated && !auth) return null;
  return <ResumoSection />;
};

const WithRoleGate = ({ sectionId, children }: { sectionId: string; children: React.ReactNode }) => {
  const { auth, hydrated } = useAuth() as any;
  const role = String(auth?.user?.role || '').toUpperCase();
  const roles = sectionRoles(sectionId);
  if (!hydrated) return <SectionFallback />;
  if (roles && !roles.includes(role)) {
    return (
      <div className="mx-auto w-full max-w-[1180px] py-8">
        <V2EmptyRegion
          title="Acesso restrito"
          hint="Esta área não está disponível para o seu perfil."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => window.history.length > 1 ? window.history.back() : undefined}>
              Voltar
            </Button>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
};

export const AdminDashboardV2 = () => (
  <AdminV2Shell>
    <Suspense fallback={<SectionFallback />}>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/fila" element={<WithRoleGate sectionId="fila"><FilaSection /></WithRoleGate>} />
        <Route path="/pedidos" element={<WithRoleGate sectionId="pedidos"><PedidosSection /></WithRoleGate>} />
        <Route path="/avaliacoes" element={<WithRoleGate sectionId="avaliacoes"><AvaliacoesSection /></WithRoleGate>} />
        <Route path="/produtos" element={<WithRoleGate sectionId="produtos"><ProdutosSection /></WithRoleGate>} />
        <Route path="/estoque" element={<WithRoleGate sectionId="estoque"><EstoqueSection /></WithRoleGate>} />
        <Route path="/destaques" element={<WithRoleGate sectionId="destaques"><DestaquesSection /></WithRoleGate>} />
        <Route path="/cupons" element={<WithRoleGate sectionId="cupons"><CuponsSection /></WithRoleGate>} />
        <Route path="/destinos" element={<WithRoleGate sectionId="destinos"><DestinosSection /></WithRoleGate>} />
        <Route path="/condominios" element={<WithRoleGate sectionId="condominios"><CondominiosSection /></WithRoleGate>} />
        <Route path="/assinatura" element={<WithRoleGate sectionId="pagamentos"><AssinaturaSection /></WithRoleGate>} />
        <Route path="/gateway" element={<WithRoleGate sectionId="gateway"><GatewaySection /></WithRoleGate>} />
        <Route path="/motoboys" element={<WithRoleGate sectionId="motoboys"><MotoboysSection /></WithRoleGate>} />
        <Route path="/usuarios" element={<WithRoleGate sectionId="usuarios"><UsuariosSection /></WithRoleGate>} />
        <Route path="/config/*" element={<WithRoleGate sectionId="config"><ConfigSection /></WithRoleGate>} />
        <Route path="*" element={<Navigate to={ADMIN_V2_BASE} replace />} />
      </Routes>
    </Suspense>
  </AdminV2Shell>
);

export default AdminDashboardV2;
