import { Router, Request, Response, NextFunction } from 'express';
import { backendClient } from '../../lib/backend-client';
import { fromAxiosError } from '../../lib/errors';
import { authRequired, authOptional } from '../../middleware/auth.middleware';

async function forward(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const path = req.originalUrl.replace(/^\/(v1|api)/, '');
    try {
        let data: unknown;
        switch (req.method) {
            case 'GET': data = await backendClient.get(path, req.token); break;
            case 'POST': data = await backendClient.post(path, req.body, req.token); break;
            case 'PUT': data = await backendClient.put(path, req.body, req.token); break;
            case 'PATCH': data = await backendClient.patch(path, req.body, req.token); break;
            case 'DELETE': data = await backendClient.delete(path, req.token); break;
            default: res.status(405).json({ data: null, error: { code: 'METHOD_NOT_ALLOWED', message: `${req.method} not supported` } }); return;
        }
        res.status(req.method === 'POST' ? 201 : 200).json(data);
    } catch (err) {
        const e = fromAxiosError(err);
        res.status(e.statusCode).json({ data: null, error: { code: e.code, message: e.message } });
    }
}

export function createProxyRoutes(): Router {
    const r = Router();
    // Plans (public)
    r.get('/plans', forward);
    // Subscriptions
    r.post('/subscriptions', forward); r.get('/stores/:storeId/subscription', forward);
    r.post('/stores/:storeId/subscription/renew', authRequired, forward);
    r.post('/subscriptions/:id/renew', forward); r.patch('/subscriptions/:id/status', forward);
    // Payments / Webhooks
    r.post('/webhooks/payment-confirmed', forward); r.post('/webhooks/mercadopago', forward);
    r.get('/payment-accounts/mercadopago/callback', forward);
    r.get('/stores/:storeId/payments', authRequired, forward);
    r.get('/payments/:paymentId', forward); r.get('/payments/:paymentId/events', forward);
    r.post('/payments/:paymentId/renew', forward);
    // Maps (public)
    r.post('/maps/geocode', forward); r.post('/maps/route', forward);
    // Legal (public)
    r.get('/legal/terms', forward); r.get('/legal/lgpd', forward);
    // Public platform / discovery
    r.get('/public/platform/metrics', forward); r.get('/public/stores', forward);
    r.get('/public/stores/discovery', forward); r.get('/public/featured-products', forward);
    r.post('/public/stores/slug/:slug/track', forward);
    r.get('/public/stores/slug/:slug/products', forward);
    r.post('/public/stores/slug/:slug/postal/quote', forward);
    r.get('/public/stores/slug/:slug/categories', forward);
    r.get('/public/stores/slug/:slug/highlights', forward);
    r.get('/public/stores/slug/:slug/tables/status', forward);
    r.get('/public/condominiums', forward); r.post('/public/condominium-access-requests', forward);
    r.get('/public/condominiums/:slug', forward); r.get('/public/condominiums/:slug/stores', forward);
    r.get('/public/destinations', forward); r.post('/public/destination-partner-requests', forward);
    r.get('/public/destinations/:slug', forward);
    r.get('/public/destinations/:slug/hospitality', forward);
    r.get('/public/destinations/:slug/hospitality/:placeSlug', forward);
    r.post('/public/push/register', forward); r.post('/public/push/unregister', forward);
    // Address lookup (public)
    r.get('/addresses/lookup-zip-code/:cep', forward); r.get('/public/addresses/lookup-zip-code/:cep', forward);
    // Store slug aliases (public)
    r.get('/stores/slug/:slug', forward); r.get('/stores/slug/:slug/products', forward);
    r.get('/stores/slug/:slug/categories', forward); r.post('/stores/slug/:slug/postal/quote', forward);
    r.get('/chamanoespeto/:slug', forward); r.get('/janocaminho/:slug', forward);
    // Store admin
    r.put('/stores/:storeId', authRequired, forward); r.put('/stores/:storeId/status', authRequired, forward);
    r.get('/stores/:storeId/link-stats', authRequired, forward);
    r.get('/stores/:storeId/dashboard-analytics', authRequired, forward);
    r.get('/stores/:storeId/payment-accounts/mercadopago', authRequired, forward);
    r.post('/stores/:storeId/payment-accounts/mercadopago/connect', authRequired, forward);
    r.delete('/stores/:storeId/payment-accounts/mercadopago', authRequired, forward);
    r.get('/stores/:storeId/users', authRequired, forward); r.post('/stores/:storeId/users', authRequired, forward);
    r.patch('/stores/:storeId/users/:userId/password', authRequired, forward);
    r.delete('/stores/:storeId/users/:userId', authRequired, forward);
    r.post('/stores/:storeId/push/register', authRequired, forward);
    r.post('/stores/:storeId/push/unregister', authRequired, forward);
    // Orders (store-scoped)
    r.post('/stores/:storeId/orders', authOptional, forward);
    r.get('/stores/:storeId/orders', authRequired, forward);
    r.get('/stores/:storeId/orders/queue', authRequired, forward);
    r.get('/stores/:storeId/orders/:orderId/payment-audit', authRequired, forward);
    r.post('/stores/slug/:slug/orders', authOptional, forward);
    r.post('/stores/:storeId/orders/:orderId/refund', authRequired, forward);
    r.get('/stores/slug/:slug/orders', authRequired, forward);
    r.post('/stores/:storeId/orders/:orderId/refund-deny', authRequired, forward);
    r.get('/stores/slug/:slug/orders/queue', authRequired, forward);
    // Order status/items (not store-scoped)
    r.patch('/orders/:orderId/status', authRequired, forward);
    r.patch('/orders/:orderId/fulfillment-mode', authRequired, forward);
    r.patch('/orders/:orderId/postal', authRequired, forward);
    r.patch('/orders/:orderId', authRequired, forward);
    r.patch('/orders/:orderId/reopen', authRequired, forward);
    r.patch('/orders/:orderId/mark-as-printed', authRequired, forward);
    r.get('/orders/:orderId/public', forward);
    r.get('/v2/orders/:orderId/tracking', forward);
    // Products admin
    r.post('/stores/:storeId/products', authRequired, forward);
    r.get('/stores/:storeId/products', authRequired, forward);
    r.put('/stores/:storeId/products/:productId', authRequired, forward);
    r.delete('/stores/:storeId/products/:productId', authRequired, forward);
    r.get('/stores/:storeId/categories', authRequired, forward);
    r.patch('/stores/:storeId/categories/priority', authRequired, forward);
    r.get('/stores/:storeId/inventory', authRequired, forward);
    r.get('/stores/:storeId/inventory/alerts', authRequired, forward);
    r.get('/stores/:storeId/inventory/movements', authRequired, forward);
    r.patch('/stores/:storeId/products/:productId/stock', authRequired, forward);
    r.post('/stores/:storeId/postal/quote', authRequired, forward);
    // Order reviews
    r.get('/orders/:orderId/review', forward); r.post('/orders/:orderId/review', forward);
    r.get('/stores/:storeId/reviews', authRequired, forward);
    r.get('/stores/:storeId/reviews/summary', authRequired, forward);
    r.get('/stores/:storeId/reviews/tip-payouts', authRequired, forward);
    r.patch('/stores/:storeId/reviews/:reviewId/tip-payout', authRequired, forward);
    // Featured products (store)
    r.get('/stores/:storeId/featured-requests', authRequired, forward);
    r.get('/stores/:storeId/featured-pricing', authRequired, forward);
    r.post('/stores/:storeId/featured-requests', authRequired, forward);
    r.patch('/stores/:storeId/featured-requests/:requestId/cancel', authRequired, forward);
    r.patch('/stores/:storeId/featured-requests/:requestId/refresh-payment', authRequired, forward);
    r.get('/stores/:storeId/featured-requests/:requestId/payment-audit', authRequired, forward);
    // Condominium (store)
    r.get('/stores/:storeId/condominiums', authRequired, forward);
    r.post('/stores/:storeId/condominium-requests', authRequired, forward);
    r.delete('/stores/:storeId/condominiums/:condominiumId', authRequired, forward);
    r.get('/stores/:storeId/destinations', authRequired, forward);
    r.post('/stores/:storeId/destination-requests', authRequired, forward);
    r.delete('/stores/:storeId/destinations/:placeId', authRequired, forward);
    // Promo push (store)
    r.post('/stores/:storeId/promo-pushes', authRequired, forward);
    r.get('/stores/:storeId/promo-pushes', authRequired, forward);
    r.post('/stores/:storeId/promo-pushes/:pushId/refresh-payment', authRequired, forward);
    r.delete('/stores/:storeId/promo-pushes/:pushId', authRequired, forward);
    // Motoboy management (store)
    r.get('/stores/:storeId/motoboys', authRequired, forward);
    r.post('/stores/:storeId/motoboys', authRequired, forward);
    r.post('/stores/:storeId/motoboys/:motoboyId/link', authRequired, forward);
    r.post('/stores/:storeId/motoboys/:motoboyId/unlink', authRequired, forward);
    r.post('/stores/:storeId/motoboys/:motoboyId/approve', authRequired, forward);
    r.post('/stores/:storeId/motoboys/:motoboyId/suspend', authRequired, forward);
    r.get('/stores/:storeId/motoboy-requests', authRequired, forward);
    r.post('/stores/:storeId/motoboy-requests/:requestId/approve', authRequired, forward);
    r.post('/stores/:storeId/motoboy-requests/:requestId/reject', authRequired, forward);
    r.get('/stores/:storeId/motoboys/:motoboyId/documents', authRequired, forward);
    r.post('/stores/:storeId/motoboys/:motoboyId/documents/:documentId/reupload', authRequired, forward);
    // Delivery billing (store)
    r.get('/stores/:storeId/delivery-billing', authRequired, forward);
    r.post('/stores/:storeId/delivery-billing/pay', authRequired, forward);
    // Delivery operations
    r.post('/deliveries/:deliveryId/cancel', authRequired, forward);
    // Motoboy self-service
    r.get('/motoboy/orders/available', authRequired, forward);
    r.post('/motoboy/push/register', authRequired, forward);
    r.post('/motoboy/push/unregister', authRequired, forward);
    r.get('/motoboy/orders/current', authRequired, forward);
    r.get('/motoboy/orders/history', authRequired, forward);
    r.get('/motoboy/earnings/today', authRequired, forward);
    r.get('/motoboy/stats', authRequired, forward);
    r.get('/motoboy/reviews/tip-payouts', authRequired, forward);
    r.post('/motoboy/orders/:orderId/accept', authRequired, forward);
    r.post('/motoboy/orders/:orderId/pickup', authRequired, forward);
    r.post('/motoboy/orders/:orderId/start', authRequired, forward);
    r.post('/motoboy/orders/:orderId/confirm-payment', authRequired, forward);
    r.post('/motoboy/orders/:orderId/delivered', authRequired, forward);
    r.post('/motoboy/orders/:orderId/finish', authRequired, forward);
    r.post('/motoboy/documents', authRequired, forward);
    r.get('/motoboy/documents', authRequired, forward);
    r.get('/motoboy/profile', authRequired, forward);
    r.put('/motoboy/profile', authRequired, forward);
    r.get('/motoboy/store-requests', authRequired, forward);
    r.post('/motoboy/store-requests', authRequired, forward);
    r.post('/motoboy/stores/:storeId/leave', authRequired, forward);
    // Courier aliases
    r.get('/couriers/me/active-delivery', authRequired, forward);
    r.get('/couriers/me/stats', authRequired, forward);
    // Condominium organizer
    r.get('/condominium/manage', authRequired, forward);
    r.patch('/condominium/me', authRequired, forward);
    r.post('/condominium/events', authRequired, forward);
    r.patch('/condominium/events/:eventId', authRequired, forward);
    r.patch('/condominium/events/:eventId/deactivate', authRequired, forward);
    r.post('/condominium/events/:eventId/stores/invite', authRequired, forward);
    r.post('/condominium/events/:eventId/stores/confirm', authRequired, forward);
    r.patch('/condominium/stores/:storeId/settings', authRequired, forward);
    r.delete('/condominium/stores/:storeId', authRequired, forward);
    r.patch('/condominium/requests/:requestId/review', authRequired, forward);
    // Platform admin (SUPER_ADMIN)
    r.get('/admin/overview', authRequired, forward);
    r.get('/admin/stores', authRequired, forward);
    r.get('/admin/queue-health', authRequired, forward);
    r.get('/admin/payment-events', authRequired, forward);
    r.get('/admin/access-logs', authRequired, forward);
    r.get('/admin/customer-security/overview', authRequired, forward);
    r.patch('/admin/customer-security/blocks/:blockId/revoke', authRequired, forward);
    r.post('/admin/push/broadcast', authRequired, forward);
    r.patch('/admin/stores/:storeId/suspend', authRequired, forward);
    r.patch('/admin/stores/:storeId/reactivate', authRequired, forward);
    r.patch('/admin/stores/:storeId/plan-exempt', authRequired, forward);
    r.post('/admin/payments/:paymentId/reprocess', authRequired, forward);
    r.get('/admin/home-config', authRequired, forward);
    r.put('/admin/home-config', authRequired, forward);
    r.post('/admin/site-settings', authRequired, forward);
    r.get('/admin/featured-requests', authRequired, forward);
    r.patch('/admin/featured-requests/:requestId/review', authRequired, forward);
    r.get('/admin/promo-pushes/pending', authRequired, forward);
    r.get('/admin/promo-pushes/history', authRequired, forward);
    r.post('/admin/promo-pushes/:pushId/approve', authRequired, forward);
    r.post('/admin/promo-pushes/:pushId/reject', authRequired, forward);
    r.get('/admin/condominiums/manage', authRequired, forward);
    r.post('/admin/condominiums', authRequired, forward);
    r.patch('/admin/condominiums/:condominiumId', authRequired, forward);
    r.patch('/admin/condominiums/:condominiumId/deactivate', authRequired, forward);
    r.post('/admin/condominiums/:condominiumId/users', authRequired, forward);
    r.post('/admin/condominiums/:condominiumId/events', authRequired, forward);
    r.patch('/admin/condominium-events/:eventId', authRequired, forward);
    r.patch('/admin/condominium-events/:eventId/deactivate', authRequired, forward);
    r.post('/admin/condominiums/:condominiumId/stores', authRequired, forward);
    r.patch('/admin/condominiums/:condominiumId/stores/:storeId/settings', authRequired, forward);
    r.post('/admin/condominium-events/:eventId/stores', authRequired, forward);
    r.patch('/admin/condominium-requests/:requestId/review', authRequired, forward);
    r.patch('/admin/condominium-access-requests/:requestId/review', authRequired, forward);
    r.get('/admin/destinations/manage', authRequired, forward);
    r.get('/admin/destinations/manage/summary', authRequired, forward);
    r.get('/admin/destinations/:destinationId/places', authRequired, forward);
    r.get('/admin/destinations/:destinationId/listings', authRequired, forward);
    r.get('/admin/destinations/:destinationId/banners', authRequired, forward);
    r.post('/admin/destinations', authRequired, forward);
    r.patch('/admin/destinations/:destinationId', authRequired, forward);
    r.post('/admin/destination-banners', authRequired, forward);
    r.patch('/admin/destination-banners/:bannerId', authRequired, forward);
    r.post('/admin/hospitality-places', authRequired, forward);
    r.patch('/admin/hospitality-places/:placeId', authRequired, forward);
    r.post('/admin/destination-listings', authRequired, forward);
    r.patch('/admin/destination-listings/:listingId', authRequired, forward);
    r.post('/admin/hospitality-places/:placeId/stores', authRequired, forward);
    r.patch('/admin/destination-partner-requests/:requestId/review', authRequired, forward);
    r.patch('/admin/destination-store-requests/:requestId/review', authRequired, forward);
    r.get('/admin/motoboys/kyc/audit', authRequired, forward);
    r.get('/admin/motoboys/kyc/pending', authRequired, forward);
    r.get('/admin/motoboys/kyc/reviews', authRequired, forward);
    r.get('/admin/motoboys/:motoboyId/documents', authRequired, forward);
    r.post('/admin/motoboys/:motoboyId/documents/:documentId/approve', authRequired, forward);
    r.post('/admin/motoboys/:motoboyId/documents/:documentId/reject', authRequired, forward);

    // Customer notifications
    r.get('/public/home-config', forward);
    r.get('/customer/notifications', authRequired, forward);
    r.post('/customer/notifications', authRequired, forward);
    r.patch('/customer/notifications/:id/read', authRequired, forward);
    r.post('/customer/notifications/read-all', authRequired, forward);
    r.delete('/customer/notifications/:id', authRequired, forward);
    r.delete('/customer/notifications', authRequired, forward);

    return r;
}
