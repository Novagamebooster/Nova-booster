package com.novagamebooster.app;

import android.content.Intent;
import android.net.Uri;
import android.net.VpnService;
import android.content.pm.PackageManager;
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

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == getActivity().RESULT_OK && pendingConfig != null) {
                launchWireGuard(pendingConfig, pendingServer);
                if (pendingCall != null) {
                    JSObject ret = new JSObject();
                    ret.put("status", "success");
                    ret.put("server", pendingServer);
                    pendingCall.resolve(ret);
                }
            } else {
                if (pendingCall != null) {
                    JSObject ret = new JSObject();
                    ret.put("status", "denied");
                    pendingCall.resolve(ret);
                }
            }
            pendingCall = null;
            pendingConfig = null;
            pendingServer = null;
        }
    }

    @PluginMethod
    public void launchGame(PluginCall call) {
        String pkg = call.getString("pkg", "");
        String keywords = call.getString("keywords", "");
        JSObject ret = new JSObject();

        if (pkg != null && !pkg.isEmpty()) {
            String[] candidates = pkg.split(",");
            for (String candidate : candidates) {
                String p = candidate.trim();
                if (p.isEmpty()) continue;
                try {
                    PackageManager pm = getContext().getPackageManager();
                    pm.getPackageInfo(p, 0);
                    Intent launchIntent = pm.getLaunchIntentForPackage(p);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(launchIntent);
                        ret.put("status", "launched");
                        ret.put("pkg", p);
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception ignored) {}
            }
        }

        String query = (keywords != null && !keywords.isEmpty()) ? keywords : pkg;
        if (query != null && !query.isEmpty()) {
            try {
                Intent storeIntent = new Intent(Intent.ACTION_VIEW);
                storeIntent.setData(Uri.parse("market://details?id=" + (pkg != null && !pkg.isEmpty() ? pkg.split(",")[0].trim() : "")));
                storeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(storeIntent);
                ret.put("status", "store");
                call.resolve(ret);
                return;
            } catch (Exception ignored) {}
        }
        ret.put("status", "failed");
        call.resolve(ret);
    }

    @PluginMethod
    public void startVpn(PluginCall call) {
        String config = call.getString("config", null);
        String server = call.getString("server", "unknown");
        JSObject ret = new JSObject();
        ret.put("status", "success");
        ret.put("server", server);

        if (config != null && !config.isEmpty()) {
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
