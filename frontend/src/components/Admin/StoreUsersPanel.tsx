// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { storeService } from '../../services/storeService';

export function StoreUsersPanel() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = auth?.store?.id;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'OPERATOR',
  });

  const roleLabel = useMemo(
    () => (String(form.role || '').toUpperCase() === 'ADMIN' ? 'Admin' : 'Operador'),
    [form.role]
  );

  const loadUsers = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await storeService.listUsers(storeId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setUsers([]);
      showToast(error?.message || 'Não foi possível carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [storeId]);

  const handleCreate = async () => {
    if (!storeId) return;
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: String(form.role || 'OPERATOR').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
    };
    if (!payload.fullName || !payload.email || !payload.password) {
      showToast('Preencha nome, e-mail e senha.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await storeService.createUser(storeId, payload);
      showToast('Usuário cadastrado com sucesso.', 'success');
      setForm({ fullName: '', email: '', password: '', role: 'OPERATOR' });
      await loadUsers();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível cadastrar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">Gestão de acesso</p>
            <h2 className="text-lg font-black text-slate-900">Usuários da loja</h2>
            <p className="text-xs text-slate-500">Cadastre administradores e operadores da operação.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nome</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="usuario@loja.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Senha de acesso"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Cargo</label>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">Cargo selecionado: <span className="font-semibold text-slate-700">{roleLabel}</span></p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Cadastrando...' : 'Cadastrar usuário'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">Usuários cadastrados</p>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loading && users.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">Nenhum usuário cadastrado.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || 'Usuário'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                    String(user.role).toUpperCase() === 'ADMIN'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {String(user.role).toUpperCase() === 'ADMIN' ? 'Admin' : 'Operador'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

