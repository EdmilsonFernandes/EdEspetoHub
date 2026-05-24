import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, EnvelopeSimple, WarningCircle } from '@phosphor-icons/react';
import { emailTemplateService } from '../services/emailTemplateService';

export function EmailUnsubscribePage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('marketing');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Link de descadastro inválido.');
        setLoading(false);
        return;
      }
      try {
        const payload: any = await emailTemplateService.previewUnsubscribe(token);
        setEmail(payload?.email || '');
        setCategory(payload?.category || 'marketing');
      } catch (err: any) {
        setError(err?.message || 'Não foi possível abrir este link.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      await emailTemplateService.confirmUnsubscribe(token);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir o descadastro.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dff7ef_0%,#eef4f3_36%,#f8fafc_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[72vh] max-w-xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_28px_80px_-44px_rgba(15,58,76,0.45)] backdrop-blur">
          <div className="bg-[linear-gradient(135deg,#153A4C_0%,#336886_70%,#5FD35A_150%)] p-7 text-white">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-16 w-16 rounded-2xl border border-white/30 object-cover shadow-lg" />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-white/70">Preferências de e-mail</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Controle o que você recebe</h1>
          </div>
          <div className="p-7">
            {loading ? (
              <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
            ) : done ? (
              <div className="text-center">
                <CheckCircle size={52} weight="duotone" className="mx-auto text-emerald-500" />
                <h2 className="mt-4 text-2xl font-black text-slate-950">Descadastro concluído</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  Você não receberá novas comunicações comerciais dessa categoria. E-mails operacionais e de segurança continuam sendo enviados quando necessários.
                </p>
                <a href="/hub" className="mt-6 inline-flex rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white">
                  Voltar ao Já no Caminho
                </a>
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-rose-700">
                <WarningCircle size={28} weight="duotone" />
                <p className="mt-3 text-sm font-bold">{error}</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <EnvelopeSimple size={24} weight="duotone" className="mt-0.5 text-[#336886]" />
                  <div>
                    <p className="text-sm font-black text-slate-950">{email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{category}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm font-medium leading-relaxed text-slate-600">
                  Ao confirmar, você deixa de receber comunicações comerciais dessa categoria. Mensagens de segurança, código de acesso, senha, pagamento e operação continuam ativas.
                </p>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="mt-6 w-full rounded-2xl bg-[#153A4C] px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_-26px_rgba(21,58,76,0.75)] disabled:opacity-60"
                >
                  {confirming ? 'Confirmando...' : 'Cancelar comunicações comerciais'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
