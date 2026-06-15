// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Sparkle, X } from '@phosphor-icons/react';
import { PaymentQRCard } from '../common/PaymentQRCard';
import { destinationPartnerPortalService } from '../../services/destinationPartnerPortalService';
import {
  destinationPromotionService,
  DestinationPromotion,
} from '../../services/destinationPromotionService';

type ResourceLite = {
  resourceType: 'HOSPITALITY_PLACE' | 'DESTINATION_LISTING';
  resourceId: string;
  name: string;
};

const formatBRL = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const DURATION_LABEL: Record<string, string> = {
  DAY: '1 dia',
  WEEK: '1 semana',
  MONTH: '1 mês',
};

/**
 * Painel "Destacar meu espaço" para o portal do parceiro de destinos.
 * O parceiro escolhe um recurso (chalé/pousada ou serviço), paga via PIX e ganha
 * destaque de posicionamento (featured + ordem) pelo período.
 */
export function DestinationPromotionPanel() {
  const [pricing, setPricing] = useState<any>(null);
  const [promotions, setPromotions] = useState<DestinationPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [paymentPromo, setPaymentPromo] = useState<DestinationPromotion | null>(null);
  const [copied, setCopied] = useState(false);

  const resources = useMemo<ResourceLite[]>(() => {
    const session = destinationPartnerPortalService.getSession();
    return (session?.resources || [])
      .filter((r: any) => r.resourceType === 'HOSPITALITY_PLACE' || r.resourceType === 'DESTINATION_LISTING')
      .map((r: any) => ({
        resourceType: r.resourceType,
        resourceId: String(r.item?.id || ''),
        name: String(r.resourceType === 'HOSPITALITY_PLACE' ? r.item?.name : r.item?.title || 'Recurso'),
      }))
      .filter((r) => r.resourceId);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, list] = await Promise.all([
        destinationPromotionService.getPricing().catch(() => null),
        destinationPromotionService.listMine().catch(() => []),
      ]);
      if (p) setPricing(p);
      setPromotions(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar destaques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Polling do pagamento no modal.
  useEffect(() => {
    if (!paymentPromo) return;
    if (String(paymentPromo.paymentStatus || '').toUpperCase() === 'PAID') return;
    const id = paymentPromo.id;
    const timer = setInterval(async () => {
      try {
        const fresh = await destinationPromotionService.refreshPayment(id);
        if (String(fresh?.paymentStatus || '').toUpperCase() === 'PAID') {
          setPaymentPromo(fresh);
          await load();
        } else {
          setPaymentPromo(fresh);
        }
      } catch {
        /* silencioso */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [paymentPromo, load]);

  const handleCreate = async (resource: ResourceLite, durationUnit: 'DAY' | 'WEEK' | 'MONTH') => {
    setError('');
    setCreating(resource.resourceId);
    try {
      const promo = await destinationPromotionService.create({
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        durationUnit,
        paymentMethod: 'PIX',
      });
      setPaymentPromo(promo);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível gerar o QR Pix do destaque.');
    } finally {
      setCreating(null);
    }
  };

  const prices = pricing?.prices || { DAY: 19.9, WEEK: 89.9, MONTH: 199.9 };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkle size={18} weight="duotone" className="text-amber-500" />
        <h3 className="text-base font-black text-slate-900">Destacar meu espaço</h3>
      </div>
      <p className="text-xs text-slate-500">
        Pague um destaque de posicionamento: seu chalé, pousada ou serviço aparece primeiro no destino pelo período escolhido. Pagamento via PIX.
      </p>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-400">Carregando…</p>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => {
            const active = promotions.find(
              (p) => p.resourceType === resource.resourceType && p.resourceId === resource.resourceId &&
                String(p.status).toUpperCase() === 'APPROVED'
            );
            return (
              <div key={`${resource.resourceType}-${resource.resourceId}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{resource.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {resource.resourceType === 'HOSPITALITY_PLACE' ? 'Hospedagem' : 'Serviço/Lugar'}
                    </p>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      <CheckCircle size={12} weight="fill" /> Em destaque
                    </span>
                  ) : null}
                </div>
                {active ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Destaque ativo até {new Date(active.endsAt || '').toLocaleDateString('pt-BR')}.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(['DAY', 'WEEK', 'MONTH'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        disabled={creating === resource.resourceId}
                        onClick={() => handleCreate(resource, unit)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <span className="block text-[10px] font-bold uppercase text-slate-500">{DURATION_LABEL[unit]}</span>
                        <span className="block text-sm font-black text-slate-900">{formatBRL(prices[unit] ?? 0)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {resources.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
              Nenhum recurso vinculado para destacar ainda.
            </p>
          ) : null}
        </div>
      )}

      {paymentPromo ? (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setPaymentPromo(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">Pague o destaque via PIX</h4>
              <button type="button" onClick={() => setPaymentPromo(null)} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
                <X size={18} weight="bold" />
              </button>
            </div>
            <PaymentQRCard
              qrCodeBase64={paymentPromo.paymentQrCodeBase64 || null}
              qrCodeText={paymentPromo.paymentQrCodeText || null}
              paymentLink={paymentPromo.paymentLink || null}
              status={paymentPromo.paymentStatus}
              expiresAt={paymentPromo.paymentExpiresAt || null}
              amountLabel={formatBRL(Number(paymentPromo.priceAmount || 0))}
              title="Destaque do destino"
              variant="client"
              onVerifyNow={() =>
                destinationPromotionService
                  .refreshPayment(String(paymentPromo.id))
                  .then(setPaymentPromo)
                  .catch(() => {})
              }
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
