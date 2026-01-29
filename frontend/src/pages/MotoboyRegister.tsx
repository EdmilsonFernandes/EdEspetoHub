import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

export function MotoboyRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.termsAccepted || !form.lgpdAccepted) {
      showToast('Aceite os termos e LGPD para continuar.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.registerMotoboy({
        accountType: 'MOTOBOY',
        user: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        },
        termsAccepted: form.termsAccepted,
        lgpdAccepted: form.lgpdAccepted,
      });
      showToast('Cadastro criado. Verifique seu e-mail.', 'success');
      navigate('/motoboy/login');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível cadastrar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 overflow-x-hidden">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 overflow-hidden">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800">Cadastro de Entregador</h1>
          <p className="text-sm text-slate-500">Crie sua conta para fazer entregas.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Nome completo"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Seu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
              className="mt-1"
            />
            Aceito os termos de uso.
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.lgpdAccepted}
              onChange={(e) => setForm({ ...form, lgpdAccepted: e.target.checked })}
              className="mt-1"
            />
            Aceito o uso dos meus dados conforme LGPD.
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/motoboy/login')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Já tenho conta
          </button>
        </form>
      </div>
    </div>
  );
}
