package com.novagamebooster.app

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config

class NovaVpnService : Service(), Tunnel {
    private var backend: GoBackend? = null
    private var currentConfig: Config? = null

    override fun getName(): String = "NOVA-WG"

    override fun onStateChange(newState: Tunnel.State) {
        Log.i("NOVA_VPN", "State: " + newState.name)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val cfgText = intent?.getStringExtra("config") ?: return START_NOT_STICKY
        Thread {
            try {
                val cfg = Config.parse(cfgText)
                currentConfig = cfg
                if (backend == null) backend = GoBackend(this)
                backend!!.setState(this, Tunnel.State.UP, cfg)
                Log.i("NOVA_VPN", "Tunnel UP")
            } catch (e: Exception) {
                Log.e("NOVA_VPN", "Tunnel error: " + e.message)
            }
        }.start()
        return START_STICKY
    }

    override fun onDestroy() {
        Thread {
            try {
                val cfg = currentConfig
                if (cfg != null) backend?.setState(this, Tunnel.State.DOWN, cfg)
            } catch (_: Exception) {}
        }.start()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
