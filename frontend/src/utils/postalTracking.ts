export type PostalTrackingEvent = {
  id?: string | null;
  source?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  eventAt?: string | Date | null;
  createdAt?: string | Date | null;
};

const CORREIOS_TRACKING_CODE_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

export const normalizePostalTrackingCode = (value?: string | null) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toUpperCase()
    .slice(0, 40);

export const isCorreiosPostalTrackingCode = (value?: string | null) =>
  CORREIOS_TRACKING_CODE_RE.test(normalizePostalTrackingCode(value));

export const buildSiteCorreiosTrackingUrl = (trackingCode?: string | null) => {
  const normalized = normalizePostalTrackingCode(trackingCode);
  if (!isCorreiosPostalTrackingCode(normalized)) return '';
  return `https://www.sitecorreios.com.br/${encodeURIComponent(normalized)}`;
};

export const getPostalTrackingExternalUrl = (trackingCode?: string | null, trackingUrl?: string | null) => {
  const siteCorreiosUrl = buildSiteCorreiosTrackingUrl(trackingCode);
  if (siteCorreiosUrl) return siteCorreiosUrl;
  return String(trackingUrl || '').trim();
};

export const POSTAL_STATUS_COPY: Record<string, { label: string; description: string }> = {
  tracking_code_added: {
    label: 'Código informado',
    description: 'A loja informou o código para acompanhar o envio.',
  },
  tracking_code_updated: {
    label: 'Código atualizado',
    description: 'A loja atualizou os dados de rastreio.',
  },
  pending_posting: {
    label: 'Aguardando postagem',
    description: 'A loja está preparando o pedido para postar.',
  },
  posted: {
    label: 'Pedido postado',
    description: 'O pedido já foi entregue aos Correios.',
  },
  in_transit: {
    label: 'Em trânsito',
    description: 'A encomenda está a caminho.',
  },
  out_for_delivery: {
    label: 'Saiu para entrega',
    description: 'A encomenda saiu para entrega.',
  },
  awaiting_pickup: {
    label: 'Aguardando retirada',
    description: 'A encomenda está disponível para retirada.',
  },
  delivery_attempt: {
    label: 'Tentativa de entrega',
    description: 'A transportadora registrou uma tentativa de entrega.',
  },
  delivered: {
    label: 'Entregue',
    description: 'A encomenda foi entregue.',
  },
  exception: {
    label: 'Atenção no envio',
    description: 'Há uma ocorrência no envio para acompanhar.',
  },
};

export const getPostalStatusCopy = (status?: string | null) => {
  const key = String(status || '').trim().toLowerCase();
  return POSTAL_STATUS_COPY[key] || {
    label: 'Atualização do envio',
    description: 'Uma nova atualização foi registrada.',
  };
};

export const getPostalEventSourceCopy = (source?: string | null) => {
  const key = String(source || '').trim().toLowerCase();
  if (key === 'carrier') {
    return {
      kind: 'carrier',
      label: 'Correios',
      description: 'Rastreio oficial dos Correios.',
    };
  }
  if (key === 'seller') {
    return {
      kind: 'seller',
      label: 'Loja',
      description: 'Atualizado pela loja.',
    };
  }
  return {
    kind: 'system',
    label: 'Já no Caminho',
    description: 'Acompanhamento automatico do pedido.',
  };
};

export const sortPostalEventsDesc = (events: PostalTrackingEvent[]) =>
  (Array.isArray(events) ? events : [])
    .slice()
    .sort((a, b) => {
      const aTime = new Date((a.eventAt || a.createdAt || 0) as any).getTime();
      const bTime = new Date((b.eventAt || b.createdAt || 0) as any).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });

export const getPostalTrackingHeadline = (shipment: any, cancelled = false) => {
  if (cancelled) return { label: 'Envio cancelado', description: 'Este pedido postal foi cancelado.' };
  const summary = shipment?.trackingSummary;
  if (summary?.label) {
    return {
      label: summary.label,
      description: summary.description || getPostalStatusCopy(summary.status).description,
    };
  }
  if (!shipment?.trackingCode) {
    return {
      label: 'Aguardando código',
      description: 'A loja vai informar o código de rastreio quando postar o pedido.',
    };
  }
  return getPostalStatusCopy(shipment?.shipmentStatus || 'posted');
};

export const getPostalTrackingUnavailableCopy = (reason?: string | null) => {
  const normalized = String(reason || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (!normalized || normalized === 'carrier_provider_not_configured') {
    return {
      label: 'Rastreio integrado em preparação',
      description: 'Assim que houver atualização disponível, ela aparece aqui no app.',
    };
  }

  if (
    normalized.includes('periodo invalido') ||
    normalized.includes('empty_tracking_events') ||
    normalized.includes('sem eventos')
  ) {
    return {
      label: 'Rastreio externo disponível',
      description: 'O integrador ainda não trouxe a linha do tempo para o app. Você pode abrir a consulta sem captcha pelo link abaixo.',
    };
  }

  if (
    normalized.includes('credit') ||
    normalized.includes('saldo') ||
    normalized.includes('insufficient')
  ) {
    return {
      label: 'Consulta temporariamente indisponível',
      description: 'O acompanhamento interno está aguardando liberação do provedor de rastreio.',
    };
  }

  if (normalized.includes('timeout') || normalized.includes('provider_error') || normalized.includes('http_')) {
    return {
      label: 'Não foi possível atualizar agora',
      description: 'A consulta externa oscilou. Tente novamente em alguns minutos.',
    };
  }

  return {
    label: 'Atualização externa indisponível',
    description: 'O pedido continua acompanhado pelo app e novas movimentações aparecerão aqui.',
  };
};
