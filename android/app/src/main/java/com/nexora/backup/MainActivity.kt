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

        binding.btnTestConnection.setOnClickListener {
            val serverUrl = binding.etServerUrl.text.toString().trim()
            val authToken = binding.etAuthToken.text.toString().trim()

            prefs.serverUrl = serverUrl
            prefs.authToken = authToken

            if (authToken.isEmpty()) {
                Toast.makeText(this, "Enter a JWT token or tap 'Log In...'", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnTestConnection.isEnabled = false
            binding.btnTestConnection.text = "Testing..."

            lifecycleScope.launch(Dispatchers.IO) {
                try {
                    val api = com.nexora.backup.data.ApiClient.getService(this@MainActivity)
                    val res = api.checkHashes(com.nexora.backup.data.CheckHashesRequest(emptyList()))
                    withContext(Dispatchers.Main) {
                        binding.btnTestConnection.isEnabled = true
                        binding.btnTestConnection.text = "Test Connection"
                        if (res.isSuccessful) {
                            Toast.makeText(this@MainActivity, "✅ Connection successful! Token is valid.", Toast.LENGTH_SHORT).show()
                        } else if (res.code() == 401) {
                            Toast.makeText(this@MainActivity, "❌ HTTP 401: Invalid or Expired Token. Tap 'Log In...' to get a fresh token.", Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@MainActivity, "⚠️ Server returned HTTP ${res.code()}", Toast.LENGTH_LONG).show()
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        binding.btnTestConnection.isEnabled = true
                        binding.btnTestConnection.text = "Test Connection"
                        Toast.makeText(this@MainActivity, "❌ Cannot reach server: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        binding.btnLogin.setOnClickListener {
            showLoginDialog()
        }

        binding.btnSyncNow.setOnClickListener {
            try {
                // Save inputs
                val serverUrl = binding.etServerUrl.text.toString().trim()
                val authToken = binding.etAuthToken.text.toString().trim()

                prefs.serverUrl = serverUrl
                prefs.authToken = authToken

                if (authToken.isEmpty()) {
                    Toast.makeText(this, "Please enter your JWT Auth Token or tap 'Log In...'.", Toast.LENGTH_SHORT).show()
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

    private fun showLoginDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_login, null)
        val etUsername = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.dialogEtUsername)
        val etPassword = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.dialogEtPassword)

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
            .setView(dialogView)
            .setPositiveButton("Log In") { dialog, _ ->
                val identifier = etUsername.text.toString().trim()
                val password = etPassword.text.toString()

                if (identifier.isEmpty() || password.isEmpty()) {
                    Toast.makeText(this, "Username and password required.", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                prefs.serverUrl = binding.etServerUrl.text.toString().trim()
                Toast.makeText(this, "Signing in...", Toast.LENGTH_SHORT).show()

                lifecycleScope.launch(Dispatchers.IO) {
                    try {
                        val api = com.nexora.backup.data.ApiClient.getService(this@MainActivity)
                        val res = api.login(com.nexora.backup.data.LoginRequest(identifier, password))
                        withContext(Dispatchers.Main) {
                            if (res.isSuccessful && res.body()?.token?.isNotEmpty() == true) {
                                val token = res.body()!!.token
                                prefs.authToken = token
                                binding.etAuthToken.setText(token)
                                Toast.makeText(this@MainActivity, "✅ Logged in successfully! Token updated.", Toast.LENGTH_SHORT).show()
                                loadStats()
                            } else {
                                Toast.makeText(this@MainActivity, "❌ Login failed: Invalid username or password", Toast.LENGTH_LONG).show()
                            }
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@MainActivity, "❌ Sign in error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
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

