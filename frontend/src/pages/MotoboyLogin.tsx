import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const session = await authService.login(form.email, form.password);
      const role = String(session?.user?.role || '').toUpperCase();
      if (role !== 'MOTOBOY') {
        setError('Esta conta não é de entregador.');
        return;
      }
      const sessionData = { token: session.token, user: session.user, store: session.store };
      localStorage.setItem('motoboySession', JSON.stringify(sessionData));
      setAuth(sessionData);
      navigate('/motoboy/current');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar agora.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10 space-y-6">
      <MotoboyHeader title="Entrar" subtitle="Acesse suas entregas em segundos." />
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Seu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => navigate('/motoboy/register')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Criar conta de entregador
          </button>
        </form>
      </div>
    </div>
  );
}
