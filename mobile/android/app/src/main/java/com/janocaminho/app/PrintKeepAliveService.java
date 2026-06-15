package com.janocaminho.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Foreground service KEEP-ALIVE: mantem o processo do app vivo atraves do Doze enquanto o
 * auto-print esta ligado.
 *
 * Sem ele, o Android (especialmente Samsung) congela/mata o processo em idle (~4min de tela
 * apagada) e o onMessageReceived do FCM nao dispara -> nao imprime com tela apagada, so quando
 * o lojista liga a tela de novo. Com o processo vivo (este servico) + isencao de otimizacao de
 * bateria, o FCM entrega a push e o JncFirebaseMessagingService.printOrderInline imprime
 * normalmente, mesmo depois de horas idle.
 *
 * Este servico NAO imprime nada — so segura o processo + um wake-lock parcial + uma notificacao
 * persistente. A impressao em si continua no callback do FCM (printOrderInline).
 *
 * Iniciado do FOREGROUND (pelo JS, quando o lojista liga o auto-print) — nao do callback do FCM.
 * O FGS antigo (PrintForegroundService) foi removido porque tentava iniciar do background, o que
 * o Android 12+ bloqueia. Iniciar do foreground e permitido e o servico persiste em background.
 */
public class PrintKeepAliveService extends Service {
    private static final String TAG = "JNC_KEEPALIVE";
    private static final int NOTIFICATION_ID = 2002;
    private static final String CHANNEL_ID = "jnc_auto_print_keepalive";
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        Log.i(TAG, "Keep-alive iniciado — processo fica vivo atraves do Doze");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification();
        // Android 14+ exige o tipo no startForeground. connectedDevice: o app mantem conexao
        // com a impressora Bluetooth para impressao automatica de pedidos.
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            : 0;
        try {
            if (type != 0) {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "startForeground falhou", e);
        }
        // START_STICKY: se o Android matar (memoria), reinicia o servico pra manter o processo vivo.
        return START_STICKY;
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JNC:PrintKeepAlive");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        } catch (Exception e) {
            Log.e(TAG, "wakeLock acquire falhou", e);
        }
    }

    @Override
    public void onDestroy() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) {
        }
        Log.i(TAG, "Keep-alive finalizado");
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Impressão automática (ativo)",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantém o app pronto para imprimir pedidos automaticamente, mesmo com a tela apagada.");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Impressão automática ativa")
            .setContentText("Pronto para imprimir pedidos com a tela apagada.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build();
    }
}
