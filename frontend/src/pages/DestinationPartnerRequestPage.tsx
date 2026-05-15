// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Bed, CheckCircle, Compass, Handshake, ImageSquare, LinkSimpleHorizontal, Sparkle, UploadSimple } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { destinationService } from '../services/destinationService';
import { addressLookupService } from '../services/addressLookupService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { canUseNativeImagePicker, pickNativeImageAsDataUrl } from '../utils/nativeImagePicker';

const initialForm = {
  destinationId: '',
  destinationCity: '',
  destinationState: '',
  partnerType: 'HOSPITALITY',
  placeType: 'CHALE',
  category: 'SERVICO',
  name: '',
  description: '',
  zipCode: '',
  address: '',
  city: '',
  state: '',
  whatsapp: '',
  instagramUrl: '',
  websiteUrl: '',
  logoUrl: '',
  bannerUrl: '',
  imageUrl: '',
  logoFile: '',
  bannerFile: '',
  imageFile: '',
  deliveryInstructions: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  message: '',
};

const formatCepBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhoneBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_error'));
    reader.readAsDataURL(file);
  });

const compressImageFileToDataUrl = (file: File, maxEdge = 1600) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const width = Number(image.width || 0);
        const height = Number(image.height || 0);
        if (!width || !height) throw new Error('invalid_image');
        const ratio = Math.min(1, maxEdge / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * ratio));
        const targetHeight = Math.max(1, Math.round(height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_error');
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
        let quality = 0.86;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1_200_000 && quality > 0.62) {
          quality -= 0.06;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image_load_error'));
    };
    image.src = objectUrl;
  });

const prepareImageUpload = async (file: File, maxEdge = 1600) => {
  if (!file.type.startsWith('image/')) throw new Error('invalid_file_type');
  if (file.type === 'image/gif') return readFileAsDataUrl(file);
  try {
    return await compressImageFileToDataUrl(file, maxEdge);
  } catch {
    return readFileAsDataUrl(file);
  }
};

const MediaUploadField = ({ label, hint, urlValue, fileValue, onUrlChange, onFileChange, onError, maxEdge = 1600 }: any) => {
  const previewUrl = fileValue || resolveAssetUrl(urlValue || '') || '';
  const canUseNativePicker = canUseNativeImagePicker();

  const handleFile = async (event: any) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await prepareImageUpload(file, maxEdge);
      onFileChange(dataUrl);
      onUrlChange('');
    } catch {
      onError?.('Não foi possível carregar a imagem selecionada.');
    }
  };

  const handleNativePicker = async () => {
    try {
      const dataUrl = await pickNativeImageAsDataUrl({
        quality: maxEdge > 1600 ? 78 : 82,
        promptLabelHeader: label,
      });
      if (!dataUrl) return;
      onFileChange(dataUrl);
      onUrlChange('');
    } catch {
      onError?.('Não foi possível abrir a câmera ou galeria agora.');
    }
  };

  return (
    <div className="sm:col-span-2 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-3">
      <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageSquare size={34} weight="duotone" className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canUseNativePicker ? (
              <button type="button" onClick={handleNativePicker} className="inline-flex items-center gap-2 rounded-full bg-[#153A4C] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                Tirar ou escolher foto
              </button>
            ) : (
              <label className="relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-[#153A4C] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                Escolher foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFile}
                />
              </label>
            )}
            {(fileValue || urlValue) ? (
              <button type="button" onClick={() => { onFileChange(''); onUrlChange(''); }} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-600">
                Limpar
              </button>
            ) : null}
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <LinkSimpleHorizontal size={16} weight="bold" className="text-slate-400" />
            <input
              value={urlValue || ''}
              onChange={(event) => {
                onUrlChange(event.target.value);
                if (event.target.value) onFileChange('');
              }}
              placeholder="Ou cole uma URL pública da imagem"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export function DestinationPartnerRequestPage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [destinationMode, setDestinationMode] = useState<'existing' | 'new'>('existing');
  const [selectedDestinationState, setSelectedDestinationState] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupError, setZipLookupError] = useState('');

  useEffect(() => {
    let active = true;
    destinationService
      .listPublic()
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : [];
        const firstDestination = rows[0] || null;
        setDestinations(rows);
        setSelectedDestinationState((current) => current || String(firstDestination?.state || '').toUpperCase().slice(0, 2));
        if (!rows.length) setDestinationMode('new');
        setForm((current) => ({
          ...current,
          destinationId: current.destinationId || firstDestination?.id || '',
          destinationCity: current.destinationCity || firstDestination?.city || firstDestination?.name || '',
          destinationState: current.destinationState || String(firstDestination?.state || '').toUpperCase().slice(0, 2),
          city: current.city || firstDestination?.city || firstDestination?.name || '',
          state: current.state || String(firstDestination?.state || '').toUpperCase().slice(0, 2),
        }));
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

  useEffect(() => {
    const cleanedCep = String(form.zipCode || '').replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setZipLookupError('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setZipLookupLoading(true);
      setZipLookupError('');
      try {
        const addressData = await addressLookupService.lookupZipCode(cleanedCep);
        if (!active || !addressData) return;
        setForm((current) => ({
          ...current,
          zipCode: formatCepBr(cleanedCep),
          address: String(addressData?.street || current.address || ''),
          city: String(addressData?.city || current.city || ''),
          state: String(addressData?.state || current.state || '').toUpperCase().slice(0, 2),
        }));
      } catch {
        if (active) setZipLookupError('Não encontramos esse CEP. Preencha o endereço manualmente.');
      } finally {
        if (active) setZipLookupLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.zipCode]);

  const update = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const stateOptions = useMemo(() => {
    return Array.from(new Set(destinations.map((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2)).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    if (!selectedDestinationState) return destinations;
    return destinations.filter((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2) === selectedDestinationState);
  }, [destinations, selectedDestinationState]);

  const selectedDestination = useMemo(() => {
    return destinations.find((destination: any) => String(destination.id) === String(form.destinationId)) || null;
  }, [destinations, form.destinationId]);

  const updateDestinationFromExisting = (destination: any) => {
    const city = String(destination?.city || destination?.name || '').trim();
    const state = String(destination?.state || '').toUpperCase().slice(0, 2);
    setForm((current) => ({
      ...current,
      destinationId: destination?.id || '',
      destinationCity: city,
      destinationState: state,
      city,
      state,
    }));
  };

  const handleDestinationStateChange = (state: string) => {
    const normalizedState = String(state || '').toUpperCase().slice(0, 2);
    setSelectedDestinationState(normalizedState);
    const nextDestination = destinations.find((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2) === normalizedState);
    updateDestinationFromExisting(nextDestination || null);
  };

  const handleDestinationChange = (destinationId: string) => {
    const destination = destinations.find((item: any) => String(item.id) === String(destinationId));
    updateDestinationFromExisting(destination || null);
  };

  const updatePartnerType = (value: string) => setForm((current) => ({
    ...current,
    partnerType: value,
    logoUrl: '',
    bannerUrl: '',
    imageUrl: '',
    logoFile: '',
    bannerFile: '',
    imageFile: '',
  }));

  const submit = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(null);
    try {
      const isNewDestination = destinationMode === 'new';
      const destinationCity = String(isNewDestination ? form.destinationCity : selectedDestination?.city || selectedDestination?.name || form.destinationCity).trim();
      const destinationState = String(isNewDestination ? form.destinationState : selectedDestination?.state || form.destinationState).toUpperCase().slice(0, 2);
      if (!destinationCity || !destinationState || (!isNewDestination && !form.destinationId)) {
        throw new Error('Escolha a cidade do destino ou solicite uma nova cidade.');
      }

      const payload = await destinationService.createPartnerRequest({
        ...form,
        destinationId: isNewDestination ? '' : form.destinationId,
        destinationCity,
        destinationState,
        city: form.city || destinationCity,
        state: form.state || destinationState,
      });
      setSuccess(payload);
      setForm((current) => ({
        ...initialForm,
        destinationId: isNewDestination ? '' : current.destinationId,
        destinationCity: isNewDestination ? '' : destinationCity,
        destinationState: isNewDestination ? '' : destinationState,
        city: isNewDestination ? '' : destinationCity,
        state: isNewDestination ? '' : destinationState,
        partnerType: current.partnerType,
      }));
      if (isNewDestination && destinations.length) setDestinationMode('existing');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const canSubmitDestination = destinationMode === 'new'
    ? Boolean(String(form.destinationCity || '').trim() && String(form.destinationState || '').trim())
    : Boolean(form.destinationId);

  return (
    <PublicDestinationShell active="register" backTo="/destinos" backLabel="Destinos" contextLabel="Cadastro de parceiro" ctaTo="/destinos" ctaLabel="Ver destinos">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="overflow-hidden rounded-[2rem] bg-[#153A4C] p-5 text-white shadow-[0_24px_70px_-42px_rgba(21,58,76,0.8)] sm:p-6 lg:sticky lg:top-28">
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
              <div className="sm:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cidade do destino</span>
                    <p className="mt-1 text-sm font-bold text-slate-800">Destino aqui é a cidade turística onde o parceiro quer aparecer.</p>
                  </div>
                  <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
                    <button type="button" onClick={() => setDestinationMode('existing')} className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] ${destinationMode === 'existing' ? 'bg-[#153A4C] text-white' : 'text-slate-500'}`}>
                      Cidade aberta
                    </button>
                    <button type="button" onClick={() => setDestinationMode('new')} className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] ${destinationMode === 'new' ? 'bg-[#153A4C] text-white' : 'text-slate-500'}`}>
                      Nova cidade
                    </button>
                  </div>
                </div>

                {destinationMode === 'existing' ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">UF</span>
                      <select value={selectedDestinationState} onChange={(event) => handleDestinationStateChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                        {stateOptions.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cidade</span>
                      <select value={form.destinationId} onChange={(event) => handleDestinationChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" required>
                        {filteredDestinations.map((destination) => (
                          <option key={destination.id} value={destination.id}>{destination.city || destination.name}</option>
                        ))}
                      </select>
                    </label>
                    {filteredDestinations.length === 0 ? (
                      <p className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-bold text-slate-500">
                        Ainda não temos cidade aberta nesta UF. Use “Nova cidade” para enviar para análise.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">UF</span>
                      <input value={form.destinationState} onChange={(event) => update('destinationState', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
                    </label>
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cidade turística</span>
                      <input value={form.destinationCity} onChange={(event) => update('destinationCity', event.target.value)} placeholder="Ex: Gonçalves" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
                    </label>
                    <p className="sm:col-span-2 rounded-2xl bg-amber-50 px-3 py-3 text-xs font-bold leading-relaxed text-amber-800">
                      A cidade entra como destino em análise. O SuperAdmin revisa, completa fotos/textos e ativa quando estiver pronta.
                    </p>
                  </div>
                )}
              </div>

              <label>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Tipo de parceiro</span>
                <select value={form.partnerType} onChange={(event) => updatePartnerType(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
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
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[160px_1fr]">
                <div>
                  <input value={form.zipCode} onChange={(event) => update('zipCode', formatCepBr(event.target.value))} placeholder="CEP" inputMode="numeric" autoComplete="postal-code" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
                  {zipLookupLoading ? <p className="mt-1 px-1 text-[11px] font-bold text-[#336886]">Buscando endereço...</p> : null}
                  {zipLookupError ? <p className="mt-1 px-1 text-[11px] font-bold text-rose-600">{zipLookupError}</p> : null}
                </div>
                <input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Endereço" autoComplete="address-line1" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              </div>
              <p className="sm:col-span-2 rounded-2xl bg-[#edf5fa] px-3 py-3 text-xs font-bold leading-relaxed text-[#153A4C]">
                Cidade do cadastro: {destinationMode === 'new' ? (form.destinationCity || 'nova cidade') : (selectedDestination?.city || selectedDestination?.name || 'cidade selecionada')}{' '}
                {destinationMode === 'new' ? form.destinationState : selectedDestination?.state ? `- ${selectedDestination.state}` : ''}.
              </p>
              <input value={form.whatsapp} onChange={(event) => update('whatsapp', formatPhoneBr(event.target.value))} placeholder="WhatsApp público" inputMode="tel" autoComplete="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.instagramUrl} onChange={(event) => update('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input value={form.websiteUrl} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="Site, Airbnb, Booking ou cardápio" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />

              {form.partnerType === 'HOSPITALITY' ? (
                <>
                  <MediaUploadField
                    label="Foto/banner da hospedagem"
                    hint="Imagem principal que aparece no card do chalé ou pousada."
                    urlValue={form.bannerUrl}
                    fileValue={form.bannerFile}
                    onUrlChange={(value: string) => update('bannerUrl', value)}
                    onFileChange={(value: string) => update('bannerFile', value)}
                    onError={setError}
                    maxEdge={1800}
                  />
                  <MediaUploadField
                    label="Logo ou foto complementar"
                    hint="Opcional. Ajuda a identificar sua hospedagem na curadoria."
                    urlValue={form.logoUrl}
                    fileValue={form.logoFile}
                    onUrlChange={(value: string) => update('logoUrl', value)}
                    onFileChange={(value: string) => update('logoFile', value)}
                    onError={setError}
                    maxEdge={900}
                  />
                  <textarea value={form.deliveryInstructions} onChange={(event) => update('deliveryInstructions', event.target.value)} placeholder="Instruções para entrega no local" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
                </>
              ) : (
                <MediaUploadField
                  label="Foto do serviço ou lugar"
                  hint="Imagem usada no card público de experiências e serviços locais."
                  urlValue={form.imageUrl}
                  fileValue={form.imageFile}
                  onUrlChange={(value: string) => update('imageUrl', value)}
                  onFileChange={(value: string) => update('imageFile', value)}
                  onError={setError}
                  maxEdge={1400}
                />
              )}

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Responsável pelo cadastro</p>
              </div>
              <input required value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} placeholder="Nome do responsável" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input required type="email" value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} placeholder="E-mail do responsável" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" />
              <input required value={form.responsiblePhone} onChange={(event) => update('responsiblePhone', formatPhoneBr(event.target.value))} placeholder="WhatsApp do responsável" inputMode="tel" autoComplete="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
              <textarea value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Mensagem para análise da plataforma" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886] sm:col-span-2" />
            </div>

            <button type="submit" disabled={saving || !canSubmitDestination} className="mt-5 w-full rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-22px_rgba(21,58,76,0.8)] disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar para aprovação'}
            </button>
          </form>
        </div>
      </div>
    </PublicDestinationShell>
  );
}
