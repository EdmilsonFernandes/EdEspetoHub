import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type AvailabilityDays = Partial<Record<DayKey, boolean>>;

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
  'outros',
] as const;

export type StoreSegment = (typeof STORE_SEGMENTS)[number];

export interface SocialLink {
  type: string;
  value: string;
}

export type SegmentPreset = {
  primaryColor: string;
  secondaryColor: string;
  description: string;
  orderTypes: string[];
};

@Provide(Tokens.Utils.BusinessUtil)
export class BusinessUtil {
  private readonly DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  private readonly ROLE_ALIASES: Record<string, string> = {
    CHURRASQUEIRO: 'OPERATOR',
    ADMIN: 'MANAGER',
  };

  private readonly SEGMENT_PRESETS: Record<StoreSegment, SegmentPreset> = {
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
    outros: {
      primaryColor: '#2f9df7',
      secondaryColor: '#5fd35a',
      description: 'Loja online com pedidos organizados e experiência moderna.',
      orderTypes: ['delivery', 'pickup', 'table'],
    },
  };

  public resolveDayKey(now: Date = new Date()): DayKey {
    return this.DAY_KEYS[now.getDay()];
  }

  public normalizeAvailabilityDays(input: unknown): AvailabilityDays | null {
    if (!input || typeof input !== 'object') return null;
    const entries = Object.entries(input as Record<string, unknown>)
      .filter(([key]) => this.DAY_KEYS.includes(key as DayKey))
      .map(([key, value]) => [key, Boolean(value)] as const);

    if (!entries.length) return null;

    const normalized = entries.reduce<AvailabilityDays>((acc, [key, value]) => {
      acc[key as DayKey] = value;
      return acc;
    }, {});

    const hasAny = Object.values(normalized).some(Boolean);
    return hasAny ? normalized : null;
  }

  public isProductAvailableToday(
    product: { active?: boolean; availabilityDays?: AvailabilityDays | null },
    now: Date = new Date()
  ): boolean {
    if (!product?.active) return false;
    const availability = product.availabilityDays;
    if (!availability || Object.keys(availability).length === 0) return true;
    const key = this.resolveDayKey(now);
    return availability[key] === true;
  }

  public sanitizeStoreSegment(value?: string | null): StoreSegment {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

    if (normalized === 'hortifruti' || normalized === 'hortifrutigranjeiros') return 'hortifruti';
    if (normalized === 'farmacia' || normalized === 'drogaria') return 'farmacia';
    if (normalized === 'outros' || normalized === 'generico') return 'outros';
    if ((STORE_SEGMENTS as readonly string[]).includes(normalized)) return normalized as StoreSegment;
    return 'outros';
  }

  public getStoreSegmentPreset(segment?: string | null): SegmentPreset {
    const safe = this.sanitizeStoreSegment(segment);
    return this.SEGMENT_PRESETS[safe];
  }

  public sanitizeSocialLinks(input: unknown): SocialLink[] {
    if (!Array.isArray(input)) return [];

    return input.filter(
      (l): l is SocialLink =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as any).type === 'string' &&
        typeof (l as any).value === 'string' &&
        (l as any).value.trim() !== ''
    );
  }

  public normalizeRole(role?: string | null): string | null {
    if (!role) return null;
    const key = role.toUpperCase();
    return this.ROLE_ALIASES[key] || key;
  }
}
