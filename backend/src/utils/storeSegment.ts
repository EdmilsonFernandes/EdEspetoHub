export const STORE_SEGMENTS = [
  'restaurante',
  'hamburgueria',
  'lanchonete',
  'pizzaria',
  'adega',
  'mercado',
  'hortifruti',
  'farmacia',
  'confeitaria',
  'servicos',
  'outros',
] as const;

export type StoreSegment = (typeof STORE_SEGMENTS)[number];

// Segmentos de SERVICO (nao comida/varejo): o cliente nao compra online \u2014 agenda direto no
// WhatsApp da loja. Usado pelo frontend pra trocar "Card\u00e1pio" -> "Servi\u00e7os" e o botao de
// carrinho -> "Agendar no WhatsApp".
const SERVICE_SEGMENT_SYNONYMS = [
  'servicos', 'servico', 'lavarapido', 'lava_rapido', 'lavacao', 'lava\u00e7\u00e3o',
  'beleza', 'salao', 'sal\u00e3o', 'barbearia', 'barbeiro', 'manicure', 'estetica',
  'oficina', 'mecanico', 'mec\u00e2nico', 'autocenter', 'prestador', 'prestacaodeservico',
];

export const isServiceSegment = (segment?: string | null): boolean => {
  const safe = sanitizeStoreSegment(segment);
  if (safe === 'servicos') return true;
  // Tambem detecta por sinonimo bruto (caso o valor ainda nao tenha sido sanitizado).
  const normalized = String(segment || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
  return SERVICE_SEGMENT_SYNONYMS.includes(normalized);
};

export const sanitizeStoreSegment = (value?: string | null): StoreSegment => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  if (normalized === 'hortifruti' || normalized === 'hortifrutigranjeiros') return 'hortifruti';
  if (normalized === 'farmacia' || normalized === 'drogaria') return 'farmacia';
  if (normalized === 'outros' || normalized === 'generico') return 'outros';
  if (SERVICE_SEGMENT_SYNONYMS.includes(normalized)) return 'servicos';
  if ((STORE_SEGMENTS as readonly string[]).includes(normalized)) return normalized as StoreSegment;
  return 'outros';
};

type SegmentPreset = {
  primaryColor: string;
  secondaryColor: string;
  description: string;
  orderTypes: string[];
};

const SEGMENT_PRESETS: Record<StoreSegment, SegmentPreset> = {
  restaurante: {
    primaryColor: '#f97316',
    secondaryColor: '#0f172a',
    description: 'Pratos frescos, pedidos rápidos e acompanhamento em tempo real.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
  hamburgueria: {
    primaryColor: '#ef4444',
    secondaryColor: '#111827',
    description: 'Hambúrguer artesanal com preparo ágil e sabor marcante.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
  lanchonete: {
    primaryColor: '#f59e0b',
    secondaryColor: '#1f2937',
    description: 'Lanches e combos prontos para balcão, retirada e entrega.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
  pizzaria: {
    primaryColor: '#dc2626',
    secondaryColor: '#111827',
    description: 'Pizzas e porções com cardápio online e fila organizada.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
  adega: {
    primaryColor: '#7c3aed',
    secondaryColor: '#0f172a',
    description: 'Bebidas geladas e conveniência com pedidos simples no celular.',
    orderTypes: ['delivery', 'pickup'],
  },
  mercado: {
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a',
    description: 'Mercado digital com produtos por categoria e checkout rápido.',
    orderTypes: ['delivery', 'pickup'],
  },
  hortifruti: {
    primaryColor: '#16a34a',
    secondaryColor: '#14532d',
    description: 'Frutas, verduras e legumes frescos com pedido online.',
    orderTypes: ['delivery', 'pickup'],
  },
  farmacia: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#0f172a',
    description: 'Medicamentos e conveniência com atendimento rápido e seguro.',
    orderTypes: ['delivery', 'pickup'],
  },
  confeitaria: {
    primaryColor: '#ec4899',
    secondaryColor: '#1f2937',
    description: 'Doces e sobremesas com vitrine digital irresistível.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
  servicos: {
    primaryColor: '#0d9488',
    secondaryColor: '#0f172a',
    description: 'Vitrine de serviços com agendamento direto pelo WhatsApp da loja.',
    orderTypes: [],
  },
  outros: {
    primaryColor: '#2f9df7',
    secondaryColor: '#5fd35a',
    description: 'Loja online com pedidos organizados e experiência moderna.',
    orderTypes: ['delivery', 'pickup', 'table'],
  },
};

export const getStoreSegmentPreset = (segment?: string | null): SegmentPreset => {
  const safe = sanitizeStoreSegment(segment);
  return SEGMENT_PRESETS[safe];
};

