// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPinLine, Plus, Trash, House, Suitcase, MapPin, CheckCircle, User, Phone, HashStraight } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { useToast } from '../contexts/ToastContext';

export function AddressDistance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsAddSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false); // Novo estado para geocoding

  const [form, setForm] = useState({
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
  });

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

  const loadAddresses = useCallback(async () => {
    try {
      const data = await customerAccountService.listAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Erro ao carregar endereços', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    const fetchAddressByCep = async () => {
      const cleanedCep = String(form.cep || '').replace(/\D/g, '');
      if (cleanedCep.length !== 8) return;

      setIsGeocoding(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const addressData = await response.json();
        if (!addressData?.erro) {
          setForm(prev => ({
            ...prev,
            cep: formatCepBr(cleanedCep),
            street: String(addressData?.logradouro || prev.street || ''),
            neighborhood: String(addressData?.bairro || prev.neighborhood || ''),
            city: String(addressData?.localidade || prev.city || ''),
            state: String(addressData?.uf || prev.state || '').toUpperCase().slice(0, 2),
            complement: prev.complement || String(addressData?.complemento || ''),
          }));
        }
      } catch (err) {
        // silent
      } finally {
        setIsGeocoding(false);
      }
    };
    const timer = setTimeout(fetchAddressByCep, 500);
    return () => clearTimeout(timer);
  }, [form.cep]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!form.cep || !form.street || !form.number || !form.neighborhood || !form.city || !form.state) {
      showToast('Preencha CEP, rua, número, bairro, cidade e estado corretamente.', 'warning');
      return;
    }
    setIsAddSubmitting(true);
    try {
      await customerAccountService.createAddress(form);
      showToast('Endereço adicionado!', 'success');
      setShowAddForm(false);
      setForm({
        label: 'Casa', street: '', number: '', complement: '',
        neighborhood: '', city: '', state: '', cep: '', recipientName: '', phone: ''
      });
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar endereço', 'error');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este endereço?')) return;
    try {
      await customerAccountService.deleteAddress(id);
      showToast('Endereço removido');
      loadAddresses();
    } catch (err) {
      showToast('Erro ao remover endereço', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_40%,#f8fafc_100%)] pb-16 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur-xl">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-90 transition-all"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-600">Minha conta</p>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Meus Endereços</h1>
            <p className="text-[11px] font-medium text-slate-500">Organize seus locais de entrega com rapidez.</p>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.3)]">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.5rem] bg-sky-50 text-sky-600 shadow-inner">
                <MapPinLine size={26} weight="duotone" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Entrega inteligente</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Salve seus endereços favoritos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  O app usa seu endereço principal para acelerar o checkout de entrega.
                </p>
              </div>
            </div>
          </section>

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[1.6rem] bg-[linear-gradient(135deg,#0f172a,#1e293b)] py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.7)] active:scale-[0.98] transition-all"
            >
              <Plus size={16} weight="bold" />
              Novo Endereço
            </button>
          )}

          {showAddForm && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-[0_30px_70px_-44px_rgba(15,23,42,0.34)]">
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Novo endereço</p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">Cadastrar endereço de entrega</h2>
                  </div>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddAddress} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Apelido</label>
                    <input
                      name="addressLabel"
                      placeholder="Casa, trabalho, mãe..."
                      value={form.label}
                      onChange={e => setForm({...form, label: e.target.value})}
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
                        onChange={e => setForm({...form, recipientName: e.target.value})}
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CEP</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <input
                        name="postalCode"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={e => setForm({...form, cep: formatCepBr(e.target.value)})}
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
                      onClick={() => setForm((prev) => ({ ...prev }))}
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
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">Preenchendo endereco</p>
                          <p className="text-xs font-medium text-sky-600">O CEP esta completando rua, bairro, cidade e UF...</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <Phone size={16} weight="duotone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="recipientPhone"
                    placeholder="Telefone do recebedor"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: formatPhoneBr(e.target.value)})}
                    inputMode="tel"
                    autoComplete="tel-national"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="grid grid-cols-[1fr_92px] gap-2">
                  <div className="relative">
                    <MapPinLine size={16} weight="duotone" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      name="addressLine1"
                      placeholder="Rua / Logradouro"
                      value={form.street}
                      onChange={e => setForm({...form, street: e.target.value})}
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
                      onChange={e => setForm({...form, number: e.target.value})}
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
                    onChange={e => setForm({...form, neighborhood: e.target.value})}
                    autoComplete="address-level3"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />

                  <input
                    name="addressCity"
                    placeholder="Cidade"
                    value={form.city}
                    onChange={e => setForm({...form, city: e.target.value})}
                    autoComplete="address-level2"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />

                  <input
                    name="addressState"
                    placeholder="UF"
                    value={form.state}
                    onChange={e => setForm({...form, state: String(e.target.value || '').toUpperCase().slice(0, 2)})}
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
                  onChange={e => setForm({...form, complement: e.target.value})}
                  autoComplete="address-line3"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-200 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a,#1e293b)] py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.7)] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Endereço'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white p-12 text-center">
                <MapPinLine size={48} weight="thin" className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400">Você ainda não tem endereços salvos.</p>
              </div>
            ) : (
              addresses.map(addr => (
                <div key={addr.id} className="group relative overflow-hidden rounded-[1.8rem] border border-slate-200/70 bg-white p-4 shadow-[0_22px_45px_-36px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_55px_-36px_rgba(15,23,42,0.34)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0ea5e9,#38bdf8,#ffffff)] opacity-80" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
                        addr.label === 'Casa' ? 'bg-sky-50 text-sky-600' : 
                        addr.label === 'Trabalho' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        {addr.label === 'Casa' ? <House size={24} weight="duotone" /> : 
                         addr.label === 'Trabalho' ? <Suitcase size={24} weight="duotone" /> : <MapPin size={24} weight="duotone" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <h3 className="max-w-full truncate text-sm font-black text-slate-900">{addr.label || 'Endereço'}</h3>
                          {addr.isDefault ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                              <CheckCircle size={11} weight="fill" />
                              Principal
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-600">{addr.street}, {addr.number || 's/n'}</p>
                        <p className="truncate text-[10px] font-medium text-slate-400">{addr.neighborhood} • {addr.city}/{addr.state}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {addr.isDefault ? null : (
                        <button
                          type="button"
                          onClick={async () => {
                            await customerAccountService.setDefaultAddress(addr.id);
                            showToast('Endereço principal atualizado.', 'success');
                            loadAddresses();
                          }}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-600 active:scale-95"
                        >
                          Principal
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-100 bg-white text-rose-500 active:bg-rose-50 transition-colors"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
