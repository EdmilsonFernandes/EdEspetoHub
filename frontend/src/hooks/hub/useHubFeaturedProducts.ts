import { useEffect, useMemo, useState } from 'react';
import { featuredService } from '../../services/featuredService';
import { productService } from '../../services/productService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../../utils/storeAvatar';

export type HubFeaturedProduct = {
  id: string;
  productId?: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  name: string;
  imageUrl: string;
  price: number;
  sponsored?: boolean;
  badge?: string;
};

type HubFeaturedStore = {
  slug: string;
  name: string;
  logo: string;
  segment: string;
};

export function useHubFeaturedProducts(stores: HubFeaturedStore[]) {
  const [featuredProducts, setFeaturedProducts] = useState<HubFeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredOffset, setFeaturedOffset] = useState(0);

  useEffect(() => {
    if (featuredProducts.length <= 8) {
      setFeaturedOffset(0);
      return;
    }

    const timer = window.setInterval(() => {
      setFeaturedOffset((prev) => (prev + 1) % featuredProducts.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [featuredProducts]);

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedProducts = async () => {
      if (stores.length === 0) {
        setFeaturedProducts([]);
        return;
      }

      setFeaturedLoading(true);
      try {
        const sponsored = await featuredService.listPublicFeatured(18).catch(() => []);
        const sponsoredEntries = (Array.isArray(sponsored) ? sponsored : [])
          .filter((item: any) => String(item?.storeSlug || '').trim())
          .map((item: any) => ({
            id: String(item?.id || `${item?.storeSlug}-${item?.productId || item?.productName || 'sponsored'}`),
            productId: String(item?.productId || '').trim() || undefined,
            storeSlug: String(item?.storeSlug || ''),
            storeName: String(item?.storeName || 'Loja'),
            name: String(item?.productName || 'Produto em destaque'),
            storeLogo: resolveAssetUrl(item?.storeLogoUrl || undefined) || '/janocaminho.jpg',
            imageUrl:
              resolveAssetUrl(item?.imageUrl || undefined) ||
              resolveAssetUrl(item?.storeLogoUrl || undefined) ||
              getStoreAvatarUrl(item?.storeSlug, item?.storeName),
            price: Number(item?.price || 0),
            sponsored: true,
            badge: String(item?.badge || 'Patrocinado'),
          }))
          .filter((item: HubFeaturedProduct) => item.storeSlug && item.price > 0);

        const candidates = stores.slice(0, 4);
        const responses = await Promise.allSettled(
          candidates.map(async (store) => {
            const products = await productService.listPublicBySlug(store.slug);
            const valid = (Array.isArray(products) ? products : [])
              .filter((product: any) => Boolean(product?.name) && Number(product?.price || product?.promoPrice || 0) > 0)
              .map((product: any) => ({
                id: String(product?.id || `${store.slug}-${product?.name}`),
                productId: String(product?.id || '').trim() || undefined,
                storeSlug: store.slug,
                storeName: store.name,
                name: String(product?.name || 'Produto'),
                storeLogo: store.logo,
                imageUrl: resolveAssetUrl(product?.imageUrl || undefined) || store.logo,
                price: Number(
                  (product?.promoActive && product?.promoPrice != null ? product?.promoPrice : product?.price) || 0
                ),
                featured: Boolean(product?.isFeatured),
                sponsored: false,
              }))
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 5);
            return valid;
          })
        );

        if (cancelled) return;

        const organicPool = responses
          .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
          .filter((entry) => entry.price > 0)
          .map(({ featured: _featured, ...entry }) => entry);
        const sponsoredKeys = new Set(
          sponsoredEntries.map((entry) => `${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const uniqueOrganic = organicPool.filter(
          (entry) => !sponsoredKeys.has(`${entry.storeSlug}::${entry.id}::${entry.name}`)
        );
        const shuffledOrganic = [...uniqueOrganic].sort(() => Math.random() - 0.5);
        const merged = [...sponsoredEntries, ...shuffledOrganic].slice(0, 18);
        setFeaturedProducts(merged);
      } catch (_error) {
        if (!cancelled) setFeaturedProducts([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    };

    const timer = window.setTimeout(loadFeaturedProducts, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [stores]);

  const genericHighlightLabel = useMemo(() => {
    const hasFoodHeavy = stores.some((store) =>
      ['Restaurante', 'Hamburguer', 'Lanche', 'Pizza', 'Doces'].includes(store.segment)
    );
    return hasFoodHeavy ? 'Destaques de hoje' : 'Achados de hoje';
  }, [stores]);

  const displayedFeaturedProducts = useMemo(() => {
    const items = Array.isArray(featuredProducts) ? featuredProducts : [];
    const sponsored = items.filter((item) => item.sponsored);
    const organic = items.filter((item) => !item.sponsored);
    const windowSize = 8;
    if (items.length <= windowSize) return [...sponsored, ...organic];
    if (organic.length === 0) return sponsored.slice(0, windowSize);

    const fixedSponsored = sponsored.slice(0, Math.min(windowSize, sponsored.length));
    const remainingSlots = Math.max(0, windowSize - fixedSponsored.length);
    if (remainingSlots === 0) return fixedSponsored;

    const rotatedOrganic: HubFeaturedProduct[] = [];
    for (let i = 0; i < remainingSlots; i += 1) {
      rotatedOrganic.push(organic[(featuredOffset + i) % organic.length]);
    }
    return [...fixedSponsored, ...rotatedOrganic];
  }, [featuredOffset, featuredProducts]);

  return {
    featuredLoading,
    displayedFeaturedProducts,
    genericHighlightLabel,
    hasSponsoredFeaturedProducts: displayedFeaturedProducts.some((item) => item.sponsored),
    hasFeaturedCarouselOverflow: displayedFeaturedProducts.length > 3,
  };
}
