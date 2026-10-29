/**
 * Galeria ReUI — DEV ONLY.
 * Registrada em App.tsx apenas com import.meta.env.DEV (o chunk lazy não
 * carrega nem é referenciado em build de produção).
 *
 * Blocos com dados de DEMO — serve para avaliar visual/interação antes de
 * portar pra tela real. Ordem e prioridades: .ux-audit/reui-catalog/PLANO_REUI_JNC.md
 * (A1 pedidos/kanban, dashboard admin, A2 perfil, A5 assinatura…).
 */
import { RevenueDashboard } from '@/components/reui/dashboard-7/revenue-dashboard';
import { KanbanBoard } from '@/components/reui/kanban-board-2/kanban-board';
import { CryptoTransactions } from '@/components/reui/list-5/crypto-transactions';

export default function ReuiShowcase() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4">
          <h1 className="text-base font-bold">ReUI × JNC — galeria de blocos</h1>
          <span className="text-xs text-slate-500">
            dados demo · plano A1–A7 em .ux-audit/reui-catalog/PLANO_REUI_JNC.md
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 p-4">
        <section className="scroll-mt-20" id="dashboard-7">
          <p className="mb-3 text-sm">
            <strong>dashboard-7 · Retail Revenue</strong> — candidato à home do
            admin (KPIs com sparkline, gráfico de receita, fila de pedidos com
            drawer de detalhe).
          </p>
          <RevenueDashboard />
        </section>

        <section className="scroll-mt-20" id="kanban-board-2">
          <p className="mb-3 text-sm">
            <strong>kanban-board-2</strong> — pedidos online do lojista:
            arrastar card muda status (colunas colapsáveis, contadores).
          </p>
          <KanbanBoard />
        </section>

        <section className="mx-auto w-full max-w-md scroll-mt-20" id="list-5">
          <p className="mb-3 text-sm">
            <strong>list-5</strong> — padrão visual da lista de pedidos do
            cliente (ícone por status, valor destacado).
          </p>
          <CryptoTransactions />
        </section>
      </main>
    </div>
  );
}
