package com.janocaminho.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground service that prints a thermal receipt via Bluetooth.
 * Started by JncFirebaseMessagingService when a new online order arrives
 * and the app is in the background.
 */
public class PrintForegroundService extends Service {
    private static final String TAG = "JNC_PRINT_SVC";
    private static final int NOTIFICATION_ID = 2001;
    private static final String CHANNEL_ID = "jnc_auto_print";
    private static final String PREFS_NAME = "jnc_thermal_printer";
    private static final String KEY_ADDRESS = "printer_address";
    private static final String KEY_FEED_LINES = "printer_feed_lines";
    private static final int DEFAULT_FEED_LINES = 3;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String orderLabel = intent.getStringExtra("orderLabel");
        String notificationTitle = "Imprimindo " + (orderLabel != null ? orderLabel : "pedido...");

        startForeground(NOTIFICATION_ID, buildNotification(notificationTitle, "Conectando na impressora..."));

        new Thread(() -> {
            boolean success = false;
            String errorMsg = null;
            try {
                Bundle data = intent.getExtras();
                if (data == null) {
                    errorMsg = "No data in intent";
                    Log.e(TAG, errorMsg);
                    return;
                }

                String printerAddress = getPrinterAddress();
                if (printerAddress.isEmpty()) {
                    errorMsg = "Nenhuma impressora configurada";
                    Log.w(TAG, errorMsg);
                    return;
                }

                int feedLines = getFeedLines();
                int lineWidth = 32;

                Log.i(TAG, "Building receipt for " + orderLabel);
                String receiptText = BluetoothPrinterHelper.buildReceiptText(data, lineWidth);
                String qrData = data.getString("qrData", "");

                byte[] printBytes = BluetoothPrinterHelper.toPrinterBytes(receiptText, feedLines, qrData);
                Log.i(TAG, "Print bytes: " + printBytes.length + " to " + printerAddress);

                updateNotification("Imprimindo " + orderLabel, "Enviando para impressora...");

                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                success = BluetoothPrinterHelper.printViaBluetooth(adapter, printerAddress, printBytes);

            } catch (Exception e) {
                errorMsg = e.getMessage();
                Log.e(TAG, "Print failed", e);
            } finally {
                if (success) {
                    Log.i(TAG, "Print SUCCESS for " + orderLabel);
                    updateNotification("Pedido impresso! " + (orderLabel != null ? orderLabel : ""),
                        "Cupom impresso com sucesso.");
                } else {
                    String msg = errorMsg != null ? errorMsg : "Falha na conexão Bluetooth";
                    Log.w(TAG, "Print FAILED: " + msg);
                    updateNotification("Falha ao imprimir", msg);
                }
                // Stop service after a short delay so user can see the result notification
                try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
                stopSelf();
            }
        }, "JNC-PrintService-Worker").start();

        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private String getPrinterAddress() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String address = prefs.getString(KEY_ADDRESS, "");
        return address != null ? address.trim() : "";
    }

    private int getFeedLines() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int feedLines = prefs.getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES);
        return Math.max(1, Math.min(6, feedLines));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Impressão automática",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notificações de impressão automática de pedidos");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String title, String text) {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build();
    }

    private void updateNotification(String title, String text) {
        Notification notification = buildNotification(title, text);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }
    }
}
