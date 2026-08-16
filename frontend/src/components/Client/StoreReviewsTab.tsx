import { useEffect, useMemo, useState } from 'react';
import {
  Star,
  ChatCircle,
  ClipboardText,
  CheckCircle,
  Info,
  WarningCircle,
  ChatCircleDots,
} from '@phosphor-icons/react';
import { storeService } from '../../services/storeService';
import { formatRelativeDate } from '../../utils/format';

type ReviewRow = {
  id?: string;
  storeRating?: number;
  comment?: string | null;
  storeReply?: string | null;
  storeTags?: string[] | string | null;
  createdAt?: string;
  customerName?: string | null;
};

type DistributionRow = { rating: number; total: number };

type ReviewsPayload = {
  avgStoreRating?: number;
  totalReviews?: number;
  distribution?: DistributionRow[];
  positivePercent?: number;
  topTags?: string[];
  reviews?: ReviewRow[];
  totalOrders?: number;
  cancelledOrders?: number;
  cancellationRate?: number;
};

const buildDistribution = (raw: DistributionRow[] = []) => {
  const map = new Map<number, number>();
  for (const row of raw) map.set(Number(row.rating), Number(row.total || 0));
  return [5, 4, 3, 2, 1].map((rating) => ({ rating, total: map.get(rating) || 0 }));
};

const formatDisplayName = (name?: string | null) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Cliente';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const getInitials = (name?: string | null) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

function StarsRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          weight="fill"
          className={n <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

export function StoreReviewsTab({ storeSlug }: { storeSlug: string }) {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'comments' | 'recent'>('recent');

  useEffect(() => {
    let active = true;
    if (!storeSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    storeService
      .fetchPublicStoreReviews(storeSlug, { limit: 30 })
      .then((payload) => {
        if (active) setData(payload || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar as avaliações.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeSlug]);

  const avg = Number(data?.avgStoreRating || 0);
  const total = Number(data?.totalReviews || 0);
  const distribution = buildDistribution(data?.distribution);
  const maxTotal = Math.max(1, ...distribution.map((d) => d.total));
  const positivePercent = Number(data?.positivePercent || 0);
  const totalOrders = Number(data?.totalOrders || 0);
  const cancellationRate = Number(data?.cancellationRate || 0);
  const allReviews = Array.isArray(data?.reviews) ? data.reviews : [];

  const level = useMemo(() => {
    if (total === 0) return 0;
    if (avg >= 4.7) return 5;
    if (avg >= 4.3) return 4;
    if (avg >= 3.8) return 3;
    if (avg >= 3.0) return 2;
    return 1;
  }, [avg, total]);

  const levelInfo = useMemo(() => {
    if (level >= 4) return { label: 'Experiência boa', bar: 'bg-emerald-500', text: 'text-emerald-600' };
    if (level === 3) return { label: 'Experiência regular', bar: 'bg-amber-500', text: 'text-amber-600' };
    return { label: 'Experiência ruim', bar: 'bg-rose-500', text: 'text-rose-600' };
  }, [level]);

  const checks = useMemo(() => {
    const list = [
      { icon: Star, positive: avg >= 4.5, ok: 'Avaliações excelentes', nok: 'Avaliações regulares' },
      { icon: ChatCircle, positive: positivePercent >= 85, ok: 'Poucas avaliações negativas', nok: 'Algumas avaliações negativas' },
    ];
    if (totalOrders > 0) {
      list.push({ icon: ClipboardText, positive: cancellationRate <= 5, ok: 'Baixo índice de cancelamento', nok: 'Cancelamentos acima do ideal' });
    }
    return list;
  }, [avg, positivePercent, totalOrders, cancellationRate]);

  const sortedReviews = useMemo(() => {
    if (sort === 'comments') {
      return [...allReviews].sort((a, b) => Number(b.storeRating || 0) - Number(a.storeRating || 0));
    }
    return allReviews;
  }, [sort, allReviews]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <WarningCircle size={32} weight="duotone" className="text-rose-400" />
        <p className="text-sm font-medium text-slate-600">{error}</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <ChatCircleDots size={32} weight="duotone" className="text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Esta loja ainda não recebeu avaliações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Card: Qualidade do serviço (estilo iFood) */}
      {total > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Info size={16} weight="fill" className={levelInfo.text} />
            <h3 className="text-sm font-bold text-slate-800">Qualidade do serviço</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className={`font-bold ${levelInfo.text}`}>{levelInfo.label}</span> · com base nas avaliações dos clientes
          </p>

          {/* Slider de níveis */}
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= level ? levelInfo.bar : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
            <span>Nível 1</span>
            <span>Super</span>
          </div>

          {/* Checks */}
          <div className="mt-4 grid gap-2.5">
            {checks.map((check) => (
              <div key={check.ok} className="flex items-center gap-2.5">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${check.positive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  <check.icon size={14} weight="duotone" />
                </span>
                <span className="flex-1 text-xs font-semibold text-slate-700">
                  {check.positive ? check.ok : check.nok}
                </span>
                {check.positive
                  ? <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  : <WarningCircle size={16} weight="fill" className="text-amber-500" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nota média + gráfico de distribuição */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)] sm:p-5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900">{avg.toFixed(1).replace('.', ',')}</span>
            <StarsRow rating={avg} size={13} />
            <span className="mt-1 text-[11px] font-medium text-slate-400">
              {total} {total === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>
          <div className="flex-1 space-y-1.5">
            {distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="w-2 text-[11px] font-bold text-slate-500">{d.rating}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-800 transition-all"
                    style={{ width: `${(d.total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] font-semibold text-slate-400">{d.total}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feed de comentários com sub-tabs */}
      <section>
        <div className="mb-3 flex items-center gap-4 border-b border-slate-200 px-1">
          {(['recent', 'comments'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`-mb-px border-b-2 pb-2 text-sm font-bold transition-colors ${
                sort === key
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {key === 'recent' ? 'Recentes' : 'Comentários'}
            </button>
          ))}
        </div>
        {sortedReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <ChatCircleDots size={28} weight="duotone" className="text-slate-300" />
            <p className="text-xs font-medium text-slate-500">Ainda não há comentários por escrito.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReviews.map((review, index) => (
              <article
                key={review.id || `review-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.25)]"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-black text-white">
                    {getInitials(review.customerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-bold text-slate-800">
                        {formatDisplayName(review.customerName)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatRelativeDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StarsRow rating={Number(review.storeRating || 0)} />
                    </div>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                        {review.comment}
                      </p>
                    )}
                    {review.storeReply && (
                      <div className="mt-2.5 rounded-xl border border-[#336886]/15 bg-[#eef5f8] px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#336886]">Resposta da loja</p>
                        <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                          {review.storeReply}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StoreReviewsTab;
