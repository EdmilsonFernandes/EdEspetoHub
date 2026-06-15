import { useEffect, useState } from 'react';
import { Star, ChatCircleDots, WarningCircle, Sparkle } from '@phosphor-icons/react';
import { storeService } from '../../services/storeService';
import { formatRelativeDate } from '../../utils/format';

type ReviewRow = {
  id?: string;
  storeRating?: number;
  comment?: string | null;
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
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
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

  useEffect(() => {
    let active = true;
    if (!storeSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    storeService
      .fetchPublicStoreReviews(storeSlug, { limit: 20 })
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

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <WarningCircle size={32} weight="duotone" className="text-rose-400" />
        <p className="text-sm font-medium text-slate-600">{error}</p>
      </div>
    );
  }

  const avg = Number(data?.avgStoreRating || 0);
  const total = Number(data?.totalReviews || 0);
  const distribution = buildDistribution(data?.distribution);
  const maxTotal = Math.max(1, ...distribution.map((d) => d.total));
  const positivePercent = Number(data?.positivePercent || 0);
  const topTags = Array.isArray(data?.topTags) ? data.topTags.slice(0, 5) : [];
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];

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
      {/* Header da nota */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)] sm:p-5">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-slate-900">{avg.toFixed(1).replace('.', ',')}</span>
          <Star size={22} weight="fill" className="text-amber-400" />
        </div>
        <div className="flex flex-col">
          <StarsRow rating={avg} size={18} />
          <span className="mt-1 text-xs font-medium text-slate-500">
            {total} {total === 1 ? 'avaliação' : 'avaliações'}
          </span>
        </div>
      </section>

      {/* Gráfico de distribuição */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] sm:p-5">
        <div className="space-y-2">
          {distribution.map((d) => (
            <div key={d.rating} className="flex items-center gap-3">
              <span className="w-3 text-xs font-bold text-slate-600">{d.rating}</span>
              <Star size={13} weight="fill" className="text-amber-400" />
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(d.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-slate-500">{d.total}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Card de qualidade */}
      {(positivePercent > 0 || topTags.length > 0) && (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-[0_18px_40px_-34px_rgba(5,150,105,0.35)] sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkle size={18} weight="fill" className="text-emerald-500" />
            <span className="text-sm font-bold text-emerald-700">
              {positivePercent > 0 ? `${positivePercent}% avaliações positivas` : 'Avaliações dos clientes'}
            </span>
          </div>
          {topTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Feed de comentários */}
      <section>
        <h3 className="mb-3 px-1 text-sm font-bold text-slate-800">Comentários</h3>
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <ChatCircleDots size={28} weight="duotone" className="text-slate-300" />
            <p className="text-xs font-medium text-slate-500">Ainda não há comentários por escrito.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, index) => (
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
