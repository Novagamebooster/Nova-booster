package com.novagamebooster.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import androidx.core.app.NotificationCompat
import com.wireguard.android.backend.Backend
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class NovaVpnService : VpnService(), Tunnel {
    private var backend: Backend? = null
    private var activeConfig: Config? = null
    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    override fun getName(): String = "NOVA-WG"
    override fun getState(): Tunnel.State = if (activeConfig != null) Tunnel.State.UP else Tunnel.State.DOWN
    override fun onStateChange(newState: Tunnel.State) {}

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val wgConfig = intent?.getStringExtra("config") ?: return START_NOT_STICKY
        scope.launch {
            try {
                startForeground(NOTIF_ID, buildNotif("🔗 در حال اتصال به NOVA..."))
                activeConfig = Config.parse(wgConfig)
                backend = GoBackend(this@NovaVpnService)
                backend?.setState(this@NovaVpnService, Tunnel.State.UP, activeConfig)
                updateNotif("✅ متصل — پینگ کاهش یافت")
            } catch (e: Exception) {
                updateNotif("❌ خطا: ${e.message}")
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.launch {
            try { backend?.setState(this@NovaVpnService, Tunnel.State.DOWN, activeConfig) } catch (_: Exception) {}
        }
        job.cancel()
        super.onDestroy()
    }

    private fun buildNotif(text: String): android.app.Notification {
        val channelId = "nova_vpn"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(channelId) == null) {
                nm.createNotificationChannel(NotificationChannel(channelId, "NOVA VPN", NotificationManager.IMPORTANCE_LOW))
            }
        }
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("NOVA Game Booster")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_vpn_ic)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotif(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIF_ID, buildNotif(text))
    }

    companion object { const val NOTIF_ID = 9911 }
}
