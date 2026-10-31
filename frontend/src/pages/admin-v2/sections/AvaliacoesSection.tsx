// Avaliações V2 — mesmos endpoints da V1 (summary + list + reply). Dados de
// entrega e gorjeta seguem o gating Pro (mesma regra de features do plano).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { orderService } from '../../../services/orderService';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Badge } from '../../../components/reui/badge';
import { Button } from '../../../components/ui/Button';
import { FramePanel } from '../../../components/reui/frame';
import { cn } from '@/lib/utils';
import { V2EmptyRegion, V2ErrorRegion, V2LoadingRegion } from '../v2ui';

type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;

const StarsRow = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrelas`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        weight={index < Math.round(rating) ? 'fill' : 'regular'}
        className={cn('size-3.5', index < Math.round(rating) ? 'text-amber-500' : 'text-muted-foreground/40')}
        aria-hidden="true"
      />
    ))}
  </span>
);

export const AvaliacoesSection = () => {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '');
  const canSeeDeliveryAndTips = useMemo(() => {
    const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
    const status = String(auth?.subscription?.status || '').toUpperCase();
    return Boolean(
      auth?.features?.tipPayouts ||
        auth?.features?.motoboyManagement ||
        auth?.store?.settings?.planExempt ||
        auth?.subscription?.planExempt ||
        status === 'TRIAL' ||
        planName.includes('pro') ||
        planName.includes('vip')
    );
  }, [auth]);

  const [summary, setSummary] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  const [starFilter, setStarFilter] = useState<StarFilter>(0);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!storeId) return;
    setError(false);
    Promise.all([
      orderService.getReviewSummaryByStore(storeId).catch(() => null),
      orderService.listReviewsByStore(storeId, 100).catch(() => null),
    ])
      .then(([summaryData, reviewsData]) => {
        setSummary(summaryData || null);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => setError(true));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const distribution = useMemo(() => {
    const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const review of reviews || []) {
      const rating = Math.max(1, Math.min(5, Math.round(Number(review?.rating || 0))));
      if (rating >= 1) buckets[rating] = (buckets[rating] || 0) + 1;
    }
    return buckets;
  }, [reviews]);

  const totalReviews = (reviews || []).length;
  const average = useMemo(() => {
    if (summary?.average ?? summary?.avg) return Number(summary.average ?? summary.avg);
    if (!totalReviews) return 0;
    const sum = (reviews || []).reduce((acc, review) => acc + Number(review?.rating || 0), 0);
    return sum / totalReviews;
  }, [summary, reviews, totalReviews]);

  const visibleReviews = useMemo(() => {
    const list = reviews || [];
    if (!starFilter) return list;
    return list.filter((review) => Math.round(Number(review?.rating || 0)) === starFilter);
  }, [reviews, starFilter]);

  const submitReply = async (review: any) => {
    const draft = String(replyDrafts[String(review.id)] || '').trim();
    if (!draft) return;
    setReplyBusy(String(review.id));
    try {
      await orderService.replyReviewByStore(storeId, String(review.id), draft);
      showToast('Resposta publicada.', 'success');
      setReplyDrafts((prev) => ({ ...prev, [String(review.id)]: '' }));
      setReviews((prev) =>
        (prev || []).map((entry) => (String(entry.id) === String(review.id) ? { ...entry, reply: draft } : entry))
      );
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível publicar a resposta.'), 'error');
    } finally {
      setReplyBusy(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FramePanel className="flex flex-col items-center justify-center gap-2 p-5">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">
            {average > 0 ? average.toFixed(1) : '—'}
          </span>
          <StarsRow rating={average} />
          <span className="text-muted-foreground text-xs">
            {totalReviews > 0
              ? `${totalReviews} ${totalReviews === 1 ? 'avaliação' : 'avaliações'}`
              : 'sem avaliações ainda'}
          </span>
        </FramePanel>
        <FramePanel className="flex flex-col justify-center gap-1.5 p-5 lg:col-span-2">
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = distribution[stars] || 0;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setStarFilter(starFilter === stars ? 0 : stars)}
                className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors"
                aria-pressed={starFilter === stars}
              >
                <span className="text-muted-foreground w-8 shrink-0 text-xs tabular-nums">{stars}★</span>
                <span className="bg-muted relative h-2 min-w-0 flex-1 overflow-hidden rounded-full">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-muted-foreground w-6 shrink-0 text-right text-xs tabular-nums">{count}</span>
              </button>
            );
          })}
        </FramePanel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="bg-muted inline-flex items-center rounded-lg p-0.5" role="group" aria-label="Filtro por nota">
          <button
            type="button"
            onClick={() => setStarFilter(0)}
            className={
              starFilter === 0
                ? 'bg-background text-foreground rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
            }
            aria-pressed={starFilter === 0}
          >
            Todas
          </button>
          {([5, 4, 3, 2, 1] as const).map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => setStarFilter(starFilter === stars ? 0 : stars)}
              className={
                starFilter === stars
                  ? 'bg-background text-foreground rounded-md px-3 py-1.5 text-xs font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium'
              }
              aria-pressed={starFilter === stars}
            >
              {stars}★
            </button>
          ))}
        </div>
        {starFilter > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setStarFilter(0)}>
            Limpar filtro
          </Button>
        )}
      </div>

      {error ? (
        <V2ErrorRegion message="Não foi possível carregar as avaliações." onRetry={load} />
      ) : reviews === null ? (
        <V2LoadingRegion rows={4} />
      ) : visibleReviews.length === 0 ? (
        <V2EmptyRegion
          title={starFilter ? 'Nenhuma avaliação com essa nota' : 'Nenhuma avaliação ainda'}
          hint="Depois da primeira entrega, convide o cliente a avaliar na vitrine."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleReviews.map((review: any) => (
            <li key={review.id}>
              <FramePanel className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <StarsRow rating={Number(review?.rating || 0)} />
                    <span className="truncate text-sm font-medium">
                      {String(review?.customerName ?? review?.customer?.name ?? 'Cliente')}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {review?.createdAt ? formatDate(review.createdAt) : ''}
                  </span>
                </div>
                {review?.comment && <p className="text-sm">{String(review.comment)}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {canSeeDeliveryAndTips && Number(review?.tipAmount) > 0 && (
                    <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Gorjeta {formatCurrency(Number(review.tipAmount))}
                    </Badge>
                  )}
                  {canSeeDeliveryAndTips && review?.deliveryRating != null && (
                    <Badge variant="outline" className="text-muted-foreground border-border">
                      Entrega {Number(review.deliveryRating).toFixed(1)}★
                    </Badge>
                  )}
                </div>
                {review?.reply ? (
                  <div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-3">
                    <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                      Resposta da loja
                    </span>
                    <p className="text-sm">{String(review.reply)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      className="border-input bg-background min-h-10 w-full rounded-md border px-3 py-2 text-sm"
                      value={replyDrafts[String(review.id)] || ''}
                      onChange={(event) =>
                        setReplyDrafts((prev) => ({ ...prev, [String(review.id)]: event.target.value }))
                      }
                      placeholder="Responder publicamente…"
                      aria-label={`Responder avaliação de ${String(review?.customerName ?? 'cliente')}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      loading={replyBusy === String(review.id)}
                      disabled={!String(replyDrafts[String(review.id)] || '').trim()}
                      onClick={() => submitReply(review)}
                    >
                      Responder
                    </Button>
                  </div>
                )}
              </FramePanel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
