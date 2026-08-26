package com.nexora.backup

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.OneTimeWorkRequestBuilder
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
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PreferenceManager(this)
        db = AppDatabase.getDatabase(this)

        checkPermissions()
        setupUI()
        loadStats()
    }

    override fun onResume() {
        super.onResume()
        loadStats()
    }

    private fun checkPermissions() {
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
            // Save inputs
            prefs.serverUrl = binding.etServerUrl.text.toString().trim()
            prefs.authToken = binding.etAuthToken.text.toString().trim()

            if (prefs.authToken.isEmpty()) {
                Toast.makeText(this, "Please enter your JWT Auth Token first.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            Toast.makeText(this, "Starting camera backup...", Toast.LENGTH_SHORT).show()

            val oneTimeRequest = OneTimeWorkRequestBuilder<MediaBackupWorker>().build()
            WorkManager.getInstance(this).enqueue(oneTimeRequest)
        }
    }

    private fun loadStats() {
        lifecycleScope.launch(Dispatchers.IO) {
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
        }
    }
}
