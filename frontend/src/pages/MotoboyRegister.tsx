import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.termsAccepted || !form.lgpdAccepted) {
      showToast('Aceite os termos e LGPD para continuar.', 'error');
      return;
    }
    if (!form.email || !form.email.includes('@')) {
      showToast('Informe um e-mail válido.', 'error');
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
      if (error?.code === 'AUTH-015') {
        showToast('Esse e-mail já é dono de loja. Use outro para o entregador.', 'error');
      } else if (error?.code === 'AUTH-011') {
        showToast('E-mail já cadastrado. Faça login ou use outro.', 'error');
      } else {
        showToast(error?.message || 'Não foi possível cadastrar.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10 space-y-6 overflow-x-hidden">
      <MotoboyHeader title="Cadastro" subtitle="Crie sua conta e receba solicitações das lojas." />
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 overflow-hidden min-w-0">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Use um e-mail diferente do cadastro de lojista.
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
            <span>
              Aceito os{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-brand-primary font-semibold underline">
                termos de uso
              </a>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.lgpdAccepted}
              onChange={(e) => setForm({ ...form, lgpdAccepted: e.target.checked })}
              className="mt-1"
            />
            <span>
              Aceito o uso dos meus dados conforme{' '}
              <a href="/terms#lgpd" target="_blank" rel="noreferrer" className="text-brand-primary font-semibold underline">
                LGPD
              </a>
              .
            </span>
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
