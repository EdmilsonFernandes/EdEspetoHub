const OPERATIONAL_STORE_ROLES = new Set(['ADMIN', 'OPERATOR', 'LOJISTA']);

export const normalizeStorefrontSlug = (value?: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const getOperationalSessionStoreSlug = (session?: any | null) =>
  normalizeStorefrontSlug(
    session?.store?.slug ||
      session?.user?.store?.slug ||
      session?.user?.storeSlug ||
      session?.storeSlug
  );

export const isOperationalStoreSession = (session?: any | null) => {
  const role = String(session?.user?.role || session?.role || '').trim().toUpperCase();
  const hasStoreContext = Boolean(
    session?.store?.id ||
      session?.store?.slug ||
      session?.user?.store?.id ||
      session?.user?.store?.slug ||
      session?.user?.storeSlug ||
      session?.storeSlug
  );
  return Boolean(session?.token && session?.user && OPERATIONAL_STORE_ROLES.has(role) && hasStoreContext);
};

export const isOperationalSessionForStore = (session?: any | null, storeSlug?: unknown) => {
  if (!isOperationalStoreSession(session)) return false;
  const sessionSlug = getOperationalSessionStoreSlug(session);
  const routeSlug = normalizeStorefrontSlug(storeSlug);
  return Boolean(sessionSlug && routeSlug && sessionSlug === routeSlug);
};

export const isPublicStorefrontNavigation = (state?: any | null) => {
  const mode = String(state?.storefrontMode || state?.storefrontContext || '').trim().toLowerCase();
  return mode === 'public' || mode === 'customer' || state?.fromHub === true;
};
