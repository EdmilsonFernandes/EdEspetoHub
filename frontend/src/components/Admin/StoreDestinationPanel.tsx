// @ts-nocheck
import { useEffect, useState } from 'react';
import { Bed, CheckCircle, Clock, Compass, SignOut, WarningCircle } from '@phosphor-icons/react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { destinationService } from '../../services/destinationService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../../utils/storeAvatar';

const statusCopy: Record<string, { label: string; tone: string }> = {
  available: { label: 'Disponível', tone: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Em análise', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprovado', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Recusado', tone: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelado', tone: 'bg-slate-100 text-slate-600' },
};

const normalizeSearch = (value: any) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const hasStoreRelation = (destination: any) =>
  (destination.hospitalityPlaces || []).some((place: any) => {
    const status = String(place.status || '').toLowerCase();
    return status === 'pending' || status === 'approved';
  });

const destinationSearchText = (destination: any) =>
  normalizeSearch([
    destination.name,
    destination.city,
    destination.state,
    ...(destination.hospitalityPlaces || []).flatMap((place: any) => [place.name, place.address, place.description]),
  ].filter(Boolean).join(' '));

const matchCopy = (match: any) => {
  const reason = String(match?.reason || '');
  if (reason === 'same_city') return 'Cidade da loja';
  if (reason === 'within_delivery_radius') return 'Dentro do raio';
  if (reason === 'same_state') return 'Mesma UF';
  if (reason === 'missing_store_location') return 'Configure cidade da loja';
  return 'Outro destino';
};

const matchTone = (match: any) => {
  if (match?.recommended) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (String(match?.reason || '') === 'same_state') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (String(match?.reason || '') === 'missing_store_location') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-100 text-slate-600';
};

type Props = {
  storeId?: string;
};

export function StoreDestinationPanel({ storeId }: Props) {
  const { showToast } = useToast();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState<null | { placeId: string; title: string; description: string; confirmLabel: string }>(null);
  const [scope, setScope] = useState<'recommended' | 'all'>('recommended');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await destinationService.listStoreOptions(storeId);
      setDestinations(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar destinos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const updateDraft = (placeId: string, key: string, value: any) => {
    setDrafts((current) => ({
      ...current,
      [placeId]: {
        ...(current[placeId] || {}),
        [key]: value,
      },
    }));
  };

  const requestPlace = async (placeId: string) => {
    if (!storeId) return;
    const draft = drafts[placeId] || {};
    setSavingId(placeId);
    setError('');
    try {
      await destinationService.createStoreRequest(storeId, {
        hospitalityPlaceId: placeId,
        message: draft.message || '',
        deliveryFee: draft.deliveryFee || null,
        estimatedMinutes: draft.estimatedMinutes || null,
        deliveryEnabled: true,
      });
      await load();
      showToast('Solicitação enviada para a plataforma.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar solicitação.');
    } finally {
      setSavingId('');
    }
  };

  const removePlace = async (placeId: string, status: string) => {
    if (!storeId) return;
    setSavingId(placeId);
    setError('');
    try {
      await destinationService.removeStoreDestination(storeId, placeId);
      await load();
      showToast(status === 'approved' ? 'Loja removida do chalé/pousada.' : 'Solicitação cancelada.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar participação.');
    } finally {
      setSavingId('');
      setConfirmModal(null);
    }
  };

  const recommendedCount = destinations.filter((destination) => destination?.destinationMatch?.recommended || hasStoreRelation(destination)).length;
  const effectiveScope = recommendedCount > 0 ? scope : 'all';
  const normalizedQuery = normalizeSearch(query);
  const visibleDestinations = destinations.filter((destination) => {
    const matchesQuery = !normalizedQuery || destinationSearchText(destination).includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (effectiveScope === 'all') return true;
    return Boolean(destination?.destinationMatch?.recommended || hasStoreRelation(destination));
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <Compass size={22} weight="duotone" className="mt-0.5 text-[#336886]" />
          <div>
            <p className="text-sm font-black text-slate-900">Solicitações para destinos e chalés</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              Escolha hospedagens onde sua loja entrega. Por padrão aparecem destinos recomendados pela cidade, UF ou distância da loja; use "ver todos" só para exceções operacionais.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por cidade, chalé, pousada ou endereço"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]"
        />
        <div className="flex rounded-2xl bg-slate-100 p-1">
          {[
            { id: 'recommended', label: `Recomendados (${recommendedCount})` },
            { id: 'all', label: `Ver todos (${destinations.length})` },
          ].map((item) => {
            const active = effectiveScope === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScope(item.id as any)}
                className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {recommendedCount === 0 && !loading ? (
          <p className="text-xs font-semibold leading-relaxed text-amber-700 sm:col-span-2">
            Ainda não consegui recomendar por região. Configure cidade/UF ou coordenadas da loja em Configurações para priorizar destinos locais automaticamente.
          </p>
        ) : null}
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

      <div className="space-y-5">
        {visibleDestinations.map((destination: any) => (
          <section key={destination.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
              <img
                src={resolveAssetUrl(destination.bannerUrl || destination.logoUrl || '') || getStoreAvatarUrl(destination.slug, destination.name)}
                alt={destination.name}
                className="h-14 w-14 rounded-2xl object-cover"
              />
              <div>
                <h3 className="text-lg font-black text-slate-950">{destination.name}</h3>
                <p className="text-xs font-bold text-slate-500">{destination.city} - {destination.state}</p>
              </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${matchTone(destination.destinationMatch)}`}>
                  {matchCopy(destination.destinationMatch)}
                </span>
                {destination.destinationMatch?.distanceKm != null ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {Number(destination.destinationMatch.distanceKm).toFixed(0)} km
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {(destination.hospitalityPlaces || []).map((place: any) => {
                const status = String(place.status || 'available').toLowerCase();
                const meta = statusCopy[status] || statusCopy.available;
                const canRequest = status === 'available' || status === 'rejected' || status === 'cancelled';
                return (
                  <div key={place.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#336886] ring-1 ring-slate-100">
                          <Bed size={22} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-slate-950">{place.name}</h4>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${meta.tone}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{place.address || place.description || 'Hospedagem cadastrada'}</p>
                          {status === 'approved' ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle size={14} weight="fill" />
                              Sua loja já aparece neste chalé/pousada.
                            </p>
                          ) : status === 'pending' ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                              <Clock size={14} weight="fill" />
                              Aguardando aprovação da plataforma.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {canRequest ? (
                        <div className="w-full space-y-2 sm:max-w-[280px]">
                          <input
                            value={drafts[place.id]?.deliveryFee || ''}
                            onChange={(event) => updateDraft(place.id, 'deliveryFee', event.target.value)}
                            placeholder="Taxa de entrega"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#336886]"
                          />
                          <input
                            value={drafts[place.id]?.estimatedMinutes || ''}
                            onChange={(event) => updateDraft(place.id, 'estimatedMinutes', event.target.value)}
                            placeholder="Tempo estimado em minutos"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#336886]"
                          />
                          <input
                            value={drafts[place.id]?.message || ''}
                            onChange={(event) => updateDraft(place.id, 'message', event.target.value)}
                            placeholder="Mensagem opcional"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#336886]"
                          />
                          <button
                            type="button"
                            onClick={() => requestPlace(place.id)}
                            disabled={savingId === place.id}
                            className="w-full rounded-xl bg-[#336886] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            {savingId === place.id ? 'Enviando...' : 'Solicitar vínculo'}
                          </button>
                        </div>
                      ) : status === 'pending' || status === 'approved' ? (
                        <div className="w-full sm:max-w-[220px]">
                          <button
                            type="button"
                            onClick={() => setConfirmModal({
                              placeId: place.id,
                              title: status === 'approved' ? 'Sair desta hospedagem?' : 'Cancelar solicitação?',
                              description: status === 'approved'
                                ? 'Sua loja deixará de aparecer para turistas neste chalé/pousada.'
                                : 'O pedido atual será removido da análise e você poderá solicitar novamente depois.',
                              confirmLabel: status === 'approved' ? 'Sair da hospedagem' : 'Cancelar solicitação',
                            })}
                            disabled={savingId === place.id}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {status === 'approved' ? 'Remover vínculo' : 'Cancelar solicitação'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {(destination.hospitalityPlaces || []).length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Destino sem hospedagens aprovadas ainda.</p>
              ) : null}
            </div>
          </section>
        ))}
        {!loading && visibleDestinations.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-500">
            Nenhum destino encontrado neste filtro. Use "Ver todos" ou ajuste a busca.
          </p>
        ) : null}
      </div>

      <ConfirmationModal
        isOpen={!!confirmModal}
        onClose={() => !savingId && setConfirmModal(null)}
        onConfirm={() => confirmModal && removePlace(confirmModal.placeId, destinations.flatMap((d: any) => d.hospitalityPlaces || []).find((p: any) => p.id === confirmModal.placeId)?.status || '')}
        title={confirmModal?.title || ''}
        description={confirmModal?.description || ''}
        confirmLabel={confirmModal?.confirmLabel || 'Confirmar'}
        cancelLabel="Voltar"
        variant="warning"
        icon={confirmModal?.confirmLabel?.includes('Sair') ? <SignOut size={32} weight="duotone" /> : <WarningCircle size={32} weight="duotone" />}
        isLoading={!!savingId}
      />
    </div>
  );
}
