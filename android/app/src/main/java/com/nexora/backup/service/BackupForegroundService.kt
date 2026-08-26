package com.nexora.backup.service

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.nexora.backup.NexoraApp
import com.nexora.backup.R

class BackupForegroundService : Service() {

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_UPDATE_PROGRESS = "com.nexora.backup.UPDATE_PROGRESS"
        const val EXTRA_PROGRESS_TEXT = "progress_text"
        const val EXTRA_PROGRESS_CURRENT = "progress_current"
        const val EXTRA_PROGRESS_TOTAL = "progress_total"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val text = intent?.getStringExtra(EXTRA_PROGRESS_TEXT) ?: "Syncing camera media to Arch server..."
        val current = intent?.getIntExtra(EXTRA_PROGRESS_CURRENT, 0) ?: 0
        val total = intent?.getIntExtra(EXTRA_PROGRESS_TOTAL, 0) ?: 0

        val notification = createNotification(text, current, total)
        startForeground(NOTIFICATION_ID, notification)

        return START_NOT_STICKY
    }

    private fun createNotification(text: String, current: Int, total: Int): Notification {
        val builder = NotificationCompat.Builder(this, NexoraApp.CHANNEL_ID)
            .setContentTitle("Nexora Camera Backup")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (total > 0) {
            builder.setProgress(total, current, false)
        } else {
            builder.setProgress(0, 0, true)
        }

        return builder.build()
    }
}
