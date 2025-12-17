import { formatPhoneInput } from '../utils/format';

export const DEFAULT_AREA_CODE = '12';
export const initialCustomer = { name: '', phone: formatPhoneInput('', DEFAULT_AREA_CODE), address: '', table: '', type: 'delivery' };
export const defaultPaymentMethod = 'debito';
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '5512996797210';
export const PIX_KEY = import.meta.env.VITE_PIX_KEY || '';

export const defaultBranding = {
  brandName: 'Chama no Espeto',
  espetoId: import.meta.env.VITE_DEFAULT_STORE || 'espetinhodatony',
  logoUrl: '/logo.svg',
  primaryColor: '#b91c1c',
  accentColor: '#111827',
  tagline: 'Crie seu site de pedidos de churrasco em minutos',
  instagram: '',
};

export const brandingStorageKey = (ownerId: string) => `brandingSettings:${ownerId || defaultBranding.espetoId}`;

export const getPersistedBranding = (ownerId: string = defaultBranding.espetoId) => {
  const saved = localStorage.getItem(brandingStorageKey(ownerId));
  if (!saved) return { ...defaultBranding, espetoId: ownerId };
  try {
    const parsed = JSON.parse(saved);
    return { ...defaultBranding, espetoId: ownerId, ...parsed };
  } catch (error) {
    console.error('Erro ao carregar branding salvo', error);
    return { ...defaultBranding, espetoId: ownerId };
  }
};
