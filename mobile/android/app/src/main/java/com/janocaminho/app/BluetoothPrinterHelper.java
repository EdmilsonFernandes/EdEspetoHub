package com.janocaminho.app;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.text.Normalizer;
import java.util.UUID;

/**
 * Shared Bluetooth thermal printer utilities used by both the Capacitor plugin
 * and the native PrintForegroundService for background auto-printing.
 */
public final class BluetoothPrinterHelper {
    private static final String TAG = "JNC_THERMAL";
    // Tamanho grande proposital: o cupom inteiro (~1-2KB) deve ir em UM unico write para
    // o comando de QR Code nao ser partido no meio (o que causava intermittencia do QR na
    // KA-1445 — "so um gerou"). Printers 58mm tem buffer >= 4KB, entao um write de ~1-2KB
    // e seguro. O delay entre chunks so aplica se o cupom passar de 4096 bytes (raro).
    private static final int WRITE_CHUNK_SIZE = 4096;
    private static final long WRITE_CHUNK_DELAY_MS = 18L;
    private static final int MAX_RETRIES = 3;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothPrinterHelper() {} // Prevent instantiation

    /**
     * Connects to the Bluetooth printer and sends the given raw bytes.
     * Retries up to 3 times with increasing delays.
     *
     * @return true if printing succeeded, false otherwise
     */
    public static boolean printViaBluetooth(BluetoothAdapter adapter, String printerAddress, byte[] printBytes) {
        if (adapter == null || !adapter.isEnabled() || printerAddress == null || printerAddress.isEmpty()) {
            Log.w(TAG, "Helper: BT not ready or no address");
            return false;
        }

        Exception lastError = null;
        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                long delayMs = 300L * attempt;
                Log.d(TAG, "Helper: retry " + (attempt + 1) + " waiting " + delayMs + "ms");
                try { Thread.sleep(delayMs); } catch (InterruptedException ignored) {}
            }

            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(printerAddress);
                try {
                    adapter.cancelDiscovery();
                } catch (SecurityException ignored) {
                    Log.d(TAG, "Helper: cancelDiscovery failed, continuing");
                }

                Log.d(TAG, "Helper: attempt " + (attempt + 1) + " connecting to " + printerAddress);
                try {
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                    Log.d(TAG, "Helper: secure socket connected");
                } catch (Exception firstError) {
                    Log.w(TAG, "Helper: secure failed (" + firstError.getMessage() + "), trying insecure");
                    closeSocketQuietly(socket);
                    socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                    Log.d(TAG, "Helper: insecure socket connected");
                }

                Thread.sleep(150L);

                OutputStream output = socket.getOutputStream();
                writeInChunks(output, printBytes);
                output.flush();
                closeSocketQuietly(socket);

                Log.i(TAG, "Helper: SUCCESS bytes=" + printBytes.length + " attempts=" + (attempt + 1));
                return true;
            } catch (Exception error) {
                closeSocketQuietly(socket);
                lastError = error;
                Log.w(TAG, "Helper: attempt " + (attempt + 1) + " FAILED: " + error.getMessage());
            }
        }

        Log.e(TAG, "Helper: ALL RETRIES FAILED: " + (lastError != null ? lastError.getMessage() : "unknown"));
        return false;
    }

    /**
     * Builds the full ESC/POS byte array: init + text + feed + QR code (optional) + cut.
     */
    public static byte[] toPrinterBytes(String text, int feedLines, String qrData) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(new byte[] { 0x1B, 0x40 }); // ESC @ = Initialize printer
        String normalized = normalizePrinterText(text);
        output.write(normalized.getBytes(Charset.forName("ISO-8859-1")));
        for (int i = 0; i < feedLines; i++) {
            output.write(0x0A); // LF
        }
        // QR Code (if qrData provided)
        if (qrData != null && !qrData.trim().isEmpty()) {
            output.write(new byte[] { 0x1B, 0x61, 0x01 }); // ESC a 1 = Center align
            output.write(generateQrCodeBytes(qrData));
            output.write(new byte[] { 0x1B, 0x61, 0x00 }); // ESC a 0 = Left align
            output.write(0x0A);
        }
        output.write(new byte[] { 0x1D, 0x56, 0x42, 0x00 }); // GS V B 0 = Full cut
        return output.toByteArray();
    }

    /**
     * Generates ESC/POS QR Code bytes for the given data string.
     * Uses Model 2, module size 6, error correction level M.
     */
    public static byte[] generateQrCodeBytes(String data) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] dataBytes = data.getBytes(Charset.forName("ISO-8859-1"));

        // NAO enviamos o comando de "modelo do QR" (GS ( k 04 00 31 41 ...): varias
        // impressoras 58mm (incl. KA-1445) rejeitam/abortam o cupom INTEIRO ao recebe-lo,
        // o que fazia o pedido "nao imprimir" e o QR sair com erro. O model 2 e o default
        // e funciona sem esse comando. (Mesma abordagem da lib DantSu ESCPOS-ThermalPrinter.)
        // Set module size (6)
        output.write(new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06 });
        // Set error correction level (M)
        output.write(new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31 });
        // Store data
        int len = dataBytes.length + 3;
        output.write(new byte[] {
            0x1D, 0x28, 0x6B,
            (byte)(len & 0xFF), (byte)((len >> 8) & 0xFF),
            0x31, 0x50, 0x30
        });
        output.write(dataBytes);
        // Print QR code
        output.write(new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30 });

        Log.d(TAG, "generateQrCodeBytes: data length=" + dataBytes.length);
        return output.toByteArray();
    }

    /**
     * Normalizes text for thermal printers: strips diacritics, converts to ASCII-safe.
     */
    public static String normalizePrinterText(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return normalized
            .replace("ç", "c")
            .replace("Ç", "C")
            .replace("–", "-")
            .replace("—", "-")
            .replace("“", "\"")
            .replace("”", "\"")
            .replace("‘", "'")
            .replace("’", "'");
    }

    /**
     * Builds receipt text from FCM data bundle for background auto-printing.
     * Layout matches the TypeScript buildRawBtText() format.
     */
    public static String buildReceiptText(android.os.Bundle data, int lineWidth) {
        String storeName = safe(data.getString("storeName", ""));
        String orderLabel = safe(data.getString("orderLabel", ""));
        String dateLabel = safe(data.getString("dateLabel", ""));
        String locationLabel = safe(data.getString("locationLabel", ""));
        String customerNote = safe(data.getString("customerNote", ""));
        String totalLabel = safe(data.getString("totalLabel", "R$ 0,00"));
        String receiptItems = safe(data.getString("receiptItems", ""));
        String storeId = safe(data.getString("storeId", ""));
        String orderId = safe(data.getString("orderId", ""));
        String customerName = safe(data.getString("customerName", ""));
        String customerPhone = safe(data.getString("customerPhone", ""));

        // ESC/POS constants
        String BOLD_ON = "E";
        String BOLD_OFF = "E ";
        String DH_ON = "!";
        String DH_OFF = "! ";

        String sep = repeat('-', lineWidth);
        String strongSep = repeat('=', lineWidth);

        StringBuilder sb = new StringBuilder();

        // Header
        sb.append(strongSep).append('\n');
        sb.append(centerText(storeName.isEmpty() ? "JA NO CAMINHO" : storeName.toUpperCase(), lineWidth)).append('\n');
        sb.append(strongSep).append('\n');

        // Date + Order meta
        sb.append(dateLabel).append('\n');
        sb.append(fitLeftRight("Pedido: " + orderLabel, "", lineWidth)).append('\n');
        if (!customerName.isEmpty()) {
            sb.append("Cliente: ").append(customerName).append('\n');
        }
        if (!customerPhone.isEmpty()) {
            sb.append("Fone: ").append(customerPhone).append('\n');
        }
        sb.append(strongSep).append('\n');

        // Location block (double separator + double height)
        if (!locationLabel.isEmpty()) {
            sb.append(strongSep).append('\n');
            sb.append(strongSep).append('\n');
            sb.append('\n');
            sb.append(BOLD_ON).append(DH_ON).append(centerText(locationLabel.toUpperCase(), lineWidth)).append(DH_OFF).append(BOLD_OFF).append('\n');
            sb.append('\n');
            sb.append(strongSep).append('\n');
            sb.append(strongSep).append('\n');
        }

        sb.append('\n');

        // Customer note block
        if (!customerNote.isEmpty()) {
            sb.append(sep).append('\n');
            sb.append(BOLD_ON).append("  ! OBS:").append(BOLD_OFF).append('\n');
            String[] noteLines = wrapWords(customerNote, lineWidth - 2);
            for (String line : noteLines) {
                sb.append("  ").append(line).append('\n');
            }
            sb.append(sep).append('\n');
        }

        // Items header
        sb.append(BOLD_ON).append(" QTD  ITEM").append(BOLD_OFF).append('\n');
        sb.append(sep).append('\n');

        // Items from compact format: "qtyx name|price;qtyx name|price"
        if (!receiptItems.isEmpty()) {
            String[] items = receiptItems.split(";");
            for (String item : items) {
                String[] parts = item.split("\\|", 2);
                String namePart = parts.length > 0 ? parts[0].trim() : "1x Item";
                String pricePart = parts.length > 1 ? parts[1].trim() : "";
                if (pricePart.isEmpty()) {
                    sb.append(BOLD_ON).append("  ").append(namePart).append(BOLD_OFF).append('\n');
                } else {
                    int rightW = Math.min(12, Math.max(8, pricePart.length()));
                    int leftW = Math.max(8, lineWidth - rightW);
                    String padded = namePart.length() > leftW ? namePart.substring(0, leftW) : namePart;
                    sb.append(BOLD_ON)
                      .append(padRight(padded, leftW))
                      .append(padLeft(pricePart, rightW))
                      .append(BOLD_OFF).append('\n');
                }
                sb.append('\n');
            }
        }

        sb.append(sep).append('\n');

        // Total (double height + bold)
        String totalLine = fitLeftRight("TOTAL:", totalLabel, lineWidth);
        sb.append(strongSep).append('\n');
        sb.append(BOLD_ON).append(DH_ON).append(totalLine).append(DH_OFF).append(BOLD_OFF).append('\n');
        sb.append(BOLD_ON).append(DH_ON).append(totalLine).append(DH_OFF).append(BOLD_OFF).append('\n');
        sb.append(strongSep).append('\n');
        sb.append('\n');

        // Footer
        String qrData = safe(data.getString("qrData", ""));
        if (!qrData.isEmpty()) {
            String url = qrData.replaceFirst("^https?://", "");
            sb.append(centerText(url, lineWidth)).append('\n');
        }
        sb.append(centerText("Volte sempre!", lineWidth)).append('\n');
        sb.append(strongSep).append('\n');

        return sb.toString();
    }

    // --- Utility methods ---

    static void writeInChunks(OutputStream output, byte[] bytes) throws Exception {
        int offset = 0;
        while (offset < bytes.length) {
            int length = Math.min(WRITE_CHUNK_SIZE, bytes.length - offset);
            output.write(bytes, offset, length);
            output.flush();
            offset += length;
            if (offset < bytes.length) {
                Thread.sleep(WRITE_CHUNK_DELAY_MS);
            }
        }
    }

    static void closeSocketQuietly(BluetoothSocket socket) {
        if (socket == null) return;
        try { socket.close(); } catch (Exception ignored) {}
    }

    static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    static String repeat(char c, int count) {
        StringBuilder sb = new StringBuilder(count);
        for (int i = 0; i < count; i++) sb.append(c);
        return sb.toString();
    }

    static String centerText(String text, int width) {
        if (text.length() >= width) return text.substring(0, width);
        int left = (width - text.length()) / 2;
        int right = width - text.length() - left;
        return repeat(' ', left) + text + repeat(' ', right);
    }

    static String fitLeftRight(String left, String right, int width) {
        int rightW = Math.min(12, Math.max(8, right.length()));
        int leftMax = Math.max(8, width - rightW);
        String leftStr = left.length() > leftMax ? left.substring(0, leftMax) : left;
        return padRight(leftStr, leftMax) + padLeft(right, rightW);
    }

    static String padRight(String text, int width) {
        return text.length() >= width ? text.substring(0, width) : text + repeat(' ', width - text.length());
    }

    static String padLeft(String text, int width) {
        return text.length() >= width ? text : repeat(' ', width - text.length()) + text;
    }

    static String[] wrapWords(String text, int width) {
        if (text == null || text.isEmpty()) return new String[]{""};
        String[] words = text.split("\\s+");
        java.util.List<String> lines = new java.util.ArrayList<>();
        String current = "";
        for (String word : words) {
            if (current.isEmpty()) {
                current = word.length() > width ? word.substring(0, width) : word;
                continue;
            }
            String candidate = current + " " + word;
            if (candidate.length() <= width) {
                current = candidate;
            } else {
                lines.add(current);
                current = word.length() > width ? word.substring(0, width) : word;
            }
        }
        if (!current.isEmpty()) lines.add(current);
        return lines.toArray(new String[0]);
    }
}
