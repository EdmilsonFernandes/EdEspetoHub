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
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [removingUser, setRemovingUser] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<any | null>(null);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'OPERATOR',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);

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

  useEffect(() => {
    const onDocClick = () => setActionsOpenId(null);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
      setFormOpen(false);
      await loadUsers();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível cadastrar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openPasswordModal = (user: any) => {
    setPasswordTarget(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setPasswordModalOpen(true);
  };

  const openRemoveModal = (user: any) => {
    setRemoveTarget(user);
    setRemoveModalOpen(true);
  };

  const handleUpdateUserPassword = async () => {
    if (!storeId || !passwordTarget?.id) return;
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');
    if (!newPassword || !confirmPassword) {
      showToast('Preencha e confirme a nova senha.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('A confirmação da senha não confere.', 'warning');
      return;
    }
    setUpdatingPassword(true);
    try {
      await storeService.updateUserPassword(storeId, passwordTarget.id, { newPassword });
      showToast('Senha do usuário atualizada com sucesso.', 'success');
      setPasswordModalOpen(false);
      setPasswordTarget(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar a senha.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!storeId || !removeTarget?.id) return;
    setRemovingUser(true);
    try {
      await storeService.deleteUser(storeId, removeTarget.id);
      showToast('Usuário removido da loja com sucesso.', 'success');
      setRemoveModalOpen(false);
      setRemoveTarget(null);
      await loadUsers();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível remover o usuário.', 'error');
    } finally {
      setRemovingUser(false);
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
          <button
            type="button"
            onClick={() => setFormOpen((prev) => !prev)}
            className="h-10 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {formOpen ? 'Fechar cadastro' : 'Novo usuário'}
          </button>
        </div>

        {formOpen && (
        <>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nome</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              placeholder="usuario@loja.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              placeholder="Senha de acesso"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Cargo</label>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            >
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Cargo selecionado: <span className="font-semibold text-slate-700">{roleLabel}</span></p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="h-11 w-full sm:w-auto rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Cadastrando...' : 'Cadastrar usuário'}
          </button>
        </div>
        </>
        )}
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
              <div key={user.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-slate-800 break-words">{user.fullName || 'Usuário'}</p>
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
                    <p className="mt-1 text-sm text-slate-500 break-all">{user.email}</p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionsOpenId((prev) => (prev === user.id ? null : user.id));
                      }}
                      className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      aria-label="Abrir ações do usuário"
                    >
                      ⋯
                    </button>
                    {actionsOpenId === user.id && (
                      <div
                        className="absolute right-0 top-10 z-20 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActionsOpenId(null);
                            openPasswordModal(user);
                          }}
                          className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Alterar senha
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionsOpenId(null);
                            openRemoveModal(user);
                          }}
                          className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Excluir usuário
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {passwordModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">Trocar senha do usuário</p>
              <p className="text-xs text-slate-500 mt-0.5">{passwordTarget?.email || ''}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nova senha</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Confirmar nova senha</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                disabled={updatingPassword}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateUserPassword}
                disabled={updatingPassword}
                className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {updatingPassword ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </div>
          </div>
        </div>
      )}
      {removeModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">Remover usuário da loja</p>
              <p className="text-xs text-slate-500 mt-0.5">{removeTarget?.email || ''}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-700">
                Essa ação remove o acesso do usuário ao painel desta loja. Deseja continuar?
              </p>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveModalOpen(false)}
                disabled={removingUser}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveUser}
                disabled={removingUser}
                className="h-10 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {removingUser ? 'Removendo...' : 'Confirmar remoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
