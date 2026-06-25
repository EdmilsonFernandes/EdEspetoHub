import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Buildings, CheckCircle, ImageSquare, PaperPlaneTilt, UploadSimple } from '@phosphor-icons/react';
import { AuthLayout } from '../layouts/AuthLayout';
import { condominiumService } from '../services/condominiumService';
import { inputAssistProps, textareaAssistProps } from '../utils/inputAssist';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fieldClass = 'w-full rounded-2xl border border-slate-200 bg-[#f5f8fb] px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white focus:ring-2 focus:ring-[#d8e5ee]';

export function CondominiumAccessRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    condominiumName: '',
    city: '',
    state: 'SP',
    address: '',
    zipCode: '',
    description: '',
    responsibleName: '',
    responsibleRole: '',
    responsibleEmail: '',
    responsiblePhone: '',
    message: '',
    logoFile: '',
    bannerFile: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () => Boolean(form.condominiumName && form.responsibleName && form.responsibleEmail && form.responsiblePhone),
    [form]
  );

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAsset = async (key: 'logoFile' | 'bannerFile', file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      update(key, dataUrl);
    } catch {
      setError('Não foi possível carregar a imagem selecionada.');
    }
  };

  const submit = async (event: any) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Informe condomínio, responsável, e-mail e WhatsApp.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await condominiumService.createAccessRequest(form);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a solicitação agora.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[560px] space-y-4 ds-login-card-enter">
          <div className="ds-card-elevated border-white/40 bg-white/88 p-7 text-center shadow-[0_26px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle size={34} weight="fill" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Condomínio em análise</p>
            <h1 className="mt-5 text-2xl font-black tracking-[-0.03em] text-slate-950">Solicitação enviada</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
              Recebemos os dados do condomínio. A equipe vai analisar e liberar o acesso do responsável após aprovação.
            </p>
            <button
              type="button"
              onClick={() => navigate('/condominio/login')}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#153A4C] px-4 py-4 text-sm font-black text-white"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-3xl space-y-4 ds-login-card-enter">
        <div className="text-center">
          <button type="button" onClick={() => navigate('/condominio/login')} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95">
            <ArrowLeft size={16} weight="bold" />
          </button>
          <div className="mx-auto mt-4 grid h-[4.75rem] w-[4.75rem] place-items-center overflow-hidden rounded-full border-[4px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.03em] text-slate-900 sm:text-[2.25rem]">Solicitar acesso</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-500">
            Envie os dados do condomínio para análise. Depois da aprovação, o responsável recebe um acesso próprio ao painel.
          </p>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(241,247,251,0.92)_58%,rgba(255,255,255,0.94)_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Fluxo guiado</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Tudo que o condomínio precisa, em uma única entrada</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Dados do condomínio, identidade visual e responsável ficam organizados no mesmo envio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#d8e5ee] bg-[#edf5fa] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]">
                Painel exclusivo
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                Aprovação assistida
              </span>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="ds-card-elevated space-y-5 border-white/40 bg-white/86 p-5 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-7">
          <section className="grid gap-3 rounded-[1.75rem] border border-slate-200/80 bg-[#f8fbfd]/90 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]">Dados do condomínio</p>
              <p className="mb-3 text-xs font-semibold leading-5 text-slate-500">Nome, localização e contexto básico para análise da operação.</p>
              <input autoComplete="organization" autoCorrect="on" autoCapitalize="words" spellCheck={true} value={form.condominiumName} onChange={(event) => update('condominiumName', event.target.value)} placeholder="Nome do condomínio" className={fieldClass} />
            </div>
            <input {...inputAssistProps.city} value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Cidade" className={fieldClass} />
            <input {...inputAssistProps.state} value={form.state} onChange={(event) => update('state', event.target.value)} placeholder="UF" maxLength={2} className={fieldClass} />
            <input {...inputAssistProps.addressLine1} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Endereço" className={`${fieldClass} md:col-span-2`} />
            <input {...inputAssistProps.postalCode} value={form.zipCode} onChange={(event) => update('zipCode', event.target.value)} placeholder="CEP" className={fieldClass} />
            <textarea {...textareaAssistProps.description} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Breve descrição do condomínio" className={`${fieldClass} min-h-[96px] md:col-span-2`} />
          </section>

          <section className="grid gap-3 rounded-[1.75rem] border border-slate-200/80 bg-[#f8fbfd]/90 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]">Identidade visual</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Logo e banner ajudam a deixar a futura área do condomínio já alinhada com a marca local.</p>
            </div>
            {[
              { key: 'logoFile', label: 'Logo do condomínio', icon: ImageSquare },
              { key: 'bannerFile', label: 'Banner de capa', icon: Buildings },
            ].map((item) => {
              const Icon = item.icon;
              const preview = (form as any)[item.key];
              return (
                <label key={item.key} className="group cursor-pointer overflow-hidden rounded-[1.35rem] border border-dashed border-slate-300 bg-white p-3 transition hover:border-[#336886] hover:bg-[#fafdff]">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(item.key as any, event.target.files?.[0])} />
                  <div className="flex items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[#edf5fa] text-[#336886] ring-1 ring-[#d8e5ee]">
                      {preview ? <img src={preview} alt={item.label} className="h-full w-full object-cover" /> : <Icon size={24} weight="duotone" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">{item.label}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#336886]">
                        <UploadSimple size={14} weight="bold" /> Enviar imagem
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </section>

          <section className="grid gap-3 rounded-[1.75rem] border border-slate-200/80 bg-[#f8fbfd]/90 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]">Responsável</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Esse será o ponto de contato para aprovação, retorno comercial e liberação do acesso.</p>
            </div>
            <input {...inputAssistProps.name} value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} placeholder="Nome do responsável" className={fieldClass} />
            <input autoComplete="organization-title" autoCorrect="on" autoCapitalize="words" spellCheck={true} value={form.responsibleRole} onChange={(event) => update('responsibleRole', event.target.value)} placeholder="Cargo: síndico, administradora..." className={fieldClass} />
            <input {...inputAssistProps.email} value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} placeholder="E-mail" className={fieldClass} />
            <input {...inputAssistProps.phone} value={form.responsiblePhone} onChange={(event) => update('responsiblePhone', event.target.value)} placeholder="WhatsApp" className={fieldClass} />
            <textarea {...textareaAssistProps.notes} value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Mensagem opcional" className={`${fieldClass} min-h-[96px] md:col-span-2`} />
          </section>

          {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

          <button type="submit" disabled={loading || !canSubmit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-4 text-base font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.65)] transition hover:bg-[#1e4d62] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55">
            <PaperPlaneTilt size={19} weight="duotone" />
            {loading ? 'Enviando...' : 'Enviar para análise'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
