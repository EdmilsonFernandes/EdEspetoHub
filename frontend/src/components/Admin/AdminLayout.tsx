// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { subscriptionService } from '../../services/subscriptionService';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { auth, hydrated, setAuth } = useAuth();
  const { setBranding } = useTheme();
  const brandingKeyRef = useRef('');
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(auth?.subscription || null);

  useEffect(() => {
    if (!hydrated || !auth?.store) return;

    const settings = auth?.store?.settings || {};
    const logoUrl = resolveAssetUrl(settings.logoUrl);
    const name = auth?.store?.name;

    const key = `${auth?.store?.id ?? ''}|${settings.primaryColor ?? ''}|${settings.secondaryColor ?? ''}|${logoUrl ?? ''}|${name ?? ''}`;
    if (!auth?.store?.id) return;
    if (brandingKeyRef.current === key) return;
    brandingKeyRef.current = key;

    setBranding({
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      logoUrl,
      brandName: name,
    });
  }, [
    hydrated,
    auth?.store?.id,
    auth?.store?.name,
    auth?.store?.settings?.logoUrl,
    auth?.store?.settings?.primaryColor,
    auth?.store?.settings?.secondaryColor,
    setBranding,
  ]);

  useEffect(() => {
    if (!hydrated || !auth?.store?.id) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const fresh = await subscriptionService.getByStore(auth.store.id);
        if (cancelled) return;
        setSubscription(fresh);
        if (fresh && auth) {
          setAuth({ ...auth, subscription: fresh });
        }
      } catch (error) {
        console.error('Não foi possível carregar assinatura', error);
      }
    };

    refresh();
    return () => {
      cancelled = true;
    };
  }, [auth?.store?.id, hydrated, setAuth]);

  const daysLeft = useMemo(() => {
    if (!subscription?.endDate) return null;
    const end = new Date(subscription.endDate).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }, [subscription?.endDate]);

  const isTrial = subscription?.status === 'TRIAL';
  const showRenewBanner =
    !isTrial &&
    (subscription?.status === 'EXPIRING' ||
      (typeof daysLeft === 'number' && daysLeft <= 3 && daysLeft >= 0));

  const bannerText =
    typeof daysLeft === 'number' && daysLeft <= 0
      ? 'Sua assinatura expira hoje. Renove agora para evitar interrupcao.'
      : typeof daysLeft === 'number'
      ? `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para sua assinatura expirar.`
      : 'Sua assinatura esta perto de expirar.';

  return (
    <>
      {isTrial && (
        <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                ★
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Trial premium ativo</p>
                <p className="text-xs text-slate-600">
                  {typeof daysLeft === 'number' && daysLeft >= 0
                    ? `Seu trial termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}.`
                    : 'Seu trial esta ativo. Aproveite para configurar sua loja.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/renewal')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:opacity-90 shadow-sm"
            >
              Garantir minha vaga
            </button>
          </div>
        </div>
      )}
      {showRenewBanner && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Assinatura perto do vencimento</p>
              <p className="text-xs text-amber-800">{bannerText}</p>
            </div>
            <button
              onClick={() => navigate('/admin/renewal')}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:opacity-90"
            >
              Renovar agora
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
