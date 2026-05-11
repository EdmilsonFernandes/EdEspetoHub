// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bed, CheckCircle, Compass, Handshake, Sparkle } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';

const initialForm = {
  destinationId: '',
  partnerType: 'HOSPITALITY',
  placeType: 'CHALE',
  category: 'SERVICO',
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  whatsapp: '',
  instagramUrl: '',
  websiteUrl: '',
  deliveryInstructions: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  message: '',
};

export function DestinationPartnerRequestPage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    let active = true;
    destinationService
      .listPublic()
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : [];
        setDestinations(rows);
        setForm((current) => ({ ...current, destinationId: current.destinationId || rows[0]?.id || '' }));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar destinos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(null);
    try {
      const payload = await destinationService.createPartnerRequest(form);
      setSuccess(payload);
      setForm((current) => ({
        ...initialForm,
        destinationId: current.destinationId,
        partnerType: current.partnerType,
      }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar cadastro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link to="/destinos" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
          <ArrowRight size={14} className="rotate-180" weight="bold" />
          Destinos
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="overflow-hidden rounded-[2rem] bg-[#153A4C] p-5 text-white shadow-[0_24px_70px_-42px_rgba(21,58,76,0.8)] sm:p-6 lg:sticky lg:top-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
              <Handshake size={15} weight="duotone" />
              Cadastro real
            </p>
            <h1 className="mt-5 text-3xl font-black leading-none tracking-[-0.04em]">Cadastre sua responsabilidade no destino.</h1>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-white/72">
              Chalés, pousadas e prestadores entram por aprovação da plataforma. Depois de aprovado, aparecem no destino público.
            </p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <Bed size={22} weight="duotone" />
                <p className="mt-2 text-sm font-black">Hospedagem</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Endereço, contato, instruções de entrega e apresentação.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Sparkle size={22} weight="duotone" />
                <p className="mt-2 text-sm font-black">Serviço turístico</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Passeios, massagens, restaurantes para visitar e experiências.</p>
              </div>
            </div>
          </aside>

          <form onSubmit={submit} className="relative z-10 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Solicitação</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Dados do parceiro</h2>
              </div>
              <Compass size={28} weight="duotone" className="text-[#336886]" />
            </div>

            {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
            {success ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle size={18} weight="fill" className="mr-1 inline" />
                Solicitação enviada. Status: {success.status || 'pending'}.
              </div>
            ) : null}
            {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Destino</span>
                <select value={form.destinationId} onChange={(event) => update('destinationId', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" required>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>{destination.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Tipo de parceiro</span>
                <select value={form.partnerType} onChange={(event) => update('partnerType', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                  <option value="HOSPITALITY">Chalé ou pousada</option>
                  <option value="SERVICE_PROVIDER">Serviço turístico</option>
                </select>
              </label>

              {form.partnerType === 'HOSPITALITY' ? (
                <label>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Tipo de hospedagem</span>
                  <select value={form.placeType} onChange={(event) => update('placeType', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                    <option value="CHALE">Chalé</option>
                    <option value="POUSADA">Pousada</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="CABANA">Cabana</option>
                    <option value="CASA_TEMPORADA">Casa de temporada</option>
                  </select>
                </label>
              ) : (
                <label>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Categoria</span>
                  <select value={form.category} onChange={(event) => update('category', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                    <option value="PASSEIO">Passeio</option>
                    <option value="MASSAGEM">Massagem</option>
                    <option value="RESTAURANTE_VISITAR">Restaurante para visitar</option>
                    <option value="NOITE">Noite</option>
                    <option value="ATRATIVO">Atrativo</option>
                    <option value="SERVICO">Serviço</option>
                  </select>
                </label>
              )}

              <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome do chalé, pousada ou serviço" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              <textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Descrição pública" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              <input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Endereço" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              <input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.state} onChange={(event) => update('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} placeholder="WhatsApp público" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.instagramUrl} onChange={(event) => update('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.websiteUrl} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="Site" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />

              {form.partnerType === 'HOSPITALITY' ? (
                <textarea value={form.deliveryInstructions} onChange={(event) => update('deliveryInstructions', event.target.value)} placeholder="Instruções para entrega no local" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              ) : null}

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Responsável pelo cadastro</p>
              </div>
              <input required value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} placeholder="Nome do responsável" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input required type="email" value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} placeholder="E-mail do responsável" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input required value={form.responsiblePhone} onChange={(event) => update('responsiblePhone', event.target.value)} placeholder="WhatsApp do responsável" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              <textarea value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Mensagem para análise da plataforma" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
            </div>

            <button type="submit" disabled={saving || !form.destinationId} className="mt-5 w-full rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-22px_rgba(21,58,76,0.8)] disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar para aprovação'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
