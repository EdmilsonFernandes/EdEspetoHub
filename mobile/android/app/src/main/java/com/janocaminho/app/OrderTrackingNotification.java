package com.janocaminho.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Notificacao "ongoing" (persistente) de acompanhamento de pedido, estilo iFood.
 *
 * O backend envia um push data-only (notificationType = "customer_order_update") a cada
 * mudanca de status do pedido do cliente. Como e data-only, o onMessageReceived dispara
 * mesmo em background/Doze. A cada push re-postamos a MESMA notificacao (mesmo ID derivado
 * do orderId), atualizando o texto de status e a barra de progresso. No estado terminal
 * (entregue/finalizado/cancelado) vira descartavel (setOngoing(false) + setAutoCancel) — e o
 * "morre quando entregue".
 *
 * Layout minimalista: UMA linha de status (que so troca o texto) + barra de progresso.
 * Sem nome de loja, sem logo, sem lista de etapas. O cabecalho (icone do app + nome) e
 * adicionado pelo sistema. Push-driven: sem Foreground Service de longa duracao.
 */
public final class OrderTrackingNotification {
    private static final String TAG = "JNC_ORDER_TRACK";

    // v2 (18/08): IMPORTANCE_HIGH — o v1 era LOW e o cliente via a tela apagada,
    // sem LED/vibração/heads-up (nada acordava). Importância de canal é imutável
    // após a criação, então migração = novo id + delete do antigo.
    public static final String CHANNEL_ID = "customer_order_tracking_v2";
    private static final String LEGACY_CHANNEL_ID = "customer_order_tracking_v1";
    public static final String NOTIFICATION_TYPE = "customer_order_update";

    // Faixa de IDs separada do FCM (3000) e do print (2001) p/ evitar colisao.
    private static final int NOTIFICATION_ID_BASE = 5000;
    // Offset do alerta heads-up de transição-chave (mesmo pedido, notificações distintas).
    private static final int ALERT_ID_OFFSET = 100_000;

    private OrderTrackingNotification() {}

    /** Ponto de entrada chamado pelo JncFirebaseMessagingService. */
    public static void handle(@NonNull Context context, @NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        String orderId = trim(data.get("orderId"));
        String status = trim(data.get("status"));
        if (orderId.isEmpty()) return;

        String orderType = trim(data.get("orderType"));

        ensureChannel(context);

        if (isTerminal(status)) {
            showFinal(context, orderId, orderType, status);
            return;
        }
        showOngoing(context, orderId, status, orderType);
        // iFood-like: as transições que o cliente REALMENTE precisa saber na hora
        // ganham um heads-up curto além da barra silenciosa contínua.
        if (isKeyTransition(status)) {
            showAlert(context, orderId, orderType, status);
        }
    }

    // ------------------------------------------------------------------ ongoing

    private static void showOngoing(Context context, String orderId, String status, String orderType) {
        StepModel steps = buildSteps(orderType, status);
        String headline = safe(steps.labels, steps.currentIndex, "Pedido em andamento");

        int notifId = notificationIdFor(orderId);

        RemoteViews collapsed = buildCollapsed(context, headline, steps);
        RemoteViews expanded = buildExpanded(context, headline, orderId, steps);

        PendingIntent contentIntent = buildContentIntent(context, orderId, notifId);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(headline)
            .setContentText(headline)
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)
            .setOngoing(true)          // persistente: nao desliza pra apagar
            .setOnlyAlertOnce(true)    // nao "bipa" a cada atualizacao de etapa
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Pre-O: sem canal, prioridade/vibração/LED vem do builder.
            builder.setVibrate(new long[]{0, 120});
            builder.setLights(0xFF2F9DF7, 1000, 1000);
        }

        notify(context, notifId, builder.build());
    }

    // -------------------------------------------------------------------- final

    /** Heads-up curto para transições-chave (pronto / saiu para entrega). */
    private static void showAlert(Context context, String orderId, String orderType, String status) {
        int notifId = notificationIdFor(orderId) + ALERT_ID_OFFSET;
        String headline = keyTransitionHeadline(orderType, status);
        PendingIntent contentIntent = buildContentIntent(context, orderId, notifId);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(headline)
            .setContentText("Toque para acompanhar seu pedido")
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setVibrate(new long[]{0, 180, 90, 180});
            builder.setLights(0xFF2F9DF7, 1000, 1000);
        }

        notify(context, notifId, builder.build());
    }

    private static void showFinal(Context context, String orderId, String orderType, String status) {
        int notifId = notificationIdFor(orderId);
        String headline = finalHeadline(orderType, status);

        RemoteViews collapsed = buildCollapsed(context, headline, null);
        PendingIntent contentIntent = buildContentIntent(context, orderId, notifId);

        // Mesmo ID -> substitui a ongoing no mesmo slot (sem duplicar). Agora descartavel.
        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(headline)
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

    private static RemoteViews buildCollapsed(Context context, String headline, StepModel steps) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_order_tracking);
        views.setTextViewText(R.id.notif_track_status, headline);
        int visibility = steps != null ? android.view.View.VISIBLE : android.view.View.GONE;
        views.setViewVisibility(R.id.notif_track_progress, visibility);
        if (steps != null) {
            views.setProgressBar(R.id.notif_track_progress, steps.percent(), 100, false);
        }
        return views;
    }

    private static RemoteViews buildExpanded(Context context, String headline, String orderId, StepModel steps) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_order_tracking_expanded);
        views.setTextViewText(R.id.notif_track_status, headline);
        views.setTextViewText(R.id.notif_track_order, "Pedido #" + shortId(orderId));
        views.setProgressBar(R.id.notif_track_progress, steps.percent(), 100, false);
        return views;
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
     * Mapeia orderType + status -> conjunto de etapas + indice atual (so pra calcular o % da
     * barra). Espelha o frontend (OrderTracking.tsx), simplificado.
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

    /** Transições que merecem heads-up além da barra contínua silenciosa. */
    private static boolean isKeyTransition(String status) {
        String s = normalize(status);
        return s.equals("ready")
            || s.startsWith("ready_for")
            || s.equals("in_delivery")
            || s.equals("dispatched");
    }

    private static String keyTransitionHeadline(String orderType, String status) {
        String s = normalize(status);
        String type = normalize(orderType);
        if (s.equals("in_delivery") || s.equals("dispatched")) return "Pedido saiu para entrega 🛵";
        if (s.equals("ready") || s.startsWith("ready_for")) {
            if ("pickup".equals(type)) return "Pedido pronto para retirada 🔔";
            if ("table".equals(type)) return "Pedido pronto na mesa 🔔";
            return "Pedido pronto 🔔";
        }
        return "Atualização do seu pedido";
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
        // Migração: v1 era IMPORTANCE_LOW (imutável) — remover p/ o app-settings
        // não listar canal morto.
        if (manager.getNotificationChannel(LEGACY_CHANNEL_ID) != null) {
            manager.deleteNotificationChannel(LEGACY_CHANNEL_ID);
        }
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        // IMPORTANCE_HIGH (18/08): com tela apagada o cliente via NADA — sem LED,
        // sem vibração, sem heads-up. HIGH acorda com LED + vibração + som e dá
        // heads-up na primeira postagem; as reposições ficam silenciosas
        // (setOnlyAlertOnce) e transições-chave ganham alerta próprio.
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Acompanhamento do pedido",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Acompanhe o andamento do seu pedido em tempo real");
        channel.setShowBadge(true);
        channel.enableLights(true);
        channel.setLightColor(0xFF2F9DF7);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 180, 90, 180});
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
