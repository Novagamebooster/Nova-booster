package com.novagamebooster.app;

import android.content.Intent;
import android.net.VpnService;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BoostCore")
public class BoostCorePlugin extends Plugin {
    private static final int VPN_REQUEST_CODE = 100;
    private PluginCall pendingCall = null;
    private String pendingConfig = null;
    private String pendingServer = null;

    @PluginMethod
    public void startVpn(PluginCall call) {
        String config = call.getString("config", null);
        String server = call.getString("server", "unknown");
        JSObject ret = new JSObject();
        ret.put("status", "success");
        ret.put("server", server);

        if (config != null && !config.isEmpty()) {
            // ===== تونل واقعی WireGuard =====
            Intent prep = VpnService.prepare(getContext());
            if (prep != null) {
                pendingCall = call;
                pendingConfig = config;
                pendingServer = server;
                getActivity().startActivityForResult(prep, VPN_REQUEST_CODE);
                return;
            } else {
                launchWireGuard(config, server);
            }
        } else {
            // ===== حالت fallback (بدون config واقعی) =====
            ret.put("mode", "simulated");
        }
        call.resolve(ret);
    }

    private void launchWireGuard(String config, String server) {
        Intent intent = new Intent(getContext(), NovaVpnService.class);
        intent.putExtra("config", config);
        intent.putExtra("server", server);
        getContext().startService(intent);
    }

    public void onVpnPermissionResult(int resultCode, String config, String server) {
        if (resultCode == android.app.Activity.RESULT_OK && config != null) {
            launchWireGuard(config, server);
        }
        if (pendingCall != null) {
            JSObject ret = new JSObject();
            ret.put("status", resultCode == android.app.Activity.RESULT_OK ? "success" : "denied");
            ret.put("server", server != null ? server : "unknown");
            pendingCall.resolve(ret);
        }
        pendingCall = null;
        pendingConfig = null;
        pendingServer = null;
    }

    @PluginMethod
    public void stopVpn(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), NovaVpnService.class));
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("status", "stopped");
        call.resolve(ret);
    }
}
