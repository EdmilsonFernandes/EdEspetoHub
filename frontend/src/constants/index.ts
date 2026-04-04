// @ts-nocheck
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

export const initialCustomer = { name: '', phone: '', address: '', table: '', type: 'table' };
export const defaultPaymentMethod = 'debito';
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '5512996797210';
export const PIX_KEY = import.meta.env.VITE_PIX_KEY || '';

export const defaultBranding = {
  brandName: 'Já no Caminho',
  espetoId: import.meta.env.VITE_DEFAULT_STORE || 'espetinhodatony',
  logoUrl: '/janocaminho-logo.png',
  bannerUrl: '',
  primaryColor: '#2f9df7',
  accentColor: '#5fd35a',
  tagline: 'Crie seu site de pedidos online em minutos',
  instagram: '',
};

export const brandingStorageKey = (ownerId: string) => `brandingSettings:${ownerId || defaultBranding.espetoId}`;

export const getPersistedBranding = (ownerId: string = defaultBranding.espetoId) => {
  const saved = localStorage.getItem(brandingStorageKey(ownerId));
  if (!saved) return { ...defaultBranding, espetoId: ownerId };
  try {
    const parsed = JSON.parse(saved);
  return {
    ...defaultBranding,
    espetoId: ownerId,
    ...parsed,
    logoUrl: resolveAssetUrl(parsed.logoUrl || defaultBranding.logoUrl),
    bannerUrl: resolveAssetUrl(parsed.bannerUrl || defaultBranding.bannerUrl),
  };
  } catch (error) {
    console.error('Erro ao carregar branding salvo', error);
    return { ...defaultBranding, espetoId: ownerId };
  }
};


