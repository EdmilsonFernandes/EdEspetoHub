import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Defense-in-depth: if an authenticated admin/operator/lojista or motoboy
 * lands on a client-facing page (LandingPage, MarketplacePage), bounce them
 * to their operational dashboard instead of letting them browse as a client.
 *
 * This complements the post-login redirect in AdminLogin — even if they
 * manually type `/` or `/hub`, they get redirected to their real home.
 */
export function useRoleRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Admin / operator / lojista session
    try {
      const raw = localStorage.getItem('adminSession');
      const parsed = raw ? JSON.parse(raw) : null;
      const role = String(parsed?.user?.role || '').toUpperCase();
      const isOperationalRole = role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA';
      if (parsed?.token && parsed?.user && isOperationalRole && (parsed?.store?.id || parsed?.store?.slug)) {
        navigate(role === 'ADMIN' ? '/admin/dashboard' : '/admin/queue', { replace: true });
        return;
      }
    } catch {
      // ignore malformed admin session
    }

    // Motoboy session
    try {
      const raw = localStorage.getItem('motoboySession');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.token && parsed?.user && String(parsed?.user?.role || '').toUpperCase() === 'MOTOBOY') {
        navigate('/motoboy/home', { replace: true });
      }
    } catch {
      // ignore malformed motoboy session
    }
  }, [navigate]);
}
