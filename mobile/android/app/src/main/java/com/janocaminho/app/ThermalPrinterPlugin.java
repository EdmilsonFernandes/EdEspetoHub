package com.janocaminho.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

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
    private static final String PREFS_NAME = "jnc_thermal_printer";
    private static final String KEY_ADDRESS = "printer_address";
    private static final String KEY_NAME = "printer_name";
    private static final String KEY_WIDTH = "printer_width";
    private static final int DEFAULT_PAPER_WIDTH = 32;
    private static final int WRITE_CHUNK_SIZE = 512;
    private static final long WRITE_CHUNK_DELAY_MS = 18L;
    private static final long PRINT_TIMEOUT_MS = 9000L;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        ret.put("available", adapter != null);
        ret.put("enabled", adapter != null && adapter.isEnabled());
        ret.put("permissionGranted", hasBluetoothConnectPermission());
        ret.put("savedPrinter", getSavedPrinterObject());
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
            call.reject("Permissão Bluetooth negada.", "PERMISSION_DENIED");
            return;
        }
        listPairedDevicesWithPermission(call);
    }

    @PluginMethod
    public void savePrinter(PluginCall call) {
        String address = sanitize(call.getString("address"));
        String name = sanitize(call.getString("name"));
        int paperWidth = Math.max(24, Math.min(48, call.getInt("paperWidth", DEFAULT_PAPER_WIDTH)));

        if (address.isEmpty()) {
            call.reject("Impressora inválida.", "INVALID_PRINTER");
            return;
        }

        getPreferences()
            .edit()
            .putString(KEY_ADDRESS, address)
            .putString(KEY_NAME, name)
            .putInt(KEY_WIDTH, paperWidth)
            .apply();

        JSObject ret = new JSObject();
        ret.put("savedPrinter", getSavedPrinterObject());
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPrinter(PluginCall call) {
        getPreferences().edit().clear().apply();
        JSObject ret = new JSObject();
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
            call.reject("Não foi possível abrir as configurações Bluetooth.", "BLUETOOTH_SETTINGS_FAILED", error);
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
            call.reject("Permissão Bluetooth negada.", "PERMISSION_DENIED");
            return;
        }
        printWithPermission(call);
    }

    private void listPairedDevicesWithPermission(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Este aparelho não possui Bluetooth.", "BLUETOOTH_UNAVAILABLE");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth desligado.", "BLUETOOTH_DISABLED");
            return;
        }

        JSArray devices = new JSArray();
        try {
            Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
            if (bondedDevices != null) {
                for (BluetoothDevice device : bondedDevices) {
                    JSObject item = new JSObject();
                    item.put("name", safeDeviceName(device));
                    item.put("address", device.getAddress());
                    item.put("bonded", true);
                    devices.put(item);
                }
            }
        } catch (SecurityException error) {
            call.reject("Permissão Bluetooth negada.", "PERMISSION_DENIED", error);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("devices", devices);
        ret.put("savedPrinter", getSavedPrinterObject());
        call.resolve(ret);
    }

    private void printWithPermission(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Este aparelho não possui Bluetooth.", "BLUETOOTH_UNAVAILABLE");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth desligado.", "BLUETOOTH_DISABLED");
            return;
        }

        String text = call.getString("text", "");
        String address = sanitize(call.getString("address"));
        int copies = Math.max(1, Math.min(3, call.getInt("copies", 1)));
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
        final AtomicBoolean finished = new AtomicBoolean(false);
        final BluetoothSocket[] socketRef = new BluetoothSocket[1];

        Thread worker = new Thread(() -> {
            long start = System.currentTimeMillis();
            try {
                BluetoothDevice device = adapter.getRemoteDevice(printerAddress);
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socketRef[0] = socket;
                adapter.cancelDiscovery();
                socket.connect();

                OutputStream output = socket.getOutputStream();
                byte[] bytes = toPrinterBytes(printerText);
                for (int copy = 0; copy < printerCopies; copy++) {
                    writeInChunks(output, bytes);
                    if (copy + 1 < printerCopies) {
                        Thread.sleep(180L);
                    }
                }
                output.flush();
                closeSocketQuietly(socket);

                if (finished.compareAndSet(false, true)) {
                    JSObject ret = new JSObject();
                    ret.put("mode", "native");
                    ret.put("bytes", bytes.length * printerCopies);
                    ret.put("durationMs", System.currentTimeMillis() - start);
                    getActivity().runOnUiThread(() -> call.resolve(ret));
                }
            } catch (Exception error) {
                closeSocketQuietly(socketRef[0]);
                if (finished.compareAndSet(false, true)) {
                    getActivity().runOnUiThread(() ->
                        call.reject("Não foi possível imprimir pela impressora configurada.", "PRINT_FAILED", error)
                    );
                }
            }
        }, "JNC-ThermalPrinter");
        worker.start();

        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (finished.compareAndSet(false, true)) {
                closeSocketQuietly(socketRef[0]);
                call.reject("Tempo esgotado ao conectar na impressora.", "PRINT_TIMEOUT");
            }
        }, PRINT_TIMEOUT_MS);
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
        printer.put("paperWidth", getPreferences().getInt(KEY_WIDTH, DEFAULT_PAPER_WIDTH));
        return printer;
    }

    private String safeDeviceName(BluetoothDevice device) {
        try {
            String name = device.getName();
            return name == null || name.trim().isEmpty() ? "Impressora Bluetooth" : name.trim();
        } catch (SecurityException ignored) {
            return "Impressora Bluetooth";
        }
    }

    private byte[] toPrinterBytes(String text) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(new byte[] { 0x1B, 0x40 });
        String normalized = normalizePrinterText(text);
        output.write(normalized.getBytes(Charset.forName("ISO-8859-1")));
        output.write(new byte[] { 0x0A, 0x0A, 0x0A });
        output.write(new byte[] { 0x1D, 0x56, 0x42, 0x00 });
        return output.toByteArray();
    }

    private String normalizePrinterText(String value) {
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

    private void closeSocketQuietly(BluetoothSocket socket) {
        if (socket == null) return;
        try {
            socket.close();
        } catch (Exception ignored) {
            // no-op
        }
    }
}
