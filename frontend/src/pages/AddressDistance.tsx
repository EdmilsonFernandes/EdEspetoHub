// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPinLine, Plus, Trash, House, Suitcase, MapPin, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { mapsService } from '../services/mapsService'; // Importar mapsService
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

  // Efeito para preencher endereço automaticamente pelo CEP
  useEffect(() => {
    const fetchAddressByCep = async () => {
      const cleanedCep = String(form.cep || '').replace(/\D/g, '');
      if (cleanedCep.length !== 8) return;

      setIsGeocoding(true);
      try {
        const addressData = await mapsService.geocode(cleanedCep);
        if (addressData) {
          setForm(prev => ({
            ...prev,
            street: addressData.street || prev.street,
            neighborhood: addressData.neighborhood || prev.neighborhood,
            city: addressData.city || prev.city,
            state: addressData.state || prev.state,
            complement: addressData.complement || prev.complement,
          }));
        }
      } catch (err) {
        // showToast('CEP não encontrado ou inválido', 'warning');
      } finally {
        setIsGeocoding(false);
      }
    };
    const timer = setTimeout(fetchAddressByCep, 500); // Debounce
    return () => clearTimeout(timer);
  }, [form.cep]); // Dispara quando o CEP muda

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
    <div className="min-h-screen bg-slate-50 pb-12 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Meus Endereços</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Locais de entrega</p>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
            >
              <Plus size={16} weight="bold" />
              Novo Endereço
            </button>
          )}

          {showAddForm && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-[2.5rem] bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Cadastrar Endereço</h2>
                <button onClick={() => setShowAddForm(false)} className="text-xs font-bold text-slate-400">Cancelar</button>
              </div>

              <form onSubmit={handleAddAddress} className="space-y-3">
                <input
                  placeholder="CEP"
                  value={form.cep}
                  onChange={e => setForm({...form, cep: e.target.value})}
                  className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                  disabled={isGeocoding}
                />

                <input
                  placeholder="Nome do Recebedor"
                  value={form.recipientName}
                  onChange={e => setForm({...form, recipientName: e.target.value})}
                  className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />

                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <input
                    placeholder="Rua / Logradouro"
                    value={form.street}
                    onChange={e => setForm({...form, street: e.target.value})}
                    className="rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                  />
                  <input
                    placeholder="Nº"
                    value={form.number}
                    onChange={e => setForm({...form, number: e.target.value})}
                    className="rounded-2xl bg-slate-50 border-none px-2 py-3 text-center text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                  />
                </div>

                <input
                  placeholder="Bairro"
                  value={form.neighborhood}
                  onChange={e => setForm({...form, neighborhood: e.target.value})}
                  className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />

                <input
                  placeholder="Cidade"
                  value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                  className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-[1.5rem] bg-emerald-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
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
                <div key={addr.id} className="group relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-5 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
                        addr.label === 'Casa' ? 'bg-sky-50 text-sky-600' : 
                        addr.label === 'Trabalho' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        {addr.label === 'Casa' ? <House size={24} weight="duotone" /> : 
                         addr.label === 'Trabalho' ? <Suitcase size={24} weight="duotone" /> : <MapPin size={24} weight="duotone" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900">{addr.label || 'Endereço'}</h3>
                        <p className="truncate text-xs font-bold text-slate-500 mt-0.5">{addr.street}, {addr.number}</p>
                        <p className="truncate text-[10px] font-medium text-slate-400">{addr.neighborhood} • {addr.city}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-100 text-rose-500 active:bg-rose-50 transition-colors"
                    >
                      <Trash size={18} weight="bold" />
                    </button>
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
