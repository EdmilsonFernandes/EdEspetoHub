package com.janocaminho.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.text.Normalizer;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(alias = "bluetoothConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class ThermalPrinterPlugin extends Plugin {
    private static final String TAG = "JNC_THERMAL";
    private static final String PREFS_NAME = "jnc_thermal_printer";
    private static final String KEY_ADDRESS = "printer_address";
    private static final String KEY_NAME = "printer_name";
    private static final String KEY_WIDTH = "printer_width";
    private static final String KEY_COPIES = "printer_copies";
    private static final String KEY_HEADER_MODE = "printer_header_mode";
    private static final String KEY_FEED_LINES = "printer_feed_lines";
    private static final int DEFAULT_PAPER_WIDTH = 32;
    private static final int DEFAULT_COPIES = 1;
    private static final String DEFAULT_HEADER_MODE = "complete";
    private static final int DEFAULT_FEED_LINES = 3;
    private static final int WRITE_CHUNK_SIZE = 512;
    private static final long WRITE_CHUNK_DELAY_MS = 18L;
    private static final long PRINT_TIMEOUT_MS = 15000L;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        boolean hasPermission = hasBluetoothConnectPermission();
        ret.put("available", adapter != null);
        ret.put("enabled", adapter != null && adapter.isEnabled());
        ret.put("permissionGranted", hasPermission);
        ret.put("settings", getSettingsObject());
        ret.put("savedPrinter", getSavedPrinterObject());

        Log.d(TAG, "getStatus: available=" + (adapter != null)
            + " enabled=" + (adapter != null && adapter.isEnabled())
            + " permission=" + hasPermission);

        String savedAddress = sanitize(getPreferences().getString(KEY_ADDRESS, ""));
        // Reachability is NOT checked on every getStatus() call — socket connect is
        // unreliable, slow, and can interfere with active BT connections.  The actual
        // print path will discover reachability and surface a clear error if the
        // printer is truly unreachable.
        boolean optimisticReachable = !savedAddress.isEmpty()
            && adapter != null
            && adapter.isEnabled()
            && hasPermission;
        ret.put("printerReachable", optimisticReachable);
        Log.d(TAG, "getStatus: saved=" + savedAddress + " optimisticReachable=" + optimisticReachable);

        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            Log.d(TAG, "requestBluetoothPermission: SDK < 31, no runtime permission needed");
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        if (hasBluetoothConnectPermission()) {
            Log.d(TAG, "requestBluetoothPermission: already granted");
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        Log.i(TAG, "requestBluetoothPermission: requesting BLUETOOTH_CONNECT from user");
        requestPermissionForAlias("bluetoothConnect", call, "bluetoothPermissionCallback");
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        boolean granted = hasBluetoothConnectPermission();
        Log.i(TAG, "bluetoothPermissionCallback: granted=" + granted);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            requestPermissionForAlias("bluetoothConnect", call, "listPairedDevicesPermsCallback");
            return;
        }
        listPairedDevicesWithPermission(call);
    }

    @PermissionCallback
    private void listPairedDevicesPermsCallback(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            Log.w(TAG, "listPairedDevicesPermsCallback: user denied BLUETOOTH_CONNECT");
            call.reject("Permissao Bluetooth negada.", "PERMISSION_DENIED");
            return;
        }
        Log.i(TAG, "listPairedDevicesPermsCallback: permission granted, listing devices");
        listPairedDevicesWithPermission(call);
    }

    @PluginMethod
    public void savePrinter(PluginCall call) {
        String address = sanitize(call.getString("address"));
        String name = sanitize(call.getString("name"));
        int paperWidth = sanitizePaperWidth(call.getInt("paperWidth", getPreferences().getInt(KEY_WIDTH, DEFAULT_PAPER_WIDTH)));
        int copies = sanitizeCopies(call.getInt("copies", getPreferences().getInt(KEY_COPIES, DEFAULT_COPIES)));
        String headerMode = sanitizeHeaderMode(call.getString("headerMode", getPreferences().getString(KEY_HEADER_MODE, DEFAULT_HEADER_MODE)));
        int feedLines = sanitizeFeedLines(call.getInt("feedLines", getPreferences().getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES)));

        if (address.isEmpty()) {
            call.reject("Impressora invalida.", "INVALID_PRINTER");
            return;
        }

        Log.i(TAG, "savePrinter: address=" + address + " name=" + name);
        getPreferences()
            .edit()
            .putString(KEY_ADDRESS, address)
            .putString(KEY_NAME, name)
            .putInt(KEY_WIDTH, paperWidth)
            .putInt(KEY_COPIES, copies)
            .putString(KEY_HEADER_MODE, headerMode)
            .putInt(KEY_FEED_LINES, feedLines)
            .apply();

        JSObject ret = new JSObject();
        ret.put("settings", getSettingsObject());
        ret.put("savedPrinter", getSavedPrinterObject());
        call.resolve(ret);
    }

    @PluginMethod
    public void saveSettings(PluginCall call) {
        int paperWidth = sanitizePaperWidth(call.getInt("paperWidth", getPreferences().getInt(KEY_WIDTH, DEFAULT_PAPER_WIDTH)));
        int copies = sanitizeCopies(call.getInt("copies", getPreferences().getInt(KEY_COPIES, DEFAULT_COPIES)));
        String headerMode = sanitizeHeaderMode(call.getString("headerMode", getPreferences().getString(KEY_HEADER_MODE, DEFAULT_HEADER_MODE)));
        int feedLines = sanitizeFeedLines(call.getInt("feedLines", getPreferences().getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES)));

        Log.d(TAG, "saveSettings: width=" + paperWidth + " copies=" + copies + " header=" + headerMode + " feed=" + feedLines);
        getPreferences()
            .edit()
            .putInt(KEY_WIDTH, paperWidth)
            .putInt(KEY_COPIES, copies)
            .putString(KEY_HEADER_MODE, headerMode)
            .putInt(KEY_FEED_LINES, feedLines)
            .apply();

        JSObject ret = new JSObject();
        ret.put("settings", getSettingsObject());
        ret.put("savedPrinter", getSavedPrinterObject());
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPrinter(PluginCall call) {
        Log.i(TAG, "clearPrinter: removing saved printer");
        getPreferences()
            .edit()
            .remove(KEY_ADDRESS)
            .remove(KEY_NAME)
            .apply();
        JSObject ret = new JSObject();
        ret.put("settings", getSettingsObject());
        ret.put("savedPrinter", JSONObject.NULL);
        call.resolve(ret);
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            Log.e(TAG, "openBluetoothSettings: failed", error);
            call.reject("Nao foi possivel abrir as configuracoes Bluetooth.", "BLUETOOTH_SETTINGS_FAILED", error);
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            requestPermissionForAlias("bluetoothConnect", call, "printPermsCallback");
            return;
        }
        printWithPermission(call);
    }

    @PermissionCallback
    private void printPermsCallback(PluginCall call) {
        if (!hasBluetoothConnectPermission()) {
            Log.w(TAG, "printPermsCallback: user denied BLUETOOTH_CONNECT");
            call.reject("Permissao Bluetooth negada.", "PERMISSION_DENIED");
            return;
        }
        Log.i(TAG, "printPermsCallback: permission granted, proceeding to print");
        printWithPermission(call);
    }

    private void listPairedDevicesWithPermission(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            Log.w(TAG, "listPairedDevices: no Bluetooth adapter on this device");
            call.reject("Este aparelho nao possui Bluetooth.", "BLUETOOTH_UNAVAILABLE");
            return;
        }
        if (!adapter.isEnabled()) {
            Log.w(TAG, "listPairedDevices: Bluetooth is disabled");
            call.reject("Bluetooth desligado.", "BLUETOOTH_DISABLED");
            return;
        }

        JSArray printers = new JSArray();
        JSArray other = new JSArray();
        int totalBonded = 0;

        try {
            Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
            if (bondedDevices != null) {
                for (BluetoothDevice device : bondedDevices) {
                    totalBonded++;
                    String deviceName = safeDeviceName(device);
                    String address = device.getAddress();
                    boolean isPrinter = isLikelyPrinter(device);

                    JSObject item = new JSObject();
                    item.put("name", deviceName);
                    item.put("address", address);
                    item.put("bonded", true);
                    item.put("isPrinter", isPrinter);

                    if (isPrinter) {
                        printers.put(item);
                    } else {
                        other.put(item);
                    }
                }
            }
        } catch (SecurityException error) {
            Log.e(TAG, "listPairedDevices: SecurityException", error);
            call.reject("Permissao Bluetooth negada.", "PERMISSION_DENIED", error);
            return;
        }

        JSArray allDevices = new JSArray();
        for (int i = 0; i < printers.length(); i++) {
            allDevices.put(printers.optJSONObject(i));
        }
        for (int i = 0; i < other.length(); i++) {
            allDevices.put(other.optJSONObject(i));
        }

        Log.i(TAG, "listPairedDevices: total=" + totalBonded + " printers=" + printers.length() + " other=" + other.length());

        JSObject ret = new JSObject();
        ret.put("devices", allDevices);
        ret.put("settings", getSettingsObject());
        ret.put("savedPrinter", getSavedPrinterObject());
        call.resolve(ret);
    }

    private void printWithPermission(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            Log.w(TAG, "print: no Bluetooth adapter on this device");
            call.reject("Este aparelho nao possui Bluetooth.", "BLUETOOTH_UNAVAILABLE");
            return;
        }
        if (!adapter.isEnabled()) {
            Log.w(TAG, "print: Bluetooth is disabled");
            call.reject("Bluetooth desligado.", "BLUETOOTH_DISABLED");
            return;
        }

        String text = call.getString("text", "");
        String address = sanitize(call.getString("address"));
        int copies = sanitizeCopies(call.getInt("copies", getPreferences().getInt(KEY_COPIES, DEFAULT_COPIES)));
        int feedLines = sanitizeFeedLines(call.getInt("feedLines", getPreferences().getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES)));
        if (text.trim().isEmpty()) {
            call.reject("Cupom vazio.", "EMPTY_RECEIPT");
            return;
        }
        if (address.isEmpty()) {
            address = getPreferences().getString(KEY_ADDRESS, "");
        }
        address = sanitize(address);
        if (address.isEmpty()) {
            call.reject("Nenhuma impressora configurada.", "NO_PRINTER");
            return;
        }

        final String printerAddress = address;
        final String printerText = text;
        final int printerCopies = copies;
        final int printerFeedLines = feedLines;
        final AtomicBoolean finished = new AtomicBoolean(false);
        final BluetoothSocket[] socketRef = new BluetoothSocket[1];

        Log.i(TAG, "print: start address=" + printerAddress + " copies=" + printerCopies + " textLen=" + printerText.length());

        Thread worker = new Thread(() -> {
            long start = System.currentTimeMillis();
            Exception lastError = null;

            for (int attempt = 0; attempt < 3; attempt++) {
                if (finished.get()) return;
                if (attempt > 0) {
                    long delayMs = 300L * attempt;
                    Log.d(TAG, "print: retry attempt=" + (attempt + 1) + " waiting " + delayMs + "ms");
                    try { Thread.sleep(delayMs); } catch (InterruptedException ignored) {}
                }

                BluetoothSocket socket = null;
                try {
                    BluetoothDevice device = adapter.getRemoteDevice(printerAddress);
                    adapter.cancelDiscovery();
                    Log.d(TAG, "print: attempt=" + (attempt + 1) + " creating socket to " + printerAddress);

                    try {
                        socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                        socketRef[0] = socket;
                        socket.connect();
                        Log.d(TAG, "print: secure socket connected");
                    } catch (Exception firstError) {
                        Log.w(TAG, "print: secure socket failed (" + firstError.getClass().getSimpleName() + ": " + firstError.getMessage() + "), trying insecure");
                        closeSocketQuietly(socket);
                        socketRef[0] = null;
                        if (finished.get()) return;

                        socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                        socketRef[0] = socket;
                        socket.connect();
                        Log.d(TAG, "print: insecure socket connected");
                    }

                    Thread.sleep(150L);

                    OutputStream output = socket.getOutputStream();
                    byte[] bytes = toPrinterBytes(printerText, printerFeedLines);
                    Log.d(TAG, "print: sending " + bytes.length + " bytes x" + printerCopies);

                    for (int copy = 0; copy < printerCopies; copy++) {
                        writeInChunks(output, bytes);
                        if (copy + 1 < printerCopies) {
                            Thread.sleep(180L);
                        }
                    }
                    output.flush();
                    closeSocketQuietly(socket);
                    socketRef[0] = null;

                    long durationMs = System.currentTimeMillis() - start;
                    Log.i(TAG, "print: SUCCESS bytes=" + (bytes.length * printerCopies) + " attempts=" + (attempt + 1) + " duration=" + durationMs + "ms");

                    if (finished.compareAndSet(false, true)) {
                        JSObject ret = new JSObject();
                        ret.put("mode", "native");
                        ret.put("bytes", bytes.length * printerCopies);
                        ret.put("durationMs", durationMs);
                        ret.put("attempts", attempt + 1);
                        resolveOnUi(call, ret);
                    }
                    return;
                } catch (Exception error) {
                    closeSocketQuietly(socketRef[0]);
                    socketRef[0] = null;
                    lastError = error;
                    Log.w(TAG, "print: attempt=" + (attempt + 1) + " FAILED: " + error.getClass().getSimpleName() + ": " + error.getMessage());
                }
            }

            long durationMs = System.currentTimeMillis() - start;
            String errorMsg = lastError != null ? lastError.getMessage() : "Unknown error";
            String errorType = classifyError(lastError);
            Log.e(TAG, "print: ALL RETRIES FAILED after " + durationMs + "ms (" + errorType + "): " + errorMsg);

            if (finished.compareAndSet(false, true)) {
                String userMessage = friendlyErrorMessage(errorType, errorMsg);
                rejectOnUi(call, userMessage, "PRINT_FAILED", lastError != null ? lastError : new Exception("Unknown error"));
            }
        }, "JNC-ThermalPrinter");
        worker.start();

        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (finished.compareAndSet(false, true)) {
                closeSocketQuietly(socketRef[0]);
                Log.e(TAG, "print: TIMEOUT after " + PRINT_TIMEOUT_MS + "ms");
                call.reject("Tempo esgotado ao conectar na impressora. Verifique se ela esta ligada e perto do celular.", "PRINT_TIMEOUT");
            }
        }, PRINT_TIMEOUT_MS);
    }

    private boolean isLikelyPrinter(BluetoothDevice device) {
        BluetoothClass btClass = null;
        try {
            btClass = device.getBluetoothClass();
        } catch (SecurityException ignored) {}

        if (btClass != null) {
            int majorClass = btClass.getMajorDeviceClass();
            if (majorClass == BluetoothClass.Device.Major.IMAGING) {
                return true;
            }
            if (majorClass == BluetoothClass.Device.Major.PERIPHERAL) {
                return true;
            }
        }

        String name = safeDeviceName(device).toLowerCase();
        if (name.contains("printer") || name.contains("print") ||
            name.contains("impres") || name.contains("pos-") ||
            name.contains("pos ") || name.contains("tpos") ||
            name.contains("miniprint") || name.contains("bt-printer") ||
            name.contains("receipt") || name.contains("thermal") ||
            name.contains("mtp-") || name.contains("pt-") ||
            name.contains("rp-") || name.contains("bluetooth printer") ||
            name.contains("zn-") || name.contains("goprint") ||
            name.contains("inner") || name.contains("hoobon") ||
            name.contains("peripage") || name.contains("niimbot")) {
            return true;
        }

        return false;
    }

    private boolean checkPrinterReachable(BluetoothAdapter adapter, String address) {
        BluetoothSocket socket = null;
        try {
            BluetoothDevice device = adapter.getRemoteDevice(address);
            socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            Log.d(TAG, "checkPrinterReachable: " + address + " => REACHABLE");
            return true;
        } catch (Exception error) {
            Log.d(TAG, "checkPrinterReachable: " + address + " => UNREACHABLE (" + error.getClass().getSimpleName() + ": " + error.getMessage() + ")");
            return false;
        } finally {
            closeSocketQuietly(socket);
        }
    }

    private String classifyError(Exception error) {
        if (error == null) return "UNKNOWN";
        String msg = String.valueOf(error.getMessage()).toLowerCase();
        String cls = error.getClass().getSimpleName().toLowerCase();

        if (msg.contains("service discovery") || msg.contains("sdp") || msg.contains("uuid")) return "SDP_FAILED";
        if (msg.contains("connection refused") || msg.contains("refused")) return "CONNECTION_REFUSED";
        if (msg.contains("connection reset") || msg.contains("reset")) return "CONNECTION_RESET";
        if (msg.contains("broken pipe") || msg.contains("pipe")) return "BROKEN_PIPE";
        if (msg.contains("timeout") || msg.contains("timed out")) return "TIMEOUT";
        if (msg.contains("read failed") || msg.contains("read error")) return "READ_FAILED";
        if (msg.contains("socket closed") || msg.contains("closed")) return "SOCKET_CLOSED";
        if (cls.contains("ioexception")) return "IO_ERROR";
        if (cls.contains("security")) return "PERMISSION_ERROR";
        return "CONNECT_ERROR";
    }

    private String friendlyErrorMessage(String errorType, String detail) {
        switch (errorType) {
            case "CONNECTION_REFUSED":
                return "A impressora recusou a conexao. Ela pode estar ocupada imprimindo ou com erro. Desligue e ligue a impressora e tente novamente.";
            case "CONNECTION_RESET":
                return "A conexao com a impressora caiu. Verifique se ela esta ligada e perto do celular (ate 3 metros).";
            case "BROKEN_PIPE":
                return "A comunicacao com a impressora foi interrompida. Tente desemparelhar e parear novamente no Bluetooth do aparelho.";
            case "TIMEOUT":
                return "A impressora demorou demais para responder. Verifique se esta ligada, com papel e perto do celular.";
            case "SDP_FAILED":
                return "Nao foi possivel encontrar o servico de impressao neste dispositivo. Confirme se e uma impressora termica Bluetooth compativel.";
            case "READ_FAILED":
                return "Erro de comunicacao com a impressora. Tente desligar e ligar a impressora.";
            case "SOCKET_CLOSED":
                return "A conexao foi encerrada antes de concluir. Tente novamente.";
            case "PERMISSION_ERROR":
                return "Permissao Bluetooth negada. Va nas configuracoes do app e permita dispositivos proximos.";
            default:
                return "Nao foi possivel imprimir (" + errorType + "). Verifique se a impressora esta ligada, pareada e proxima ao celular.";
        }
    }

    private boolean hasBluetoothConnectPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return getPermissionState("bluetoothConnect") == PermissionState.GRANTED;
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private JSObject getSavedPrinterObject() {
        String address = sanitize(getPreferences().getString(KEY_ADDRESS, ""));
        if (address.isEmpty()) return null;
        JSObject printer = new JSObject();
        printer.put("address", address);
        printer.put("name", getPreferences().getString(KEY_NAME, ""));
        printer.put("paperWidth", sanitizePaperWidth(getPreferences().getInt(KEY_WIDTH, DEFAULT_PAPER_WIDTH)));
        printer.put("copies", sanitizeCopies(getPreferences().getInt(KEY_COPIES, DEFAULT_COPIES)));
        printer.put("headerMode", sanitizeHeaderMode(getPreferences().getString(KEY_HEADER_MODE, DEFAULT_HEADER_MODE)));
        printer.put("feedLines", sanitizeFeedLines(getPreferences().getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES)));
        return printer;
    }

    private JSObject getSettingsObject() {
        JSObject settings = new JSObject();
        settings.put("paperWidth", sanitizePaperWidth(getPreferences().getInt(KEY_WIDTH, DEFAULT_PAPER_WIDTH)));
        settings.put("copies", sanitizeCopies(getPreferences().getInt(KEY_COPIES, DEFAULT_COPIES)));
        settings.put("headerMode", sanitizeHeaderMode(getPreferences().getString(KEY_HEADER_MODE, DEFAULT_HEADER_MODE)));
        settings.put("feedLines", sanitizeFeedLines(getPreferences().getInt(KEY_FEED_LINES, DEFAULT_FEED_LINES)));
        return settings;
    }

    private String safeDeviceName(BluetoothDevice device) {
        try {
            String name = device.getName();
            return name == null || name.trim().isEmpty() ? "Dispositivo Bluetooth" : name.trim();
        } catch (SecurityException ignored) {
            return "Dispositivo Bluetooth";
        }
    }

    private byte[] toPrinterBytes(String text, int feedLines) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(new byte[] { 0x1B, 0x40 });
        String normalized = normalizePrinterText(text);
        output.write(normalized.getBytes(Charset.forName("ISO-8859-1")));
        for (int i = 0; i < feedLines; i++) {
            output.write(0x0A);
        }
        output.write(new byte[] { 0x1D, 0x56, 0x42, 0x00 });
        return output.toByteArray();
    }

    private String normalizePrinterText(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return normalized
            .replace("00e7", "c")
            .replace("00c7", "C")
            .replace("2013", "-")
            .replace("2014", "-")
            .replace("201c", "\"")
            .replace("201d", "\"")
            .replace("2018", "'")
            .replace("2019", "'");
    }

    private void writeInChunks(OutputStream output, byte[] bytes) throws Exception {
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

    private String sanitize(String value) {
        return value == null ? "" : value.trim();
    }

    private int sanitizePaperWidth(Integer value) {
        int width = value == null ? DEFAULT_PAPER_WIDTH : value;
        return width >= 40 ? 42 : 32;
    }

    private int sanitizeCopies(Integer value) {
        int copies = value == null ? DEFAULT_COPIES : value;
        return Math.max(1, Math.min(2, copies));
    }

    private int sanitizeFeedLines(Integer value) {
        int feedLines = value == null ? DEFAULT_FEED_LINES : value;
        return Math.max(1, Math.min(6, feedLines));
    }

    private String sanitizeHeaderMode(String value) {
        String mode = sanitize(value).toLowerCase();
        return "compact".equals(mode) ? "compact" : DEFAULT_HEADER_MODE;
    }

    private void resolveOnUi(PluginCall call, JSObject result) {
        try {
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> call.resolve(result));
            } else {
                call.resolve(result);
            }
        } catch (Exception e) {
            call.resolve(result);
        }
    }

    private void rejectOnUi(PluginCall call, String message, String code, Exception error) {
        try {
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> call.reject(message, code, error));
            } else {
                call.reject(message, code, error);
            }
        } catch (Exception e) {
            call.reject(message, code, error);
        }
    }

    private void closeSocketQuietly(BluetoothSocket socket) {
        if (socket == null) return;
        try {
            socket.close();
        } catch (Exception ignored) {}
    }
}
