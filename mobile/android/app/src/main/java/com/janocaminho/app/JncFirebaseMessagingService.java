package com.janocaminho.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom FCM service that intercepts push notifications.
 *
 * For store_new_online_order messages when auto-print is enabled:
 * - If app is in BACKGROUND: starts PrintForegroundService to auto-print
 * - If app is in FOREGROUND: shows notification only (polling handles the print)
 *
 * For all other messages: shows a system notification (same as Capacitor would).
 */
public class JncFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "JNC_FCM";
    private static final String PREFS_NAME = "jnc_thermal_printer";
    private static final String KEY_AUTO_PRINT = "auto_print_online_orders";
    private static final String KEY_ADDRESS = "printer_address";
    private static final String STORE_ORDERS_CHANNEL_ID = "store_new_orders_v1";
    private static final String GENERAL_CHANNEL_ID = "jnc_general_push";
    private static final int NOTIFICATION_ID_BASE = 3000;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        String notificationType = data.get("notificationType");

        Log.d(TAG, "onMessageReceived: type=" + notificationType + " from=" + message.getFrom());

        if ("store_new_online_order".equals(notificationType)) {
            handleStoreNewOnlineOrder(message);
            return;
        }

        // All other messages: show a standard notification
        showDefaultNotification(message);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        Log.i(TAG, "onNewToken: " + token.substring(0, Math.min(8, token.length())) + "...");
        // Store token so the JS side can pick it up on next launch
        SharedPreferences prefs = getSharedPreferences("jnc_fcm", Context.MODE_PRIVATE);
        prefs.edit().putString("fcm_token", token).apply();
    }

    private void handleStoreNewOnlineOrder(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String orderId = data.get("orderId");
        String storeName = data.get("storeName");

        boolean isForeground = isAppInForeground();
        boolean autoPrintEnabled = isAutoPrintEnabled();

        Log.i(TAG, "store_new_online_order: orderId=" + orderId
            + " foreground=" + isForeground
            + " autoPrint=" + autoPrintEnabled);

        // Sempre que o auto-print esta ligado, imprime pelo servico — funciona em qualquer
        // tela (foreground), com app minimizado (background) e com a tela bloqueada. O
        // polling da fila nao imprime mais (evitaria impressao dupla quando a fila esta aberta).
        if (autoPrintEnabled) {
            Intent printIntent = new Intent(this, PrintForegroundService.class);
            for (Map.Entry<String, String> entry : data.entrySet()) {
                printIntent.putExtra(entry.getKey(), entry.getValue());
            }
            try {
                ContextCompat.startForegroundService(this, printIntent);
                Log.i(TAG, "PrintForegroundService started for " + orderId);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start PrintForegroundService", e);
            }
        }

        // Always show a notification so the user knows about the new order
        String title = "Novo pedido online";
        String body = data.get("body");
        if (body == null || body.isEmpty()) {
            body = storeName != null ? storeName : "Pedido recebido";
        }
        if (autoPrintEnabled) {
            title = "Pedido impresso!";
            body = (orderId != null ? "#" + orderId.substring(0, Math.min(8, orderId.length())) : "Pedido") + " impresso automaticamente.";
        }

        showNotification(title, body, data, STORE_ORDERS_CHANNEL_ID, NotificationCompat.PRIORITY_HIGH);
    }

    private void showDefaultNotification(RemoteMessage message) {
        String title = "Ja no Caminho";
        String body = "Voce tem uma nova notificacao.";

        RemoteMessage.Notification notification = message.getNotification();
        if (notification != null) {
            if (notification.getTitle() != null) title = notification.getTitle();
            if (notification.getBody() != null) body = notification.getBody();
        }

        showNotification(title, body, message.getData(), GENERAL_CHANNEL_ID, NotificationCompat.PRIORITY_DEFAULT);
    }

    private boolean isAutoPrintEnabled() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_AUTO_PRINT, false);
        String address = prefs.getString(KEY_ADDRESS, "");
        return enabled && address != null && !address.trim().isEmpty();
    }

    private boolean isAppInForeground() {
        // Estado real de primeiro plano, rastreado pelo ciclo de vida da MainActivity
        // (sWebViewInForeground, setado em onResume/onPause). Antes este metodo retornava
        // `true` no Android 10+ (SDK >= Q), o que tornava `!isForeground` sempre falso e
        // a impressao em background (tela bloqueada / app minimizado) nunca disparava.
        // Default false = trata como background quando o processo e (re)iniciado pelo FCM.
        return MainActivity.sWebViewInForeground;
    }

    private void showNotification(String title, String body, Map<String, String> data, String channelId, int priority) {
        ensureChannel(channelId);

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            // Add data to intent for deep linking
            if (data.containsKey("url")) {
                launchIntent.putExtra("url", data.get("url"));
            }
            if (data.containsKey("screen")) {
                launchIntent.putExtra("screen", data.get("screen"));
            }
            pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        Notification notification = new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(priority)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build();

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            // Use hashCode of orderId as notification ID to avoid duplicates
            int id = NOTIFICATION_ID_BASE + (data.containsKey("orderId") ? data.get("orderId").hashCode() % 1000 : 0);
            manager.notify(id, notification);
        }
    }

    private void ensureChannel(String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            NotificationChannel existing = manager.getNotificationChannel(channelId);
            if (existing != null) return;

            NotificationChannel channel;
            if (STORE_ORDERS_CHANNEL_ID.equals(channelId)) {
                channel = new NotificationChannel(channelId, "Novos pedidos", NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Notificações de novos pedidos online");
                channel.enableVibration(true);
            } else {
                channel = new NotificationChannel(channelId, "Notificações", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Notificações gerais do app");
            }
            manager.createNotificationChannel(channel);
        }
    }
}
