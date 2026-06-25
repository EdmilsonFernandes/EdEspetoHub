import { defaultPaymentMethod } from '../constants';
import { haversineKm } from '../utils/geo';

export const WEEKDAY_LABELS = [ 'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado' ];
export const PUBLIC_ORDER_ALERT_TTL_MS = 3 * 60 * 60 * 1000;
export const CUSTOMER_REMEMBER_EMAIL_KEY = 'jnk_customer_auth_email';
export const NATIVE_NAV_VISIBILITY_EVENT = 'jnc:native-nav-visibility';
export const CHECKOUT_SLOW_FEEDBACK_MS = 2800;
export const CHECKOUT_CREATE_ORDER_TIMEOUT_MS = 18000;
export const STOREFRONT_PRODUCTS_REFRESH_TIMEOUT_MS = 10000;
export const STOREFRONT_PRODUCTS_SLOW_FEEDBACK_MS = 2200;
export const STOREFRONT_PRODUCTS_CACHE_MAX_AGE_MS = 90 * 1000;

export const buildPublicPaymentSummary = (storeData: any) => {
  const rawSummary = storeData?.paymentSummary || {};
  const rawMethods = rawSummary?.methods || {};
  const manualPixEnabled = Boolean(String(storeData?.settings?.pixKey || '').trim());
  const cashEnabled = rawSummary?.cashEnabled !== false;

  return {
    provider: rawSummary?.provider || 'MERCADO_PAGO',
    onlineEnabled: Boolean(rawMethods.pixOnline || rawMethods.creditOnline || rawMethods.debitOnline),
    manualPixEnabled: Boolean(rawMethods.manualPix ?? manualPixEnabled),
    cashEnabled,
    providerConnected: Boolean(rawSummary?.providerConnected),
    providerStatus: rawSummary?.providerStatus || null,
    methods: {
      pixOnline: Boolean(rawMethods.pixOnline),
      creditOnline: Boolean(rawMethods.creditOnline),
      debitOnline: Boolean(rawMethods.debitOnline),
      manualPix: Boolean(rawMethods.manualPix ?? manualPixEnabled),
      cash: cashEnabled,
    },
  };
};

export const PROFESSIONAL_LOCAL_PAYMENT_METHODS = [
  {
    id: 'debito_presencial',
    label: 'Débito',
    description: 'Pagamento no atendimento',
    group: 'local',
  },
  {
    id: 'credito_presencial',
    label: 'Crédito',
    description: 'Pagamento no atendimento',
    group: 'local',
  },
  {
    id: 'pix_presencial',
    label: 'Pix',
    description: 'Pagamento confirmado no atendimento',
    group: 'local',
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro',
    description: 'Pagamento no atendimento',
    group: 'local',
  },
];

export const PROFESSIONAL_PAYMENT_METHOD_MAP: Record<string, string> = {
  pix: 'pix_presencial',
  pix_presencial: 'pix_presencial',
  debito: 'debito_presencial',
  débito: 'debito_presencial',
  debito_presencial: 'debito_presencial',
  credito: 'credito_presencial',
  crédito: 'credito_presencial',
  credito_presencial: 'credito_presencial',
  dinheiro: 'dinheiro',
  cash: 'dinheiro',
};

export const resolveCheckoutPaymentMethods = (paymentSummary: any, forceProfessionalLocal = false) => {
  if (forceProfessionalLocal) {
    return PROFESSIONAL_LOCAL_PAYMENT_METHODS;
  }
  const summary = paymentSummary || {};
  const methods = summary?.methods || {};
  const available = [];

  if (methods.pixOnline) {
    available.push({
      id: 'pix',
      label: 'Pix',
      description: 'Via Mercado Pago',
      group: 'online',
    });
  }
  if (methods.creditOnline) {
    available.push({
      id: 'credito',
      label: 'Crédito',
      description: 'Via Mercado Pago',
      group: 'online',
    });
  }
  if (methods.debitOnline) {
    available.push({
      id: 'debito',
      label: 'Débito',
      description: 'Via Mercado Pago',
      group: 'online',
    });
  }
  if (methods.manualPix) {
    available.push({
      id: 'pix_loja',
      label: 'Pix da loja',
      description: 'Chave exibida apos confirmar',
      group: 'local',
    });
  }
  if (methods.cash !== false) {
    available.push({
      id: 'dinheiro',
      label: 'Dinheiro',
      description: 'Pagamento no atendimento',
      group: 'local',
    });
  }

  return available.length
    ? available
    : [
        {
          id: 'dinheiro',
          label: 'Dinheiro',
          description: 'Pagamento no atendimento',
          group: 'local',
        },
      ];
};

export const resolveCheckoutPaymentSelection = (
  currentPaymentMethod: string,
  availableMethods: Array<{ id: string }>,
  forceProfessionalLocal = false
) => {
  const current = String(currentPaymentMethod || '').trim().toLowerCase();
  if (availableMethods.some((method) => method.id === current)) {
    return current;
  }

  if (forceProfessionalLocal) {
    const mapped = PROFESSIONAL_PAYMENT_METHOD_MAP[current];
    if (mapped && availableMethods.some((method) => method.id === mapped)) {
      return mapped;
    }
    return availableMethods[0]?.id || 'debito_presencial';
  }

  return availableMethods[0]?.id || defaultPaymentMethod;
};

export const resolveOrderPaymentMethodForCheckout = (paymentMethod: string, forceProfessionalLocal = false) => {
  const current = String(paymentMethod || '').trim().toLowerCase();
  if (!forceProfessionalLocal) return current;
  return PROFESSIONAL_PAYMENT_METHOD_MAP[current] || 'dinheiro';
};

export const POSTAL_PREPAID_PAYMENT_METHODS = new Set([
  'pix',
  'credito',
  'crédito',
  'debito',
  'débito',
  'credit_card',
  'debit_card',
  'cartao',
  'cartão',
]);

export const isPostalPrepaidPaymentMethod = (paymentMethod?: string | null) =>
  POSTAL_PREPAID_PAYMENT_METHODS.has(String(paymentMethod || '').trim().toLowerCase());

export const getOrderStatusTone = (status?: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  const tones: Record<string, string> = {
    awaiting_payment: 'bg-sky-100 text-sky-700 border-sky-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    preparing: 'bg-sky-100 text-sky-700 border-sky-200',
    ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ready_for_delivery: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    waiting_for_motoboy: 'bg-violet-100 text-violet-700 border-violet-200',
    in_delivery: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    finished: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return tones[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
};

export const isTerminalRecentOrder = (entry?: { status?: string; paymentStatus?: string }) => {
  const status = String(entry?.status || '').trim().toLowerCase();
  const paymentStatus = String(entry?.paymentStatus || '').trim().toUpperCase();
  if ([ 'done', 'delivered', 'finished', 'cancelled', 'rejected' ].includes(status)) return true;
  if (!status && paymentStatus === 'PAID') return true;
  return false;
};

export const haversineDistanceKm = haversineKm;

export const canUseDeliveryBySubscription = (subscription: any, settings: any) => {
  const isVip = Boolean(settings?.planExempt || subscription?.planExempt);
  if (isVip) return true;
  const status = String(subscription?.status || '').toUpperCase();
  if (status === 'TRIAL') return true;
  if (Boolean(subscription?.features?.deliveryMode)) return true;
  const planName = String(subscription?.plan?.name || '').toLowerCase();
  return planName.includes('pro') || planName.includes('vip');
};
