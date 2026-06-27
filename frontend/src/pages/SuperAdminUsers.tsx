import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, IdentificationCard, MagnifyingGlass, Spinner } from '@phosphor-icons/react';
import { apiClient } from '../config/apiClient';
import { SurfaceCard } from '../components/ui';

type UserRow = {
  id: string; fullName: string; email: string; userRole: string;
  isActive: boolean; emailVerified: boolean; phone?: string | null;
  document?: string | null; createdAt: string;
};

type AccessLog = {
  id: string; method: string; path: string; status: number;
  ipAddress?: string | null; userAgent?: string | null; createdAt: string;
};

const roleLabel: Record<string, string> = {
  CUSTOMER: 'Cliente', STORE_OWNER: 'Lojista', ADMIN: 'Admin',
  OPERATOR: 'Operador', MOTOBOY: 'Entregador', SUPER_ADMIN: 'Super Admin',
};

export function SuperAdminUsers() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/admin/users?search=${encodeURIComponent(search)}&limit=50`, { authMode: 'superadmin' });
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const openUser = async (user: UserRow) => {
    setSelected(user);
    setLogsLoading(true);
    try {
      const data = await apiClient.get(`/admin/users/${user.id}`, { authMode: 'superadmin' });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={16} weight="bold" /> Voltar à lista
        </button>

        <SurfaceCard padding="md" className="rounded-[1.6rem]">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#336886]/10 text-[#153A4C]"><IdentificationCard size={24} weight="duotone" /></span>
            <div>
              <h2 className="text-xl font-black text-slate-950">{selected.fullName}</h2>
              <p className="text-sm font-semibold text-slate-500">{selected.email} · {roleLabel[selected.userRole] || selected.userRole}</p>
              <p className="text-xs text-slate-400">ID: {selected.id}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><p className="text-[10px] font-black uppercase text-slate-400">Telefone</p><p className="font-bold text-slate-700">{selected.phone || '—'}</p></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400">Documento</p><p className="font-bold text-slate-700">{selected.document || '—'}</p></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400">Ativo</p><p className="font-bold text-slate-700">{selected.isActive ? '✅ Sim' : '⛔ Não'}</p></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400">Verificado</p><p className="font-bold text-slate-700">{selected.emailVerified ? '✅ Sim' : '⛔ Não'}</p></div>
          </div>
        </SurfaceCard>

        <SurfaceCard padding="md" className="rounded-[1.6rem]">
          <h3 className="mb-3 text-sm font-black text-slate-900">Rotas acessadas (últimas 100)</h3>
          {logsLoading ? <p className="text-sm text-slate-400">Carregando…</p> : logs.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma rota registrada.</p>
          ) : (
            <div className="max-h-[28rem] space-y-1 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs">
                  <span className={`shrink-0 rounded-md px-2 py-0.5 font-black ${log.method === 'GET' ? 'bg-emerald-50 text-emerald-700' : log.method === 'POST' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{log.method}</span>
                  <span className="flex-1 truncate font-semibold text-slate-700">{log.path}</span>
                  <span className={`shrink-0 font-black ${log.status < 400 ? 'text-emerald-600' : 'text-rose-600'}`}>{log.status}</span>
                  <span className="shrink-0 text-slate-400">{log.ipAddress || '—'}</span>
                  <span className="shrink-0 text-slate-300">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome…"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm font-semibold outline-none focus:border-[#336886]/30"
          />
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner size={16} /> Carregando…</div>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Papel</th>
                <th className="py-2 pr-4">Ativo</th>
                <th className="py-2 pr-4">Criado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => openUser(u)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-500">{u.email}</td>
                  <td className="py-2 pr-4"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{roleLabel[u.userRole] || u.userRole}</span></td>
                  <td className="py-2 pr-4">{u.isActive ? '✅' : '⛔'}</td>
                  <td className="py-2 pr-4 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
