package com.nexora.backup.worker

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.nexora.backup.data.*
import com.nexora.backup.service.BackupForegroundService
import com.nexora.backup.utils.HashUtils
import com.nexora.backup.utils.MediaScannerUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class MediaBackupWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val prefs = PreferenceManager(context)
    private val db = AppDatabase.getDatabase(context)
    private val dao = db.backupDao()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!prefs.isAutoBackupEnabled || prefs.authToken.isEmpty()) {
            Log.d("NexoraWorker", "Backup disabled or no auth token configured.")
            return@withContext Result.success()
        }

        try {
            Log.d("NexoraWorker", "Starting background camera backup check...")

            // 1. Start foreground service notification
            val serviceIntent = Intent(context, BackupForegroundService::class.java).apply {
                putExtra(BackupForegroundService.EXTRA_PROGRESS_TEXT, "Scanning camera media...")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            // 2. Scan DCIM/Camera media
            val scannedMedia = MediaScannerUtils.scanCameraMedia(context)
            Log.d("NexoraWorker", "Scanned ${scannedMedia.size} camera files.")

            if (scannedMedia.isEmpty()) {
                stopForegroundService()
                return@withContext Result.success()
            }

            // 3. Compute hashes for items not yet in local DB
            val itemsToProcess = mutableListOf<BackupEntity>()

            for (scanned in scannedMedia) {
                val file = File(scanned.filePath)
                if (!file.exists()) continue

                val hash = HashUtils.calculateSHA256(file)
                val existing = dao.getByHash(hash)

                if (existing == null) {
                    val entity = BackupEntity(
                        filePath = scanned.filePath,
                        fileName = scanned.fileName,
                        sha256Hash = hash,
                        fileSize = scanned.size,
                        mimeType = scanned.mimeType,
                        isUploaded = false
                    )
                    dao.insert(entity)
                    itemsToProcess.add(entity)
                } else if (!existing.isUploaded) {
                    itemsToProcess.add(existing)
                }
            }

            if (itemsToProcess.isEmpty()) {
                Log.d("NexoraWorker", "All items are already backed up.")
                stopForegroundService()
                return@withContext Result.success()
            }

            // 4. Fast Server Deduplication Check
            val api = ApiClient.getService(context)
            val hashesToCheck = itemsToProcess.map { it.sha256Hash }
            val checkRes = api.checkHashes(CheckHashesRequest(hashesToCheck))

            val neededHashes = if (checkRes.isSuccessful && checkRes.body() != null) {
                // Mark already existing on server as uploaded
                val existingOnServer = checkRes.body()!!.existingHashes
                for (h in existingOnServer) {
                    dao.markUploaded(h)
                }
                checkRes.body()!!.neededHashes.toSet()
            } else {
                hashesToCheck.toSet()
            }

            val queueToUpload = itemsToProcess.filter { neededHashes.contains(it.sha256Hash) }
            Log.d("NexoraWorker", "${queueToUpload.size} files queued for upload.")

            // 5. Upload files sequentially with progress
            var uploadedCount = 0
            val totalToUpload = queueToUpload.size

            for (item in queueToUpload) {
                val file = File(item.filePath)
                if (!file.exists()) continue

                updateServiceProgress("Uploading ${file.name} (${uploadedCount + 1}/$totalToUpload)", uploadedCount + 1, totalToUpload)

                val reqFile = file.asRequestBody((item.mimeType.ifEmpty { "image/jpeg" }).toMediaTypeOrNull())
                val body = MultipartBody.Part.createFormData("file", file.name, reqFile)
                val folderReq = prefs.targetFolder.toRequestBody("text/plain".toMediaTypeOrNull())
                val hashReq = item.sha256Hash.toRequestBody("text/plain".toMediaTypeOrNull())

                val uploadRes = api.uploadMedia(body, folderReq, hashReq)
                if (uploadRes.isSuccessful) {
                    dao.markUploaded(item.sha256Hash)
                    uploadedCount++
                } else {
                    Log.w("NexoraWorker", "Upload failed for ${file.name}: ${uploadRes.code()}")
                }
            }

            prefs.lastSyncTimestamp = System.currentTimeMillis()
            stopForegroundService()

            Log.d("NexoraWorker", "Backup finished. Uploaded $uploadedCount files.")
            Result.success()
        } catch (e: Exception) {
            Log.e("NexoraWorker", "Error during backup execution", e)
            stopForegroundService()
            Result.retry()
        }
    }

    private fun updateServiceProgress(text: String, current: Int, total: Int) {
        val intent = Intent(context, BackupForegroundService::class.java).apply {
            putExtra(BackupForegroundService.EXTRA_PROGRESS_TEXT, text)
            putExtra(BackupForegroundService.EXTRA_PROGRESS_CURRENT, current)
            putExtra(BackupForegroundService.EXTRA_PROGRESS_TOTAL, total)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    private fun stopForegroundService() {
        val intent = Intent(context, BackupForegroundService::class.java)
        context.stopService(intent)
    }
}
