import { useEffect, useState } from 'react';
import { customerAccountService } from '../../services/customerAccountService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

export type HubReorderStore = {
  slug: string;
  name: string;
  logoUrl?: string | null;
};

/**
 * Lojas dos pedidos mais recentes do cliente — alimenta o "Peça de novo"
 * do hub (benchmark §29: reorder em 2 toques a partir da home).
 * Falha silenciosa: sem pedidos/auth a seção simplesmente não aparece.
 */
export function useHubReorderStores(isLogged: boolean) {
  const [reorderStores, setReorderStores] = useState<HubReorderStore[]>([]);

  useEffect(() => {
    if (!isLogged) {
      setReorderStores([]);
      return;
    }
    let cancelled = false;

    customerAccountService
      .listOrders({ limit: 8, offset: 0 })
      .then((result: any) => {
        if (cancelled) return;
        const orders: any[] = Array.isArray(result?.data) ? result.data : [];
        const bySlug = new Map<string, HubReorderStore>();
        for (const order of orders) {
          const store = order?.store;
          const slug = String(store?.slug || '').trim();
          if (!slug || bySlug.has(slug)) continue;
          bySlug.set(slug, {
            slug,
            name: String(store?.name || slug).trim() || slug,
            // o payload de pedidos aninha o logo em store.settings (mesmo padrão do ClientOrders) —
            // lendo só store.logoUrl a seção "Peça de novo" ficava sempre com iniciais
            logoUrl: resolveAssetUrl(
              store?.logoUrl || store?.logo_url || store?.settings?.logoUrl || store?.settings?.logo_url || null
            ),
          });
        }
        if (!cancelled) setReorderStores(Array.from(bySlug.values()).slice(0, 4));
      })
      .catch(() => {
        // Silencioso — seção opcional
      });

    return () => {
      cancelled = true;
    };
  }, [isLogged]);

  return { reorderStores };
}
