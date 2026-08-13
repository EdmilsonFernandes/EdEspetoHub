// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPinLine,
  Plus,
  Trash,
  House,
  Suitcase,
  MapPin,
  CheckCircle,
  User,
  Phone,
  HashStraight,
  PencilSimple,
  Star,
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { addressLookupService } from '../services/addressLookupService';
import { condominiumService } from '../services/condominiumService';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { AppGlassHeader } from '../components/common/AppGlassHeader';

const CUSTOMER_ADDRESS_UPDATED_EVENT = 'jnc:customer-addresses-updated';

const createEmptyForm = () => ({
  label: 'Casa',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  cep: '',
  recipientName: '',
  phone: '',
  lat: null,
  lng: null,
  condominiumId: '',
  condominiumBlock: '',
  condominiumUnit: '',
});

const formatCepBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhoneBr = (value: string) => {
  const rawDigits = String(value || '').replace(/\D/g, '');
  const digits = rawDigits.startsWith('55') && rawDigits.length > 11
    ? rawDigits.slice(2, 13)
    : rawDigits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const buildCondoComplement = (block?: string | null, unit?: string | null) =>
  [block ? `Bloco ${block}` : '', unit ? `Apto ${unit}` : ''].filter(Boolean).join(' · ');

const normalizeAddressToForm = (address: any) => ({
  label: String(address?.label || 'Casa'),
  street: String(address?.street || ''),
  number: String(address?.number || ''),
  complement: String(address?.complement || ''),
  neighborhood: String(address?.neighborhood || ''),
  city: String(address?.city || ''),
  state: String(address?.state || '').toUpperCase().slice(0, 2),
  cep: formatCepBr(address?.cep || ''),
  recipientName: String(address?.recipientName || ''),
  phone: formatPhoneBr(address?.phone || ''),
  lat: address?.lat ?? null,
  lng: address?.lng ?? null,
  condominiumId: address?.condominiumId || '',
  condominiumBlock: address?.condominiumBlock || '',
  condominiumUnit: address?.condominiumUnit || '',
});

const getAddressTone = (label: string, isDefault: boolean) => {
  if (isDefault) {
    return {
      iconWrap: 'bg-white text-[#336886] shadow-[0_14px_30px_-24px_rgba(51,104,134,0.72)] ring-1 ring-[#cfe0ea]',
      accent: 'from-[#153A4C] via-[#336886] to-sky-300',
      badge: 'border-[#cfe0ea] bg-white text-[#336886]',
      border: 'border-[#b9d3e2] bg-[linear-gradient(145deg,#ffffff_0%,#f4f9fc_100%)] ring-2 ring-[#336886]/8',
      glow: 'shadow-[0_28px_60px_-38px_rgba(51,104,134,0.46)]',
    };
  }

  if (label === 'Casa') {
    return {
      iconWrap: 'bg-sky-50 text-sky-600',
      accent: 'from-sky-500 via-sky-300 to-white',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
      border: 'border-slate-200/70',
      glow: 'shadow-[0_22px_45px_-36px_rgba(15,23,42,0.28)]',
    };
  }

  if (label === 'Trabalho') {
    return {
      iconWrap: 'bg-slate-100 text-slate-700',
      accent: 'from-[#153A4C] via-[#7ea0b6] to-white',
      badge: 'border-slate-200 bg-slate-100 text-slate-700',
      border: 'border-slate-200/70',
      glow: 'shadow-[0_22px_45px_-36px_rgba(15,23,42,0.28)]',
    };
  }

  return {
    iconWrap: 'bg-slate-50 text-slate-600',
    accent: 'from-slate-500 via-slate-300 to-white',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    border: 'border-slate-200/70',
    glow: 'shadow-[0_22px_45px_-36px_rgba(15,23,42,0.28)]',
  };
};

const buildAddressTitle = (address: any) =>
  [address?.street, address?.number ? `, ${address.number}` : '', address?.complement ? ` • ${address.complement}` : '']
    .join('')
    .trim();

const buildAddressMeta = (address: any) =>
  [address?.neighborhood, address?.city && address?.state ? `${address.city}/${address.state}` : '', address?.cep ? `CEP ${formatCepBr(address.cep)}` : '']
    .filter(Boolean)
    .join(' • ');

export function AddressDistance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get('mode') === 'new');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [condominiums, setCondominiums] = useState<any[]>([]);

  const clearNewModeParam = useCallback(() => {
    if (!searchParams.get('mode')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetFormState = useCallback(() => {
    setForm(createEmptyForm());
    setEditingAddressId(null);
    setShowForm(false);
    clearNewModeParam();
  }, [clearNewModeParam]);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await customerAccountService.listAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      showToast('Erro ao carregar endereços', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    let active = true;
    condominiumService
      .listPublic()
      .then((rows: any) => { if (active) setCondominiums(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setCondominiums([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (searchParams.get('mode') !== 'new') return;
    setEditingAddressId(null);
    setForm(createEmptyForm());
    setShowForm(true);
  }, [searchParams]);

  useEffect(() => {
    const fetchAddressByCep = async () => {
      const cleanedCep = String(form.cep || '').replace(/\D/g, '');
      if (cleanedCep.length !== 8) return;
      // Quando o endereço é de condomínio, o macro endereço vem do condomínio (não do CEP).
      if (form.condominiumId) return;

      setIsGeocoding(true);
      try {
        const addressData = await addressLookupService.lookupZipCode(cleanedCep);
        if (addressData) {
          setForm(prev => ({
            ...prev,
            cep: formatCepBr(cleanedCep),
            street: String(addressData?.street || prev.street || ''),
            neighborhood: String(addressData?.district || prev.neighborhood || ''),
            city: String(addressData?.city || prev.city || ''),
            state: String(addressData?.state || prev.state || '').toUpperCase().slice(0, 2),
            lat: addressData?.latitude ?? prev.lat ?? null,
            lng: addressData?.longitude ?? prev.lng ?? null,
          }));
        }
      } catch {
        // silent
      } finally {
        setIsGeocoding(false);
      }
    };

    const timer = setTimeout(fetchAddressByCep, 500);
    return () => clearTimeout(timer);
  }, [form.cep]);

  const handleOpenNewForm = () => {
    setEditingAddressId(null);
    setForm(createEmptyForm());
    setShowForm(true);
    clearNewModeParam();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditAddress = (address: any) => {
    setEditingAddressId(address.id);
    setForm(normalizeAddressToForm(address));
    setShowForm(true);
    clearNewModeParam();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCondominium = (condoId: string) => {
    const condo = condominiums.find((c: any) => c?.id === condoId) || null;
    if (!condo) {
      setForm(prev => ({ ...prev, condominiumId: '', condominiumBlock: '', condominiumUnit: '' }));
      return;
    }
    setForm(prev => ({
      ...prev,
      condominiumId: condo.id,
      label: (!prev.label || prev.label === 'Casa') ? condo.name : prev.label,
      cep: formatCepBr(condo.zipCode || condo.zip_code || condo.cep || prev.cep || ''),
      street: condo.address || condo.name || prev.street || '',
      city: condo.city || prev.city || '',
      state: String(condo.state || prev.state || '').toUpperCase().slice(0, 2),
      number: '',
      complement: buildCondoComplement(prev.condominiumBlock, prev.condominiumUnit),
      lat: condo.lat ?? prev.lat ?? null,
      lng: condo.lng ?? prev.lng ?? null,
    }));
  };

  const handleSubmitAddress = async (e) => {
    e.preventDefault();

    const isCondominiumAddress = Boolean(form.condominiumId);
    if (isCondominiumAddress) {
      if (!form.condominiumBlock || !form.condominiumUnit || !form.cep || !form.street || !form.city || !form.state) {
        showToast('Selecione o condomínio e informe bloco e apartamento.', 'warning');
        return;
      }
    } else if (!form.cep || !form.street || !form.number || !form.neighborhood || !form.city || !form.state) {
      showToast('Preencha CEP, rua, número, bairro, cidade e estado corretamente.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAddressId) {
        await customerAccountService.updateAddress(editingAddressId, form);
        showToast('Endereço atualizado com sucesso.', 'success');
      } else {
        await customerAccountService.createAddress(form);
        showToast('Endereço adicionado!', 'success');
      }
      window.dispatchEvent(new CustomEvent(CUSTOMER_ADDRESS_UPDATED_EVENT));
      resetFormState();
      await loadAddresses();
    } catch (err) {
      showToast(err?.message || 'Erro ao salvar endereço', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await customerAccountService.setDefaultAddress(addressId);
      showToast('Endereço principal atualizado.', 'success');
      window.dispatchEvent(new CustomEvent(CUSTOMER_ADDRESS_UPDATED_EVENT));
      await loadAddresses();
    } catch {
      showToast('Erro ao atualizar endereço principal.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await customerAccountService.deleteAddress(deleteTarget.id);
      showToast('Endereço removido.', 'success');
      if (editingAddressId === deleteTarget.id) {
        resetFormState();
      }
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent(CUSTOMER_ADDRESS_UPDATED_EVENT));
      await loadAddresses();
    } catch {
      showToast('Erro ao remover endereço', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const defaultAddress = addresses.find((address: any) => address?.isDefault) || addresses[0] || null;
  const activeAddressTitle = defaultAddress ? buildAddressTitle(defaultAddress) : '';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_40%,#f8fafc_100%)] pb-16 pt-[calc(env(safe-area-inset-top)+4.35rem)]">
      <div className="mx-auto max-w-2xl">
        <AppGlassHeader
          title="Meus Endereços"
          eyebrow="Área do cliente"
          subtitle={activeAddressTitle || 'Escolha o endereço principal'}
          backTo="/cliente/conta"
          onBack={() => navigate('/cliente/conta')}
        />

        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-3 rounded-[1.8rem] bg-white/72 p-3 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 px-1">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]">
                <MapPinLine size={20} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">
                  {addresses.length} {addresses.length === 1 ? 'endereço salvo' : 'endereços salvos'}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {defaultAddress ? `${defaultAddress.label || 'Principal'} • ${activeAddressTitle}` : 'Cadastre seu endereço principal.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenNewForm}
              className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_20px_45px_-28px_rgba(51,104,134,0.55)] transition-all active:scale-[0.98] sm:w-auto"
            >
              <Plus size={16} weight="bold" />
              Novo endereço
            </button>
          </div>

          {showForm ? (
            <button
              type="button"
              onClick={resetFormState}
              className="w-full rounded-[1.35rem] border border-slate-200 bg-white px-5 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-all active:scale-[0.98]"
            >
              Fechar edição
            </button>
          ) : null}

          {showForm ? (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-[0_30px_70px_-44px_rgba(15,23,42,0.34)]">
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {editingAddressId ? 'Editar endereço' : 'Novo endereço'}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">
                      {editingAddressId ? 'Atualizar informações de entrega' : 'Cadastrar endereço de entrega'}
                    </h2>
                  </div>
                  <button
                    onClick={resetFormState}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitAddress} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Apelido</label>
                    <input
                      name="addressLabel"
                      placeholder="Casa, trabalho, mãe..."
                      value={form.label}
                      onChange={e => setForm({ ...form, label: e.target.value })}
                      autoCapitalize="words"
                      enterKeyHint="next"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recebedor</label>
                    <div className="relative">
                      <User size={16} weight="duotone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="recipientName"
                        placeholder="Nome do recebedor"
                        value={form.recipientName}
                        onChange={e => setForm({ ...form, recipientName: e.target.value })}
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Condomínio (opcional) — morador vincula o endereço a um condomínio real (admin-curated) */}
                <div className={`rounded-2xl border p-4 ${form.condominiumId ? 'border-sky-200 bg-sky-50/60' : 'border-slate-200 bg-slate-50'}`}>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Condomínio (opcional)</label>
                  <div className="relative mt-2">
                    <House size={16} weight="duotone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={form.condominiumId || ''}
                      onChange={e => handleSelectCondominium(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">Endereço comum (sem condomínio)</option>
                      {condominiums.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {form.condominiumId ? (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          placeholder="Bloco / Torre"
                          value={form.condominiumBlock}
                          onChange={e => {
                            const nextBlock = e.target.value;
                            setForm(prev => ({ ...prev, condominiumBlock: nextBlock, complement: buildCondoComplement(nextBlock, prev.condominiumUnit) }));
                          }}
                          enterKeyHint="next"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-sky-200 focus:ring-2 focus:ring-sky-100"
                        />
                        <input
                          placeholder="Apto / Unidade"
                          value={form.condominiumUnit}
                          onChange={e => {
                            const nextUnit = e.target.value;
                            setForm(prev => ({ ...prev, condominiumUnit: nextUnit, complement: buildCondoComplement(prev.condominiumBlock, nextUnit) }));
                          }}
                          enterKeyHint="next"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-sky-200 focus:ring-2 focus:ring-sky-100"
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-medium text-sky-700">
                        Usando o endereço do condomínio. Bloco e apartamento identificam a sua unidade.
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CEP</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <input
                        name="postalCode"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={e => setForm({ ...form, cep: formatCepBr(e.target.value) })}
                        autoComplete="postal-code"
                        inputMode="numeric"
                        enterKeyHint="next"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                        disabled={isGeocoding}
                      />
                      {isGeocoding ? (
                        <span className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm"
                      disabled
                    >
                      {isGeocoding ? 'Buscando...' : 'Busca auto'}
                    </button>
                  </div>
                  {isGeocoding ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">Preenchendo endereço</p>
                          <p className="text-xs font-medium text-sky-600">O CEP está completando rua, bairro, cidade e UF.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 transition-all focus-within:border-sky-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
                  <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 shadow-sm">
                    <Phone size={14} weight="duotone" className="text-slate-400" />
                    🇧🇷 +55
                  </span>
                  <input
                    name="recipientPhone"
                    placeholder="Telefone do recebedor"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: formatPhoneBr(e.target.value) })}
                    inputMode="tel"
                    autoComplete="tel-national"
                    enterKeyHint="next"
                    className="min-w-0 flex-1 bg-transparent py-3 pl-3 pr-4 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-[1fr_92px] gap-2">
                  <div className="relative">
                    <MapPinLine size={16} weight="duotone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      name="addressLine1"
                      placeholder="Rua / Logradouro"
                      value={form.street}
                      onChange={e => setForm({ ...form, street: e.target.value })}
                      autoComplete="address-line1"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="relative">
                    <HashStraight size={16} weight="duotone" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      name="addressNumber"
                      placeholder="Nº"
                      value={form.number}
                      onChange={e => setForm({ ...form, number: e.target.value })}
                      autoComplete="address-line2"
                      enterKeyHint="next"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-2 text-center text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_0.92fr_110px]">
                  <input
                    name="addressNeighborhood"
                    placeholder="Bairro"
                    value={form.neighborhood}
                    onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                    autoComplete="address-level3"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />

                  <input
                    name="addressCity"
                    placeholder="Cidade"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    autoComplete="address-level2"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />

                  <input
                    name="addressState"
                    placeholder="UF"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: String(e.target.value || '').toUpperCase().slice(0, 2) })}
                    autoComplete="address-level1"
                    autoCapitalize="characters"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <input
                  name="addressComplement"
                  placeholder="Complemento"
                  value={form.complement}
                  onChange={e => setForm({ ...form, complement: e.target.value })}
                  autoComplete="address-line3"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-[1.5rem] bg-[linear-gradient(135deg,#153A4C,#336886)] py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[0_20px_45px_-28px_rgba(51,104,134,0.55)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingAddressId ? 'Salvar alterações' : 'Salvar endereço'}
                </button>
              </form>
            </div>
          ) : null}

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white p-12 text-center">
                <MapPinLine size={48} weight="thin" className="mx-auto mb-4 text-slate-200" />
                <p className="text-sm font-bold text-slate-400">Você ainda não tem endereços salvos.</p>
              </div>
            ) : (
              addresses.map((addr: any) => {
                const tone = getAddressTone(String(addr?.label || ''), Boolean(addr?.isDefault));
                const icon =
                  addr.label === 'Casa' ? (
                    <House size={24} weight="duotone" />
                  ) : addr.label === 'Trabalho' ? (
                    <Suitcase size={24} weight="duotone" />
                  ) : (
                    <MapPin size={24} weight="duotone" />
                  );

                return (
                  <div
                    key={addr.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEditAddress(addr)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleEditAddress(addr);
                      }
                    }}
                    className={`group relative overflow-hidden rounded-[1.9rem] border p-4 transition-all hover:-translate-y-0.5 ${addr.isDefault ? '' : 'bg-white'} ${tone.border} ${tone.glow}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.accent}`} />

                    <div className="flex items-start gap-3">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone.iconWrap}`}>
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">{addr.label || 'Endereço'}</h3>
                          {addr.isDefault ? (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] shadow-sm ${tone.badge}`}>
                              <Star size={11} weight="fill" />
                              Principal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
                              Toque para editar
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-bold leading-5 text-slate-700">{buildAddressTitle(addr)}</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{buildAddressMeta(addr)}</p>

                        {addr.recipientName || addr.phone ? (
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                            {addr.recipientName ? (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <User size={13} weight="duotone" className="shrink-0 text-slate-400" />
                                <span className="truncate">{addr.recipientName}</span>
                              </span>
                            ) : null}
                            {addr.phone ? (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Phone size={13} weight="duotone" className="shrink-0 text-slate-400" />
                                <span className="truncate">🇧🇷 +55 {formatPhoneBr(addr.phone)}</span>
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_40px_40px] items-center gap-2">
                          {!addr.isDefault ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSetDefault(addr.id);
                              }}
                              className="inline-flex min-w-0 items-center justify-center gap-1.5 truncate rounded-2xl border border-[#cfe0ea] bg-[#edf5fa] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-[0_14px_28px_-26px_rgba(51,104,134,0.45)] transition-all active:scale-95"
                            >
                              <CheckCircle size={13} weight="fill" />
                              <span className="truncate">Definir principal</span>
                            </button>
                          ) : (
                            <span className="inline-flex min-w-0 items-center justify-center gap-1.5 truncate rounded-2xl border border-[#cfe0ea] bg-white px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-sm">
                              <Star size={13} weight="fill" />
                              <span className="truncate">Principal ativo</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditAddress(addr);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all active:scale-95"
                            aria-label="Editar endereço"
                          >
                            <PencilSimple size={13} weight="bold" />
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(addr);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition-all active:scale-95"
                            aria-label="Excluir endereço"
                          >
                            <Trash size={13} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleteLoading}
        title="Excluir este endereço?"
        description={
          deleteTarget
            ? `Remover ${deleteTarget.label || 'este endereço'} da sua conta. Se ele for o principal, o sistema promove outro endereço salvo automaticamente.`
            : ''
        }
        confirmLabel="Excluir endereço"
        cancelLabel="Manter endereço"
        variant="danger"
      />
    </div>
  );
}
