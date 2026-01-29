import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { motoboyAdminService } from '../services/motoboyAdminService';

export function AdminMotoboys() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [motoboyId, setMotoboyId] = useState('');
  const storeId = auth?.store?.id || '';

  const canSubmit = useMemo(() => Boolean(storeId) && (email || userId), [storeId, email, userId]);

  const handleCreate = async () => {
    try {
      const payload: any = {};
      if (email) payload.email = email;
      if (userId) payload.userId = userId;
      const motoboy = await motoboyAdminService.create(storeId, payload);
      showToast('Entregador criado. Agora aprove o vínculo.', 'success');
      if (motoboy?.id) setMotoboyId(motoboy.id);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível criar entregador.', 'error');
    }
  };

  const runAction = async (action: () => Promise<any>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível concluir a ação.', 'error');
    }
  };

  if (!storeId) {
    return <div className="p-6">Carregando loja...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Entregadores</h1>
        <p className="text-sm text-slate-500">Crie, vincule e aprove entregadores para sua loja.</p>
      </div>

      <div className="premium-card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Cadastrar entregador</p>
          <p className="text-xs text-slate-500">Use email ou ID do usuário.</p>
        </div>
        <div className="grid gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email do usuário"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="ID do usuário (uuid)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            disabled={!canSubmit}
            onClick={handleCreate}
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Criar entregador
          </button>
        </div>
      </div>

      <div className="premium-card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Gerenciar vínculo</p>
          <p className="text-xs text-slate-500">Informe o ID do entregador para aprovar ou suspender.</p>
        </div>
        <input
          value={motoboyId}
          onChange={(event) => setMotoboyId(event.target.value)}
          placeholder="ID do entregador"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => runAction(() => motoboyAdminService.link(storeId, motoboyId), 'Entregador vinculado.')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Vincular
          </button>
          <button
            onClick={() => runAction(() => motoboyAdminService.unlink(storeId, motoboyId), 'Entregador desvinculado.')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Desvincular
          </button>
          <button
            onClick={() => runAction(() => motoboyAdminService.approve(storeId, motoboyId), 'Entregador aprovado.')}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Aprovar
          </button>
          <button
            onClick={() => runAction(() => motoboyAdminService.suspend(storeId, motoboyId), 'Entregador suspenso.')}
            className="w-full rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Suspender
          </button>
        </div>
      </div>
    </div>
  );
}
