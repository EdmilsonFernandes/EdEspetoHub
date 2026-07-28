package com.janocaminho.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Notificacao "ongoing" (persistente) de acompanhamento de pedido, estilo iFood.
 *
 * O backend envia um push data-only (notificationType = "customer_order_update") a cada
 * mudanca de status do pedido do cliente. Como e data-only, o onMessageReceived dispara
 * mesmo em background/Doze (nao cai direto na bandeja do sistema). A cada push re-postamos
 * a MESMA notificacao (mesmo ID derivado do orderId), atualizando titulo, etapas, barra de
 * progresso e logo. No estado terminal (entregue/finalizado/cancelado) a notificacao vira
 * descartavel (setOngoing(false) + setAutoCancel(true)) — e o "morre quando entregue".
 *
 * Push-driven: sem Foreground Service de longa duracao. A barra avanca por etapa a cada
 * push (nao anima suavemente dentro de uma fase) — decisao de projeto (bateria + Doze).
 */
public final class OrderTrackingNotification {
    private static final String TAG = "JNC_ORDER_TRACK";

    public static final String CHANNEL_ID = "customer_order_tracking_v1";
    public static final String NOTIFICATION_TYPE = "customer_order_update";

    // Faixa de IDs separada do FCM (3000) e do print (2001) p/ evitar colisao.
    private static final int NOTIFICATION_ID_BASE = 5000;

    // Numero maximo de linhas de etapa no layout expandido (delivery tem 5).
    private static final int MAX_STEP_ROWS = 6;

    // Cache de bitmaps de logo p/ nao baixar a cada push do mesmo pedido.
    private static final android.util.LruCache<String, Bitmap> LOGO_CACHE =
        new android.util.LruCache<String, Bitmap>(8);

    // Tokens da marca (DESIGN_SYSTEM.md).
    private static final int COLOR_PROGRESS = 0xFF2F9DF7; // azul
    private static final int COLOR_DONE = 0xFF5FD35A;     // verde
    private static final int COLOR_CURRENT = 0xFF2F9DF7;  // azul
    private static final int COLOR_PENDING = 0xFF9AA5B1;  // cinza
    private static final int COLOR_TEXT_PRIMARY = 0xFF1E293B;
    private static final int COLOR_TEXT_SECONDARY = 0xFF64748B;

    private OrderTrackingNotification() {}

    /** Ponto de entrada chamado pelo JncFirebaseMessagingService. */
    public static void handle(@NonNull Context context, @NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        String orderId = trim(data.get("orderId"));
        String status = trim(data.get("status"));
        if (orderId.isEmpty()) return;

        String orderType = trim(data.get("orderType"));
        String storeName = trim(data.get("storeName"));
        String etaWindowMin = trim(data.get("etaWindowMin"));
        String etaWindowMax = trim(data.get("etaWindowMax"));
        String logoUrl = trim(data.get("imageUrl"));

        ensureChannel(context);

        if (isTerminal(status)) {
            showFinal(context, orderId, orderType, status, storeName, logoUrl);
            return;
        }
        showOngoing(context, orderId, status, orderType, storeName, etaWindowMin, etaWindowMax, logoUrl);
    }

    // ------------------------------------------------------------------ ongoing

    private static void showOngoing(Context context, String orderId, String status, String orderType,
                                    String storeName, String etaWindowMin, String etaWindowMax, String logoUrl) {
        StepModel steps = buildSteps(orderType, status);

        Bitmap logo = loadLogo(logoUrl);

        String title = storeName.isEmpty() ? "Acompanhando pedido" : storeName;
        String headline = safe(steps.labels, steps.currentIndex, "Pedido em andamento");
        String etaLabel = buildEtaLabel(etaWindowMin, etaWindowMax);

        int notifId = notificationIdFor(orderId);

        RemoteViews collapsed = buildCollapsed(context, title, headline, logo, steps);
        RemoteViews expanded = buildExpanded(context, title, headline, orderId, etaLabel, logo, steps);

        PendingIntent contentIntent = buildContentIntent(context, orderId, notifId);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(headline)
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)
            .setOngoing(true)          // persistente: nao desliza pra apagar
            .setOnlyAlertOnce(true)    // nao "bipa" a cada atualizacao de etapa
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();

        notify(context, notifId, notification);
    }

    // -------------------------------------------------------------------- final

    private static void showFinal(Context context, String orderId, String orderType, String status,
                                  String storeName, String logoUrl) {
        int notifId = notificationIdFor(orderId);
        String headline = finalHeadline(orderType, status);
        String title = storeName.isEmpty() ? headline : storeName;

        Bitmap logo = loadLogo(logoUrl);

        RemoteViews collapsed = buildFinalCollapsed(context, title, headline, logo);

        PendingIntent contentIntent = buildContentIntent(context, orderId, notifId);

        // Mesmo ID -> substitui a ongoing no mesmo slot (sem duplicar). Agora descartavel.
        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(headline)
            .setCustomContentView(collapsed)
            .setCustomBigContentView(collapsed)
            .setOngoing(false)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build();

        notify(context, notifId, notification);
    }

    // --------------------------------------------------------------- layouts

    private static RemoteViews buildCollapsed(Context context, String title, String headline,
                                              Bitmap logo, StepModel steps) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_order_tracking);
        applyLogo(views, logo);
        views.setTextViewText(R.id.notif_track_store, emptyFallback(title, "Já no Caminho"));
        views.setTextViewText(R.id.notif_track_status, headline);
        int pct = steps.percent();
        views.setProgressBar(R.id.notif_track_progress, pct, 100, false);
        return views;
    }

    private static RemoteViews buildExpanded(Context context, String title, String headline, String orderId,
                                             String etaLabel, Bitmap logo, StepModel steps) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_order_tracking_expanded);
        applyLogo(views, logo);
        views.setTextViewText(R.id.notif_track_store, emptyFallback(title, "Já no Caminho"));
        views.setTextViewText(R.id.notif_track_status, headline);
        views.setTextViewText(R.id.notif_track_order, "Pedido #" + shortId(orderId));

        int etaVisibility = etaLabel.isEmpty() ? View.GONE : View.VISIBLE;
        views.setViewVisibility(R.id.notif_track_eta, etaVisibility);
        if (!etaLabel.isEmpty()) views.setTextViewText(R.id.notif_track_eta, etaLabel);

        views.setProgressBar(R.id.notif_track_progress, 100, steps.percent(), false);
        renderStepRows(views, steps);
        return views;
    }

    private static RemoteViews buildFinalCollapsed(Context context, String title, String headline, Bitmap logo) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_order_tracking);
        applyLogo(views, logo);
        views.setTextViewText(R.id.notif_track_store, emptyFallback(title, "Já no Caminho"));
        views.setTextViewText(R.id.notif_track_status, headline);
        views.setViewVisibility(R.id.notif_track_progress, View.GONE);
        return views;
    }

    private static void renderStepRows(RemoteViews views, StepModel steps) {
        int total = steps.labels.length;
        for (int i = 0; i < MAX_STEP_ROWS; i++) {
            int rowId = rowId(i);
            int dotId = dotId(i);
            int labelId = labelId(i);
            if (rowId == 0 || dotId == 0 || labelId == 0) continue;

            if (i >= total) {
                views.setViewVisibility(rowId, View.GONE);
                continue;
            }
            views.setViewVisibility(rowId, View.VISIBLE);
            views.setTextViewText(labelId, steps.labels[i]);
            if (i < steps.currentIndex) {
                views.setImageViewResource(dotId, R.drawable.notif_step_done);
                views.setTextColor(labelId, COLOR_TEXT_SECONDARY);
            } else if (i == steps.currentIndex) {
                views.setImageViewResource(dotId, R.drawable.notif_step_current);
                views.setTextColor(labelId, COLOR_TEXT_PRIMARY);
            } else {
                views.setImageViewResource(dotId, R.drawable.notif_step_pending);
                views.setTextColor(labelId, COLOR_TEXT_SECONDARY);
            }
        }
    }

    // Os IDs das linhas de etapa seguem o sufixo _1.._6 definidos no layout expandido.
    private static int rowId(int index) {
        switch (index) {
            case 0: return R.id.notif_step_row_1;
            case 1: return R.id.notif_step_row_2;
            case 2: return R.id.notif_step_row_3;
            case 3: return R.id.notif_step_row_4;
            case 4: return R.id.notif_step_row_5;
            case 5: return R.id.notif_step_row_6;
            default: return 0;
        }
    }

    private static int dotId(int index) {
        switch (index) {
            case 0: return R.id.notif_step_dot_1;
            case 1: return R.id.notif_step_dot_2;
            case 2: return R.id.notif_step_dot_3;
            case 3: return R.id.notif_step_dot_4;
            case 4: return R.id.notif_step_dot_5;
            case 5: return R.id.notif_step_dot_6;
            default: return 0;
        }
    }

    private static int labelId(int index) {
        switch (index) {
            case 0: return R.id.notif_step_label_1;
            case 1: return R.id.notif_step_label_2;
            case 2: return R.id.notif_step_label_3;
            case 3: return R.id.notif_step_label_4;
            case 4: return R.id.notif_step_label_5;
            case 5: return R.id.notif_step_label_6;
            default: return 0;
        }
    }

    private static void applyLogo(RemoteViews views, Bitmap logo) {
        if (logo != null) {
            views.setImageViewBitmap(R.id.notif_track_logo, logo);
        } else {
            views.setImageViewResource(R.id.notif_track_logo, R.mipmap.ic_launcher);
        }
    }

    // -------------------------------------------------------------- step model

    private static final class StepModel {
        final String[] labels;
        final int currentIndex;
        StepModel(String[] labels, int currentIndex) {
            this.labels = labels;
            this.currentIndex = Math.max(0, Math.min(currentIndex, labels.length - 1));
        }
        int percent() {
            if (labels.length <= 1) return 100;
            return Math.round(((float) currentIndex / (labels.length - 1)) * 100f);
        }
    }

    /**
     * Mapeia orderType + status -> conjunto de etapas + indice atual.
     * Espelha a logica do frontend (OrderTracking.tsx), simplificada (sem etapa de pagamento,
     * que e resolvida antes do primeiro push, e sem "recebido pelo cliente" pos-entrega).
     */
    private static StepModel buildSteps(String orderType, String status) {
        String s = normalize(status);
        String type = normalize(orderType);

        if ("pickup".equals(type)) {
            String[] labels = { "Pedido recebido", "Em preparação", "Pronto para retirada", "Retirada concluída" };
            return new StepModel(labels, pickupIndex(s));
        }
        if ("table".equals(type)) {
            String[] labels = { "Pedido recebido", "Em preparação", "Pedido pronto" };
            return new StepModel(labels, tableIndex(s));
        }
        if ("reservation".equals(type)) {
            String[] labels = { "Reserva recebida", "Sendo preparada", "Reserva pronta" };
            return new StepModel(labels, reservationIndex(s));
        }
        // default: delivery
        String[] labels = { "Pedido recebido", "Em preparação", "Aguardando entregador", "Saiu para entrega", "Entregue" };
        return new StepModel(labels, deliveryIndex(s));
    }

    private static int deliveryIndex(String s) {
        if (s.startsWith("prepar")) return 1;
        if (s.equals("ready") || s.startsWith("ready_for") || s.equals("waiting_for_motoboy")) return 2;
        if (s.equals("in_delivery") || s.equals("dispatched")) return 3;
        if (s.equals("delivered") || s.equals("done")) return 4;
        return 0; // pending e qualquer outro
    }

    private static int pickupIndex(String s) {
        if (s.startsWith("prepar")) return 1;
        if (s.equals("ready") || s.startsWith("ready_for")) return 2;
        if (s.equals("done") || s.equals("finished") || s.equals("delivered")) return 3;
        return 0;
    }

    private static int tableIndex(String s) {
        if (s.startsWith("prepar")) return 1;
        if (s.equals("ready") || s.equals("done")) return 2;
        return 0;
    }

    private static int reservationIndex(String s) {
        if (s.startsWith("prepar")) return 1;
        if (s.equals("ready") || s.equals("done")) return 2;
        return 0;
    }

    private static boolean isTerminal(String status) {
        String s = normalize(status);
        return s.equals("delivered")
            || s.equals("finished")
            || s.equals("done")
            || s.equals("cancelled")
            || s.equals("canceled");
    }

    private static String finalHeadline(String orderType, String status) {
        String s = normalize(status);
        if (s.equals("cancelled") || s.equals("canceled")) return "Pedido cancelado";
        String type = normalize(orderType);
        if ("pickup".equals(type)) return "Retirada concluída";
        if ("table".equals(type)) return "Pedido pronto";
        if ("reservation".equals(type)) return "Reserva concluída";
        if ("delivery".equals(type)) return "Pedido entregue";
        return "Pedido concluído";
    }

    // --------------------------------------------------------------- infra

    private static String buildEtaLabel(String etaWindowMin, String etaWindowMax) {
        boolean hasMin = !etaWindowMin.isEmpty();
        boolean hasMax = !etaWindowMax.isEmpty();
        if (hasMin && hasMax) return "Previsão: " + etaWindowMin + "–" + etaWindowMax + " min";
        if (hasMin) return "Previsão: ~" + etaWindowMin + " min";
        if (hasMax) return "Previsão: ~" + etaWindowMax + " min";
        return "";
    }

    private static PendingIntent buildContentIntent(Context context, String orderId, int notifId) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) return null;
        // MainActivity.resolvePushTargetFromIntentExtras le o extra "url" e abre o pedido.
        launchIntent.putExtra("url", "https://janocaminho.com.br/pedido/" + orderId);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            notifId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static int notificationIdFor(String orderId) {
        return NOTIFICATION_ID_BASE + Math.abs(orderId.hashCode());
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(context);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        // IMPORTANCE_LOW: a barra atualiza em silencio a cada etapa. O alerta sonoro fica no
        // canal de "novos pedidos" (loja). Assim o cliente nao e incomodado a cada mudanca.
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Acompanhamento do pedido",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Acompanhe o andamento do seu pedido em tempo real");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private static void notify(Context context, int id, Notification notification) {
        NotificationManager manager = getSystemService(context);
        if (manager == null) return;
        try {
            manager.notify(id, notification);
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS negado (Android 13+): ignora silenciosamente.
            Log.w(TAG, "notify negado (permissao?): " + e.getMessage());
        }
    }

    private static NotificationManager getSystemService(Context context) {
        return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    // ----------------------------------------------------------------- logo

    private static Bitmap loadLogo(String rawUrl) {
        String url = resolveLogoUrl(rawUrl);
        if (url.isEmpty()) return null;
        Bitmap cached = LOGO_CACHE.get(url);
        if (cached != null) return cached;
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setInstanceFollowRedirects(true);
            try (InputStream in = conn.getInputStream()) {
                Bitmap bmp = BitmapFactory.decodeStream(in);
                if (bmp == null) return null;
                Bitmap scaled = scaleForNotification(bmp);
                LOGO_CACHE.put(url, scaled);
                return scaled;
            }
        } catch (Exception e) {
            Log.w(TAG, "logo download falhou: " + url + " — " + e.getMessage());
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static Bitmap scaleForNotification(Bitmap bmp) {
        int maxDim = 144; // px — suficiente p/ a area do logo na notificacao
        float scale = Math.min(1f, (float) maxDim / Math.max(bmp.getWidth(), bmp.getHeight()));
        if (scale >= 1f) return bmp;
        Bitmap scaled = Bitmap.createScaledBitmap(
            bmp,
            Math.max(1, Math.round(bmp.getWidth() * scale)),
            Math.max(1, Math.round(bmp.getHeight() * scale)),
            true
        );
        if (scaled != bmp) bmp.recycle();
        return scaled;
    }

    /** logoUrl pode vir como caminho relativo (/uploads/...) — prependa a base confiavel. */
    private static String resolveLogoUrl(String rawUrl) {
        String value = trim(rawUrl);
        if (value.isEmpty()) return "";
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        if (value.startsWith("//")) return "https:" + value;
        if (value.startsWith("/")) return "https://janocaminho.com.br" + value;
        return "https://janocaminho.com.br/" + value;
    }

    // --------------------------------------------------------------- utils

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalize(String value) {
        return trim(value).toLowerCase();
    }

    private static String safe(String[] labels, int index, String fallback) {
        if (labels == null || index < 0 || index >= labels.length) return fallback;
        return labels[index];
    }

    private static String emptyFallback(String value, String fallback) {
        return (value == null || value.isEmpty()) ? fallback : value;
    }

    private static String shortId(String orderId) {
        if (orderId == null) return "";
        return orderId.length() > 8 ? orderId.substring(0, 8) : orderId;
    }

    /** Permite cancelar a notificacao ongoing de fora (ex.: ao abrir a tela do pedido). */
    public static void cancel(@NonNull Context context, @NonNull String orderId) {
        NotificationManager manager = getSystemService(context);
        if (manager != null) manager.cancel(notificationIdFor(orderId));
    }
}
