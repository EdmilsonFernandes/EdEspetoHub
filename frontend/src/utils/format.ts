export const APP_TIMEZONE = 'America/Sao_Paulo';

export const formatCurrency = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDateTime = (timestamp: Date | number | string | { seconds: number } | null | undefined) => {
  if (!timestamp) return '';
  const parsed =
    typeof timestamp === 'object' && 'seconds' in timestamp
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('pt-BR', { timeZone: APP_TIMEZONE });
};

export const formatDate = (timestamp: Date | number | string | { seconds: number } | null | undefined) => {
  if (!timestamp) return '';
  const parsed =
    typeof timestamp === 'object' && 'seconds' in timestamp
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { timeZone: APP_TIMEZONE });
};

export const formatDuration = (milliseconds: number | null | undefined) => {
  if (!milliseconds || Number.isNaN(milliseconds)) return '0s';
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const formatOrderType = (type?: string) => {
  const map: Record<string, string> = {
    delivery: 'Entrega',
    pickup: 'Retirada',
    table: 'Mesa',
  };

  return (type && map[type]) || 'Não informado';
};

export const formatOrderStatus = (status?: string, type?: string) => {
  const normalizedType = (type || '').toString().toLowerCase();
  const readyLabel =
    normalizedType === 'delivery'
      ? 'Aguardando entregador'
      : normalizedType === 'table'
        ? 'Pedido pronto'
        : 'Pronto para retirada';
  const doneLabel =
    normalizedType === 'delivery'
      ? 'Saiu para entrega'
      : normalizedType === 'table'
        ? 'Pedido pronto'
        : 'Finalizado';
  const map: Record<string, string> = {
    awaiting_payment: 'Aguardando pagamento',
    pending: 'Pedido Recebido',
    preparing: 'Em Preparação',
    ready: readyLabel,
    waiting_for_motoboy: 'Aguardando entregador',
    in_delivery: 'Em rota',
    dispatched: 'Despachado',
    ready_for_delivery: 'Pronto para entrega',
    done: doneLabel,
    delivered: 'Entregue',
    finished: 'Finalizado',
    cancelled: 'Cancelado',
  };

  return (status && map[status]) || 'Indefinido';
};

export const formatPaymentMethod = (payment?: string) => {
  const normalized = (payment || '').toString().toLowerCase();
  const map: Record<string, string> = {
    pix: 'Pix',
    pix_loja: 'Pix da loja',
    'pix-loja': 'Pix da loja',
    debito: 'Débito',
    debit: 'Débito',
    credito: 'Crédito',
    credit: 'Crédito',
    credit_card: 'Crédito',
    boleto: 'Boleto',
    dinheiro: 'Dinheiro',
    cash: 'Dinheiro',
  };

  return map[normalized] || 'Não informado';
};

export const formatPlanName = (name = '') => {
  const normalized = String(name).toLowerCase();
  const tier =
    normalized.includes('premium')
      ? 'Premium'
      : normalized.includes('pro')
        ? 'Pro'
        : normalized.includes('basic') || normalized === 'monthly' || normalized === 'yearly'
          ? 'Basico'
          : '';
  const billing = normalized.includes('yearly')
    ? 'Anual'
    : normalized.includes('monthly') || normalized === 'monthly'
      ? 'Mensal'
      : '';

  if (!tier && !billing) return name || '-';
  if (!billing) return tier;
  if (!tier) return billing;
  return `${tier} ${billing}`;
};

export const formatPhoneInput = (value = '', defaultAreaCode = '') => {
  const raw = String(value || '').trim();
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  const fallbackDdd = (defaultAreaCode || '').replace(/\D/g, '').slice(0, 2);
  const hasExplicitDddPrefix = /^\(\d{1,2}\)?/.test(raw);

  if (!digits && !fallbackDdd) return '';
  if (hasExplicitDddPrefix && digits.length <= 2) {
    return digits ? `(${digits})` : fallbackDdd ? `(${fallbackDdd})` : '';
  }

  const hasCompleteDdd = digits.length >= 10;
  const ddd = hasCompleteDdd ? digits.slice(0, 2) : fallbackDdd;
  const number = hasCompleteDdd ? digits.slice(2, 11) : digits.slice(0, 9);

  const firstPart = number.length > 8 ? number.slice(0, 5) : number.slice(0, 4);
  const secondPart = number.length > 8 ? number.slice(5, 9) : number.slice(4, 8);

  if (ddd) {
    if (number.length > 0 && secondPart) return `(${ddd}) ${firstPart}-${secondPart}`;
    if (number.length > 0) return `(${ddd}) ${number}`;
    return `(${ddd})`;
  }

  if (secondPart) return `${firstPart}-${secondPart}`;
  return number;
};

export const formatOrderDisplayId = (orderId?: string, storeSlug = '') => {
  if (!orderId) return '';
  const shortId = String(orderId).slice(0, 8);
  const prefix = storeSlug ? String(storeSlug).replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() : '';
  return `${prefix}${shortId}`;
};

export const formatAddress = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value !== 'object') return '';

  const source = value as Record<string, unknown>;
  const direct =
    source.formatted ||
    source.fullAddress ||
    source.address ||
    source.label;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const street = String(source.street || source.logradouro || '').trim();
  const number = String(source.number || source.numero || '').trim();
  const complement = String(source.complement || source.complemento || '').trim();
  const neighborhood = String(source.neighborhood || source.bairro || '').trim();
  const city = String(source.city || source.cidade || '').trim();
  const state = String(source.state || source.uf || '').trim();
  const zipCode = String(source.zipCode || source.cep || '').trim();

  const line1 = [street, number].filter(Boolean).join(', ');
  const line2 = [complement, neighborhood].filter(Boolean).join(' - ');
  const line3 = [city, state].filter(Boolean).join(' - ');
  return [line1, line2, line3, zipCode].filter(Boolean).join(' | ');
};


