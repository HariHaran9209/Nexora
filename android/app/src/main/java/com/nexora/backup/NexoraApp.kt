package com.nexora.backup

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.nexora.backup.data.PreferenceManager
import com.nexora.backup.worker.MediaBackupWorker
import java.util.concurrent.TimeUnit

class NexoraApp : Application() {

    companion object {
        const val CHANNEL_ID = "nexora_backup_channel"
        lateinit var instance: NexoraApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        schedulePeriodicBackup()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = getString(R.string.sync_channel_name)
            val descriptionText = getString(R.string.sync_channel_desc)
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun schedulePeriodicBackup() {
        val prefs = PreferenceManager(this)
        if (!prefs.isAutoBackupEnabled) {
            WorkManager.getInstance(this).cancelUniqueWork("NexoraPeriodicBackup")
            return
        }

        val networkType = if (prefs.isWifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(networkType)
            .setRequiresBatteryNotLow(true)
            .build()

        val backupRequest = PeriodicWorkRequestBuilder<MediaBackupWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "NexoraPeriodicBackup",
            ExistingPeriodicWorkPolicy.KEEP,
            backupRequest
        )
    }
}
