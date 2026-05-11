// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bed, Buildings, CheckCircle, Compass, Eye, EyeSlash, MapTrifold, PencilSimple, Plus, Sparkle, Storefront, WarningCircle } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

const emptyDestination = {
  name: '',
  slug: '',
  city: '',
  state: 'SP',
  description: '',
  heroTitle: '',
  heroSubtitle: '',
  logoUrl: '',
  bannerUrl: '',
  lat: '',
  lng: '',
  active: true,
  sortOrder: 0,
};

const emptyPlace = {
  destinationId: '',
  name: '',
  slug: '',
  type: 'CHALE',
  description: '',
  address: '',
  city: '',
  state: '',
  whatsapp: '',
  websiteUrl: '',
  instagramUrl: '',
  logoUrl: '',
  bannerUrl: '',
  lat: '',
  lng: '',
  deliveryInstructions: '',
  active: true,
  sortOrder: 0,
};

const emptyListing = {
  destinationId: '',
  hospitalityPlaceId: '',
  title: '',
  category: 'SERVICO',
  description: '',
  address: '',
  whatsapp: '',
  websiteUrl: '',
  instagramUrl: '',
  imageUrl: '',
  ctaType: 'WHATSAPP',
  ctaUrl: '',
  active: true,
  featured: false,
  sortOrder: 0,
};

const emptyStoreLink = {
  placeId: '',
  storeId: '',
  deliveryEnabled: true,
  pickupEnabled: false,
  deliveryFee: '',
  estimatedMinutes: '',
  notes: '',
  recommended: false,
};

const imageFor = (item: any) =>
  resolveAssetUrl(item?.bannerUrl || item?.logoUrl || item?.imageUrl || '') ||
  getStoreAvatarUrl(item?.slug || item?.id, item?.name || item?.title);

const requestTone = (status?: string) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (normalized === 'cancelled') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

const normalizeSearch = (value: any) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const statusPill = (active: any) =>
  active === false
    ? 'border-slate-200 bg-slate-100 text-slate-600'
    : 'border-emerald-100 bg-emerald-50 text-emerald-700';

const activeLabel = (active: any) => (active === false ? 'Inativo' : 'Ativo');

const toFormValue = (value: any) => (value === null || value === undefined ? '' : value);

const toBool = (value: any) => value === true || String(value).toLowerCase() === 'true';

export function SuperAdminDestinations() {
  const [data, setData] = useState<any>({ destinations: [], places: [], listings: [], partnerRequests: [], storeRequests: [], stores: [] });
  const [destinationForm, setDestinationForm] = useState(emptyDestination);
  const [placeForm, setPlaceForm] = useState(emptyPlace);
  const [listingForm, setListingForm] = useState(emptyListing);
  const [storeLinkForm, setStoreLinkForm] = useState(emptyStoreLink);
  const [editingDestinationId, setEditingDestinationId] = useState('');
  const [editingPlaceId, setEditingPlaceId] = useState('');
  const [editingListingId, setEditingListingId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!localStorage.getItem('superAdminToken')) {
      window.location.href = '/superadmin';
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await destinationService.adminOverview();
      setData(payload || {});
      const firstDestination = payload?.destinations?.[0]?.id || '';
      const firstPlace = payload?.places?.[0]?.id || '';
      const firstStore = payload?.stores?.[0]?.id || '';
      setPlaceForm((current) => ({ ...current, destinationId: current.destinationId || firstDestination }));
      setListingForm((current) => ({ ...current, destinationId: current.destinationId || firstDestination }));
      setStoreLinkForm((current) => ({ ...current, placeId: current.placeId || firstPlace, storeId: current.storeId || firstStore }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar destinos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    const pendingPartner = (data.partnerRequests || []).filter((request: any) => String(request.status || 'pending') === 'pending').length;
    const pendingStores = (data.storeRequests || []).filter((request: any) => String(request.status || 'pending') === 'pending').length;
    return {
      destinations: (data.destinations || []).length,
      places: (data.places || []).length,
      listings: (data.listings || []).length,
      pending: pendingPartner + pendingStores,
    };
  }, [data]);

  const groupedDestinations = useMemo(() => {
    const normalizedQuery = normalizeSearch(search);
    const places = data.places || [];
    const listings = data.listings || [];
    const groups = new Map<string, any>();

    (data.destinations || []).forEach((destination: any) => {
      const destinationPlaces = places.filter((place: any) => place.destinationId === destination.id);
      const destinationListings = listings.filter((listing: any) => listing.destinationId === destination.id);
      const searchable = normalizeSearch([
        destination.name,
        destination.city,
        destination.state,
        destination.description,
        ...destinationPlaces.flatMap((place: any) => [place.name, place.address]),
        ...destinationListings.map((listing: any) => listing.title),
      ].filter(Boolean).join(' '));
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return;
      if (statusFilter === 'active' && destination.active === false) return;
      if (statusFilter === 'inactive' && destination.active !== false) return;

      const state = String(destination.state || 'UF').toUpperCase();
      const city = String(destination.city || destination.name || 'Sem cidade').trim();
      const key = `${state}|${city}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          state,
          city,
          destinations: [],
          placesCount: 0,
          listingsCount: 0,
          inactiveCount: 0,
        });
      }
      const group = groups.get(key);
      group.destinations.push({ ...destination, places: destinationPlaces, listings: destinationListings });
      group.placesCount += destinationPlaces.length;
      group.listingsCount += destinationListings.length;
      if (destination.active === false) group.inactiveCount += 1;
    });

    return Array.from(groups.values()).sort((left: any, right: any) => {
      const stateDiff = String(left.state).localeCompare(String(right.state), 'pt-BR');
      if (stateDiff !== 0) return stateDiff;
      return String(left.city).localeCompare(String(right.city), 'pt-BR');
    });
  }, [data.destinations, data.places, data.listings, search, statusFilter]);

  const updateDestination = (key: string, value: any) => setDestinationForm((current) => ({ ...current, [key]: value }));
  const updatePlace = (key: string, value: any) => setPlaceForm((current) => ({ ...current, [key]: value }));
  const updateListing = (key: string, value: any) => setListingForm((current) => ({ ...current, [key]: value }));
  const updateStoreLink = (key: string, value: any) => setStoreLinkForm((current) => ({ ...current, [key]: value }));

  const startDestinationEdit = (destination: any) => {
    setEditingDestinationId(destination.id);
    setDestinationForm({
      ...emptyDestination,
      ...Object.fromEntries(Object.entries(destination).map(([key, value]) => [key, toFormValue(value)])),
      state: String(destination.state || 'SP').toUpperCase().slice(0, 2),
      active: destination.active !== false,
      sortOrder: Number(destination.sortOrder || 0),
    });
    setActiveTab('cadastro');
  };

  const startPlaceEdit = (place: any) => {
    setEditingPlaceId(place.id);
    setPlaceForm({
      ...emptyPlace,
      ...Object.fromEntries(Object.entries(place).map(([key, value]) => [key, toFormValue(value)])),
      destinationId: place.destinationId || place.destination?.id || '',
      state: String(place.state || place.destination?.state || '').toUpperCase().slice(0, 2),
      active: place.active !== false,
      sortOrder: Number(place.sortOrder || 0),
    });
    setActiveTab('cadastro');
  };

  const startListingEdit = (listing: any) => {
    setEditingListingId(listing.id);
    setListingForm({
      ...emptyListing,
      ...Object.fromEntries(Object.entries(listing).map(([key, value]) => [key, toFormValue(value)])),
      destinationId: listing.destinationId || listing.destination?.id || '',
      hospitalityPlaceId: listing.hospitalityPlaceId || '',
      active: listing.active !== false,
      featured: listing.featured === true,
      sortOrder: Number(listing.sortOrder || 0),
    });
    setActiveTab('cadastro');
  };

  const cancelDestinationEdit = () => {
    setEditingDestinationId('');
    setDestinationForm(emptyDestination);
  };

  const cancelPlaceEdit = () => {
    setEditingPlaceId('');
    setPlaceForm((current) => ({ ...emptyPlace, destinationId: current.destinationId }));
  };

  const cancelListingEdit = () => {
    setEditingListingId('');
    setListingForm((current) => ({ ...emptyListing, destinationId: current.destinationId }));
  };

  const saveDestination = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...destinationForm, active: toBool(destinationForm.active) };
      if (editingDestinationId) {
        await destinationService.adminUpdateDestination(editingDestinationId, payload);
      } else {
        await destinationService.adminCreateDestination(payload);
      }
      setEditingDestinationId('');
      setDestinationForm(emptyDestination);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar destino.');
    } finally {
      setSaving(false);
    }
  };

  const savePlace = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...placeForm, active: toBool(placeForm.active) };
      if (editingPlaceId) {
        await destinationService.adminUpdateHospitalityPlace(editingPlaceId, payload);
      } else {
        await destinationService.adminCreateHospitalityPlace(payload);
      }
      setEditingPlaceId('');
      setPlaceForm((current) => ({ ...emptyPlace, destinationId: current.destinationId }));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar hospedagem.');
    } finally {
      setSaving(false);
    }
  };

  const saveListing = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...listingForm, active: toBool(listingForm.active), featured: toBool(listingForm.featured) };
      if (editingListingId) {
        await destinationService.adminUpdateListing(editingListingId, payload);
      } else {
        await destinationService.adminCreateListing(payload);
      }
      setEditingListingId('');
      setListingForm((current) => ({ ...emptyListing, destinationId: current.destinationId }));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const linkStore = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await destinationService.adminLinkStore(storeLinkForm.placeId, storeLinkForm);
      setStoreLinkForm((current) => ({ ...emptyStoreLink, placeId: current.placeId, storeId: current.storeId }));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível vincular loja.');
    } finally {
      setSaving(false);
    }
  };

  const reviewPartner = async (requestId: string, status: 'approved' | 'rejected') => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminReviewPartnerRequest(requestId, { status });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revisar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  const reviewStore = async (requestId: string, status: 'approved' | 'rejected') => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminReviewStoreRequest(requestId, { status });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revisar solicitação da loja.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDestinationActive = async (destination: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateDestination(destination.id, { ...destination, active: destination.active === false });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar destino.');
    } finally {
      setSaving(false);
    }
  };

  const togglePlaceActive = async (place: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateHospitalityPlace(place.id, { ...place, destinationId: place.destinationId || place.destination?.id, active: place.active === false });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar hospedagem.');
    } finally {
      setSaving(false);
    }
  };

  const toggleListingActive = async (listing: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateListing(listing.id, { ...listing, active: listing.active === false });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Resumo', icon: Compass },
    { id: 'cadastro', label: 'Cadastro', icon: Plus },
    { id: 'requests', label: 'Solicitações', icon: WarningCircle, badge: metrics.pending },
  ];

  return (
    <AdminLayout contextLabel="Destinos" showHeader={false}>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#153A4C,#0f172a)] p-5 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
                <MapTrifold size={15} weight="duotone" />
                Destination Hub
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em]">Destinos, chalés e serviços</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/72">
                Plataforma cadastra cidades, aprova chalés/prestadores e conecta lojas reais às hospedagens.
              </p>
            </div>
            <Link to="/destinos" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#153A4C]">
              Ver público
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${active ? 'bg-[#153A4C] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                <Icon size={15} weight={active ? 'fill' : 'duotone'} />
                {tab.label}
                {tab.badge ? <span className="rounded-full bg-amber-400 px-1.5 text-[10px] text-slate-950">{tab.badge}</span> : null}
              </button>
            );
          })}
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Destinos', value: metrics.destinations, icon: MapTrifold },
                { label: 'Hospedagens', value: metrics.places, icon: Bed },
                { label: 'Serviços', value: metrics.listings, icon: Sparkle },
                { label: 'Pendências', value: metrics.pending, icon: WarningCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <Icon size={24} weight="duotone" className="text-[#336886]" />
                    <p className="mt-4 text-3xl font-black text-slate-950">{item.value}</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por UF, cidade, chalé, pousada ou serviço"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]"
              />
              <div className="flex rounded-2xl bg-slate-100 p-1">
                {[
                  { id: 'active', label: 'Ativos' },
                  { id: 'all', label: 'Todos' },
                  { id: 'inactive', label: 'Inativos' },
                ].map((item) => {
                  const active = statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id as any)}
                      className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {groupedDestinations.map((group: any) => (
                <section key={group.key} className="overflow-hidden rounded-[1.85rem] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">{group.state}</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">{group.city}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">{group.destinations.length} destino(s)</span>
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">{group.placesCount} hospedagem(ns)</span>
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">{group.listingsCount} serviço(s)</span>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 xl:grid-cols-2">
                    {group.destinations.map((destination: any) => (
                      <article key={destination.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="flex gap-4">
                          <img src={imageFor(destination)} alt={destination.name} className="h-20 w-20 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-slate-950">{destination.name}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusPill(destination.active)}`}>
                                {activeLabel(destination.active)}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-500">{[destination.city, destination.state].filter(Boolean).join(' - ') || 'Sem cidade/UF'}</p>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">{destination.description || destination.heroSubtitle || 'Sem descrição pública.'}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => startDestinationEdit(destination)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                            <PencilSimple size={13} weight="bold" />
                            Editar destino
                          </button>
                          <Link to={`/destinos/${destination.slug}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                            <Eye size={13} weight="bold" />
                            Ver público
                          </Link>
                          <button type="button" disabled={saving} onClick={() => toggleDestinationActive(destination)} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                            {destination.active === false ? <Eye size={13} weight="bold" /> : <EyeSlash size={13} weight="bold" />}
                            {destination.active === false ? 'Ativar' : 'Desativar'}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {(destination.places || []).slice(0, 4).map((place: any) => (
                            <div key={place.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-950">{place.name}</p>
                                  <p className="text-xs font-semibold text-slate-500">{place.address || place.description || 'Hospedagem sem endereço'}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusPill(place.active)}`}>{activeLabel(place.active)}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button type="button" onClick={() => startPlaceEdit(place)} className="text-xs font-black text-[#336886]">Editar hospedagem</button>
                                <button type="button" disabled={saving} onClick={() => togglePlaceActive(place)} className="text-xs font-black text-slate-500 disabled:opacity-50">{place.active === false ? 'Ativar' : 'Desativar'}</button>
                              </div>
                            </div>
                          ))}
                          {(destination.listings || []).slice(0, 4).map((listing: any) => (
                            <div key={listing.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-950">{listing.title}</p>
                                  <p className="text-xs font-semibold text-slate-500">{String(listing.category || 'SERVICO').replace('_', ' ')}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusPill(listing.active)}`}>{activeLabel(listing.active)}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button type="button" onClick={() => startListingEdit(listing)} className="text-xs font-black text-[#336886]">Editar serviço</button>
                                <button type="button" disabled={saving} onClick={() => toggleListingActive(listing)} className="text-xs font-black text-slate-500 disabled:opacity-50">{listing.active === false ? 'Ativar' : 'Desativar'}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {!loading && groupedDestinations.length === 0 ? (
                <p className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                  Nenhum destino encontrado neste filtro.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'cadastro' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={saveDestination} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingDestinationId ? 'Editar destino' : 'Cadastrar destino'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Destino é a cidade/região turística que aparece para o cliente.</p>
                </div>
                {editingDestinationId ? (
                  <button type="button" onClick={cancelDestinationEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input required value={destinationForm.name} onChange={(event) => updateDestination('name', event.target.value)} placeholder="Nome" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.slug} onChange={(event) => updateDestination('slug', event.target.value)} placeholder="Slug" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.city} onChange={(event) => updateDestination('city', event.target.value)} placeholder="Cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.state} onChange={(event) => updateDestination('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.heroTitle} onChange={(event) => updateDestination('heroTitle', event.target.value)} placeholder="Título hero" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.heroSubtitle} onChange={(event) => updateDestination('heroSubtitle', event.target.value)} placeholder="Subtítulo hero" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.bannerUrl} onChange={(event) => updateDestination('bannerUrl', event.target.value)} placeholder="URL da foto/banner da cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.logoUrl} onChange={(event) => updateDestination('logoUrl', event.target.value)} placeholder="URL do logo/ícone do destino" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.lat} onChange={(event) => updateDestination('lat', event.target.value)} placeholder="Latitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.lng} onChange={(event) => updateDestination('lng', event.target.value)} placeholder="Longitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.sortOrder} onChange={(event) => updateDestination('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={String(destinationForm.active !== false)} onChange={(event) => updateDestination('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={destinationForm.description} onChange={(event) => updateDestination('description', event.target.value)} placeholder="Descrição" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingDestinationId ? 'Atualizar destino' : 'Salvar destino'}</button>
            </form>

            <form onSubmit={savePlace} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingPlaceId ? 'Editar chalé/pousada' : 'Cadastrar chalé/pousada'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Hospedagem recebe lojas delivery vinculadas pelo lojista ou SuperAdmin.</p>
                </div>
                {editingPlaceId ? (
                  <button type="button" onClick={cancelPlaceEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={placeForm.destinationId} onChange={(event) => updatePlace('destinationId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.destinations || []).map((destination: any) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                </select>
                <input required value={placeForm.name} onChange={(event) => updatePlace('name', event.target.value)} placeholder="Nome" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.slug} onChange={(event) => updatePlace('slug', event.target.value)} placeholder="Slug opcional" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={placeForm.type} onChange={(event) => updatePlace('type', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="CHALE">Chalé</option>
                  <option value="POUSADA">Pousada</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="CABANA">Cabana</option>
                  <option value="CASA_TEMPORADA">Casa temporada</option>
                </select>
                <input value={placeForm.city} onChange={(event) => updatePlace('city', event.target.value)} placeholder="Cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.state} onChange={(event) => updatePlace('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.address} onChange={(event) => updatePlace('address', event.target.value)} placeholder="Endereço" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={placeForm.bannerUrl} onChange={(event) => updatePlace('bannerUrl', event.target.value)} placeholder="URL da foto/banner do chalé" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={placeForm.logoUrl} onChange={(event) => updatePlace('logoUrl', event.target.value)} placeholder="URL do logo/foto menor" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={placeForm.whatsapp} onChange={(event) => updatePlace('whatsapp', event.target.value)} placeholder="WhatsApp" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={placeForm.websiteUrl} onChange={(event) => updatePlace('websiteUrl', event.target.value)} placeholder="Site" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.instagramUrl} onChange={(event) => updatePlace('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.lat} onChange={(event) => updatePlace('lat', event.target.value)} placeholder="Latitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.lng} onChange={(event) => updatePlace('lng', event.target.value)} placeholder="Longitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.sortOrder} onChange={(event) => updatePlace('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={String(placeForm.active !== false)} onChange={(event) => updatePlace('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={placeForm.description} onChange={(event) => updatePlace('description', event.target.value)} placeholder="Descrição pública da hospedagem" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <textarea value={placeForm.deliveryInstructions} onChange={(event) => updatePlace('deliveryInstructions', event.target.value)} placeholder="Instruções de entrega" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingPlaceId ? 'Atualizar hospedagem' : 'Salvar hospedagem'}</button>
            </form>

            <form onSubmit={saveListing} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingListingId ? 'Editar serviço/atração' : 'Cadastrar serviço/atração'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Serviço é curadoria local: passeio, massagem, restaurante, guia ou atrativo.</p>
                </div>
                {editingListingId ? (
                  <button type="button" onClick={cancelListingEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={listingForm.destinationId} onChange={(event) => updateListing('destinationId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.destinations || []).map((destination: any) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                </select>
                <select value={listingForm.hospitalityPlaceId} onChange={(event) => updateListing('hospitalityPlaceId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2">
                  <option value="">Serviço do destino inteiro</option>
                  {(data.places || [])
                    .filter((place: any) => !listingForm.destinationId || place.destinationId === listingForm.destinationId)
                    .map((place: any) => <option key={place.id} value={place.id}>{place.name} · {place.destination?.name}</option>)}
                </select>
                <select value={listingForm.category} onChange={(event) => updateListing('category', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="PASSEIO">Passeio</option>
                  <option value="MASSAGEM">Massagem</option>
                  <option value="RESTAURANTE_VISITAR">Restaurante visitar</option>
                  <option value="NOITE">Noite</option>
                  <option value="ATRATIVO">Atrativo</option>
                  <option value="SERVICO">Serviço</option>
                </select>
                <input required value={listingForm.title} onChange={(event) => updateListing('title', event.target.value)} placeholder="Título" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.imageUrl} onChange={(event) => updateListing('imageUrl', event.target.value)} placeholder="URL da foto do serviço/atração" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.address} onChange={(event) => updateListing('address', event.target.value)} placeholder="Endereço/local" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.whatsapp} onChange={(event) => updateListing('whatsapp', event.target.value)} placeholder="WhatsApp" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.websiteUrl} onChange={(event) => updateListing('websiteUrl', event.target.value)} placeholder="Site" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.instagramUrl} onChange={(event) => updateListing('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.ctaUrl} onChange={(event) => updateListing('ctaUrl', event.target.value)} placeholder="Link de contato/CTA" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.sortOrder} onChange={(event) => updateListing('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={String(listingForm.active !== false)} onChange={(event) => updateListing('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={listingForm.description} onChange={(event) => updateListing('description', event.target.value)} placeholder="Descrição" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingListingId ? 'Atualizar serviço' : 'Salvar serviço'}</button>
            </form>

            <form onSubmit={linkStore} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Vincular loja a hospedagem</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={storeLinkForm.placeId} onChange={(event) => updateStoreLink('placeId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.places || []).map((place: any) => <option key={place.id} value={place.id}>{place.name} · {place.destination?.name}</option>)}
                </select>
                <select value={storeLinkForm.storeId} onChange={(event) => updateStoreLink('storeId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.stores || []).map((store: any) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
                <input value={storeLinkForm.deliveryFee} onChange={(event) => updateStoreLink('deliveryFee', event.target.value)} placeholder="Taxa de entrega" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={storeLinkForm.estimatedMinutes} onChange={(event) => updateStoreLink('estimatedMinutes', event.target.value)} placeholder="Tempo estimado" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={storeLinkForm.notes} onChange={(event) => updateStoreLink('notes', event.target.value)} placeholder="Observação" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Vincular loja</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'requests' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Chalés/prestadores aguardando aprovação</h2>
              <div className="mt-4 space-y-3">
                {(data.partnerRequests || []).map((request: any) => (
                  <article key={request.id} className={`rounded-2xl border p-4 ${requestTone(request.status)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{request.name}</p>
                        <p className="text-xs font-bold text-slate-500">{request.partnerType} · {request.destination?.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{request.responsibleName} · {request.responsibleEmail}</p>
                      </div>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">{request.status}</span>
                    </div>
                    {String(request.status) === 'pending' ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => reviewPartner(request.id, 'approved')} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">Aprovar</button>
                        <button type="button" disabled={saving} onClick={() => reviewPartner(request.id, 'rejected')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white">Recusar</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Lojas solicitando atender chalés</h2>
              <div className="mt-4 space-y-3">
                {(data.storeRequests || []).map((request: any) => (
                  <article key={request.id} className={`rounded-2xl border p-4 ${requestTone(request.status)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{request.store?.name}</p>
                        <p className="text-xs font-bold text-slate-500">{request.hospitalityPlace?.name} · {request.destination?.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{request.message || 'Sem mensagem'}</p>
                      </div>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">{request.status}</span>
                    </div>
                    {String(request.status) === 'pending' ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => reviewStore(request.id, 'approved')} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">
                          <CheckCircle size={13} weight="fill" />
                          Aprovar
                        </button>
                        <button type="button" disabled={saving} onClick={() => reviewStore(request.id, 'rejected')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white">Recusar</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
