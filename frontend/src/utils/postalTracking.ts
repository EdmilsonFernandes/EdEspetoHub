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
      description: 'Atualização do rastreio oficial.',
    };
  }
  if (key === 'seller') {
    return {
      kind: 'seller',
      label: 'Loja',
      description: 'Atualizado pelo vendedor.',
    };
  }
  return {
    kind: 'system',
    label: 'Já no Caminho',
    description: 'Acompanhamento automático do pedido.',
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
