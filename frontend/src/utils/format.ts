export const formatCurrency = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDateTime = (timestamp: Date | number | string | { seconds: number } | null | undefined) => {
  if (!timestamp) return '';
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
  }
  return new Date(timestamp).toLocaleString('pt-BR');
};

export const formatDate = (timestamp: Date | number | string | { seconds: number } | null | undefined) => {
  if (!timestamp) return '';
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
  }
  return new Date(timestamp).toLocaleDateString('pt-BR');
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
  const map = {
    delivery: 'Entrega',
    pickup: 'Retirada',
    table: 'Mesa',
  };

  return map[type] || 'Não informado';
};

export const formatOrderStatus = (status?: string) => {
  const map = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Aguardando retirada',
    done: 'Finalizado',
    cancelled: 'Cancelado',
  };

  return map[status] || 'Indefinido';
};

export const formatPaymentMethod = (payment?: string) => {
  const normalized = (payment || '').toString().toLowerCase();
  const map = {
    pix: 'Pix',
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

export const formatPhoneInput = (value = '', defaultAreaCode = '12') => {
  const digits = (value || '').replace(/\D/g, '');
  const base = digits || defaultAreaCode;

  const ddd = base.slice(0, 2).padEnd(2, defaultAreaCode[1] || '');
  const number = base.slice(2, 11);

  const firstPart = number.slice(0, 5);
  const secondPart = number.slice(5, 9);

  if (number.length > 5) {
    return `(${ddd}) ${firstPart}-${secondPart}`.trim();
  }

  if (number.length > 0) {
    return `(${ddd}) ${number}`.trim();
  }

  return `(${ddd}) `;
};

export const formatOrderDisplayId = (orderId?: string, storeSlug = '') => {
  if (!orderId) return '';
  const shortId = String(orderId).slice(0, 8);
  const prefix = storeSlug ? String(storeSlug).replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() : '';
  return `${prefix}${shortId}`;
};
