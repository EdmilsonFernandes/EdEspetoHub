// Assinatura e plano V2 — composição sobre os MESMOS services da V1
// (subscription, plans, payments, delivery-billing). Nenhuma regra financeira
// nova: renovação usa createRenewal e abre o paymentLink como o AdminRenewal.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrownSimple, RocketLaunch } from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { subscriptionService } from '../../../services/subscriptionService';
import { planService } from '../../../services/planService';
import { paymentService } from '../../../services/paymentService';
import { deliveryBillingService } from '../../../services/deliveryBillingService';
import { formatCurrency, formatDate } from '../../../utils/format';
import { isFounderPlanName } from '../../../constants/planCatalog';
import { Badge } from '../../../components/reui/badge';
import { Button } from '../../../components/ui/Button';
import { FramePanel } from '../../../components/reui/frame';
import { cn } from '@/lib/utils';
import { V2EmptyRegion, V2ErrorRegion, V2LoadingRegion } from '../v2ui';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  TRIAL: { label: 'Período de teste', badge: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-400' },
  ACTIVE: { label: 'Ativa', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400' },
  PENDING: { label: 'Pagamento pendente', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400' },
  EXPIRED: { label: 'Expirada', badge: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400' },
  SUSPENDED: { label: 'Suspensa', badge: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400' },
  CANCELLED: { label: 'Cancelada', badge: 'bg-muted text-muted-foreground border-border' },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirou',
};

export const AssinaturaSection = () => {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '');

  const [subscription, setSubscription] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);
  const [plansData, setPlansData] = useState<any | null>(null);
  const [cycle, setCycle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [renewingPlanId, setRenewingPlanId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setError(false);
    Promise.all([
      subscriptionService.getByStore(storeId).catch(() => null),
      paymentService.listByStore(storeId, 20).catch(() => null),
      planService.listForStore(storeId).catch(() => null),
    ])
      .then(([subscriptionData, paymentsData, plans]) => {
        setSubscription(subscriptionData || null);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setPlansData(plans || null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusKey = String(subscription?.status || auth?.subscription?.status || 'ACTIVE').toUpperCase();
  const statusMeta = STATUS_META[statusKey] || STATUS_META.ACTIVE;
  const isVip = Boolean(subscription?.planExempt || auth?.subscription?.planExempt);
  const isFounderTrial = Boolean(
    subscription?.founderVipPromotion?.applied && statusKey === 'TRIAL' && !isVip
  );
  const planName = String(subscription?.plan?.name || auth?.subscription?.plan?.name || '');
  const isFounder = isFounderPlanName(planName);

  const renewPlan = async (plan: any) => {
    if (!storeId || !plan?.id) return;
    setRenewingPlanId(String(plan.id));
    try {
      const result: any = await subscriptionService.createRenewal(storeId, {
        planId: plan.id,
        paymentMethod: 'PIX',
      });
      const link = String(result?.paymentLink || result?.paymentUrl || '').trim();
      if (link) {
        window.open(link, '_blank', 'noopener');
        showToast('Pagamento aberto em nova aba — a assinatura ativa quando confirmar.', 'info');
      } else {
        showToast('Assinatura solicitada. Acompanhe o pagamento abaixo.', 'success');
      }
      load();
    } catch (err: any) {
      const code = String(err?.code || '');
      showToast(
        code === 'SUB-007'
          ? 'Já existe um pagamento pendente. Tente novamente em alguns minutos.'
          : String(err?.message || 'Não foi possível iniciar a renovação.'),
        'error'
      );
    } finally {
      setRenewingPlanId(null);
    }
  };

  const payCycle = async () => {
    if (!storeId) return;
    setBillingLoading(true);
    try {
      const result: any = await deliveryBillingService.ensurePayment(storeId);
      const link = String(result?.cycle?.paymentLink || result?.paymentLink || '').trim();
      if (link) {
        window.open(link, '_blank', 'noopener');
      } else {
        showToast('Nada a regularizar agora.', 'success');
      }
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível gerar a cobrança do ciclo.'), 'error');
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    // ciclo de repasse/frete: fetch lazy ao abrir a seção (padrão da V1)
    if (!storeId) return;
    deliveryBillingService
      .getCurrentCycle(storeId)
      .then((data: any) => setCycle(data?.cycle ?? data ?? null))
      .catch(() => setCycle(null));
  }, [storeId]);

  const plans = useMemo(() => {
    const regular = Array.isArray(plansData?.plans) ? plansData.plans : [];
    const founder = Array.isArray(plansData?.founderPlans) ? plansData.founderPlans : [];
    const eligible = isFounder && founder.length > 0 ? founder : regular;
    return eligible.filter((plan: any) => !isFounderPlanName(String(plan?.name || '')) || founder.length > 0);
  }, [plansData, isFounder]);

  const cycleDue = Number(cycle?.amountDue ?? cycle?.amount_due ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      {loading ? (
        <V2LoadingRegion rows={3} />
      ) : error ? (
        <V2ErrorRegion message="Não foi possível carregar sua assinatura." onRetry={load} />
      ) : (
        <>
          <FramePanel className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {isVip ? 'Cliente VIP' : isFounder ? 'Plano Fundador' : 'Assinatura'}
                  </h2>
                  <Badge className={cn(statusMeta.badge, 'border')}>{statusMeta.label}</Badge>
                  {isFounder && (
                    <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <CrownSimple weight="fill" className="mr-1 size-3" aria-hidden="true" />
                      Fundador
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {isVip
                    ? 'Isento de cobrança — cliente VIP.'
                    : isFounderTrial
                      ? 'Sem cobrança durante a campanha fundador.'
                      : planName
                        ? `Plano ${planName}`
                        : 'Nenhum plano ativo no momento.'}
                </p>
              </div>
              {!isVip && subscription?.endDate && statusKey !== 'CANCELLED' && (
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Válido até</p>
                  <p className="text-sm font-semibold">{formatDate(subscription.endDate)}</p>
                </div>
              )}
            </div>
          </FramePanel>

          {!isVip && !isFounderTrial && plans.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <RocketLaunch className="size-4" aria-hidden="true" />
                Trocar ou renovar plano
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {plans.slice(0, 4).map((plan: any) => {
                  const price = Number(plan?.price ?? 0);
                  const period = String(plan?.period || plan?.billingPeriod || 'month') === 'year' ? '/ano' : '/mês';
                  return (
                    <FramePanel key={plan.id} className="flex flex-col gap-2 p-4">
                      <span className="text-sm font-semibold">{String(plan?.name || 'Plano')}</span>
                      {price > 0 && (
                        <span className="text-2xl font-semibold tracking-tight tabular-nums">
                          {formatCurrency(price)}
                          <span className="text-muted-foreground text-xs font-normal">{period}</span>
                        </span>
                      )}
                      <p className="text-muted-foreground min-h-8 text-xs">
                        {String(plan?.description || 'Mantenha sua loja ativa no Já no Caminho.')}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-auto w-fit"
                        loading={renewingPlanId === String(plan.id)}
                        onClick={() => renewPlan(plan)}
                      >
                        Assinar / renovar
                      </Button>
                    </FramePanel>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <FramePanel className="flex flex-col gap-3 p-4">
              <h3 className="text-sm font-semibold">Histórico de pagamentos</h3>
              {payments === null ? (
                <V2LoadingRegion rows={3} />
              ) : payments.length === 0 ? (
                <V2EmptyRegion title="Nenhum pagamento ainda" />
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {payments.map((payment: any) => {
                    const status = String(payment?.status || '').toUpperCase();
                    const tone =
                      status === 'PAID'
                        ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : status === 'PENDING'
                          ? 'border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400';
                    return (
                      <li key={payment?.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium tabular-nums">
                            {formatCurrency(Number(payment?.amount || 0))}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {payment?.createdAt ? formatDate(payment.createdAt) : ''}
                            {payment?.provider ? ` · ${String(payment.provider).replace('_', ' ')}` : ''}
                          </p>
                        </div>
                        <Badge className={tone}>
                          {PAYMENT_STATUS_LABEL[status] || status || '—'}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FramePanel>

            <FramePanel className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Ciclo de entregas</h3>
                {cycleDue > 0 && (
                  <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    regularizar
                  </Badge>
                )}
              </div>
              {cycle ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p className="text-muted-foreground text-xs">
                    Repasse das entregas realizadas no ciclo — não trava o checkout dos seus clientes.
                  </p>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(cycleDue)}
                  </p>
                  {cycleDue > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-fit"
                      loading={billingLoading}
                      onClick={payCycle}
                    >
                      Regularizar agora
                    </Button>
                  )}
                </div>
              ) : (
                <V2EmptyRegion title="Nada a pagar no ciclo" hint="Cobranças de entrega aparecem aqui." />
              )}
            </FramePanel>
          </div>
        </>
      )}
    </div>
  );
};
