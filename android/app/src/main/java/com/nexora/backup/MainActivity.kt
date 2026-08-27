package com.nexora.backup

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.nexora.backup.data.AppDatabase
import com.nexora.backup.data.PreferenceManager
import com.nexora.backup.databinding.ActivityMainBinding
import com.nexora.backup.worker.MediaBackupWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: PreferenceManager
    private lateinit var db: AppDatabase

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            Toast.makeText(this, "Permissions granted.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Media permissions required for camera backup.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)

            prefs = PreferenceManager(this)
            db = AppDatabase.getDatabase(this)

            setupUI()
            loadStats()
            checkPermissions()
        } catch (e: Exception) {
            Log.e("MainActivity", "Error during onCreate", e)
            Toast.makeText(this, "App startup error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onResume() {
        super.onResume()
        loadStats()
    }

    private fun checkPermissions() {
        try {
            val permissions = mutableListOf<String>()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
                permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }

            val ungranted = permissions.filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }

            if (ungranted.isNotEmpty()) {
                permissionLauncher.launch(ungranted.toTypedArray())
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error checking permissions", e)
        }
    }

    private fun setupUI() {
        binding.switchAutoBackup.isChecked = prefs.isAutoBackupEnabled
        binding.switchWifiOnly.isChecked = prefs.isWifiOnly
        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etAuthToken.setText(prefs.authToken)

        binding.switchAutoBackup.setOnCheckedChangeListener { _, isChecked ->
            prefs.isAutoBackupEnabled = isChecked
            NexoraApp.instance.schedulePeriodicBackup()
        }

        binding.switchWifiOnly.setOnCheckedChangeListener { _, isChecked ->
            prefs.isWifiOnly = isChecked
            NexoraApp.instance.schedulePeriodicBackup()
        }

        binding.etServerUrl.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                prefs.serverUrl = binding.etServerUrl.text.toString().trim()
            }
        }

        binding.etAuthToken.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                prefs.authToken = binding.etAuthToken.text.toString().trim()
            }
        }

        binding.btnSyncNow.setOnClickListener {
            try {
                // Save inputs
                val serverUrl = binding.etServerUrl.text.toString().trim()
                val authToken = binding.etAuthToken.text.toString().trim()

                prefs.serverUrl = serverUrl
                prefs.authToken = authToken

                if (authToken.isEmpty()) {
                    Toast.makeText(this, "Please enter your JWT Auth Token first.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                binding.btnSyncNow.isEnabled = false
                binding.btnSyncNow.text = "Syncing..."
                Toast.makeText(this, "Starting camera backup...", Toast.LENGTH_SHORT).show()

                val oneTimeRequest = OneTimeWorkRequestBuilder<MediaBackupWorker>().build()
                WorkManager.getInstance(this).enqueueUniqueWork(
                    "NexoraManualBackup",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    oneTimeRequest
                )

                WorkManager.getInstance(this)
                    .getWorkInfoByIdLiveData(oneTimeRequest.id)
                    .observe(this) { workInfo ->
                        if (workInfo != null) {
                            when (workInfo.state) {
                                WorkInfo.State.SUCCEEDED -> {
                                    binding.btnSyncNow.isEnabled = true
                                    binding.btnSyncNow.text = "Sync Now"
                                    val uploaded = workInfo.outputData.getInt("uploaded", 0)
                                    val failed = workInfo.outputData.getInt("failed", 0)
                                    val msg = if (failed > 0) "Backup finished: $uploaded uploaded, $failed failed" else "Backup complete!"
                                    Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
                                    loadStats()
                                }
                                WorkInfo.State.FAILED -> {
                                    binding.btnSyncNow.isEnabled = true
                                    binding.btnSyncNow.text = "Sync Now"
                                    val errorMsg = workInfo.outputData.getString("error") ?: "Check connection and Auth Token."
                                    Toast.makeText(this, "Sync error: $errorMsg", Toast.LENGTH_LONG).show()
                                    loadStats()
                                }
                                WorkInfo.State.CANCELLED -> {
                                    binding.btnSyncNow.isEnabled = true
                                    binding.btnSyncNow.text = "Sync Now"
                                    loadStats()
                                }
                                else -> {}
                            }
                        }
                    }
            } catch (e: Exception) {
                Log.e("MainActivity", "Error triggering backup", e)
                binding.btnSyncNow.isEnabled = true
                binding.btnSyncNow.text = "Sync Now"
                Toast.makeText(this, "Failed to start sync: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun loadStats() {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val count = db.backupDao().getUploadedCount()
                val lastSync = prefs.lastSyncTimestamp

                withContext(Dispatchers.Main) {
                    binding.tvUploadedCount.text = "$count files backed up"
                    if (lastSync > 0) {
                        val sdf = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
                        binding.tvLastSyncTime.text = "Last synced: ${sdf.format(Date(lastSync))}"
                    } else {
                        binding.tvLastSyncTime.text = "Never synced"
                    }
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Error loading stats", e)
            }
        }
    }
}

