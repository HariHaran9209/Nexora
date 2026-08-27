package com.nexora.backup.worker

import android.content.ContentResolver
import android.content.Context
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.nexora.backup.NexoraApp
import com.nexora.backup.R
import com.nexora.backup.data.*
import com.nexora.backup.utils.HashUtils
import com.nexora.backup.utils.MediaScannerUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.BufferedSink
import okio.source
import java.io.File
import java.io.IOException

class ContentUriRequestBody(
    private val contentResolver: ContentResolver,
    private val uri: Uri,
    private val contentType: MediaType?
) : RequestBody() {
    override fun contentType(): MediaType? = contentType
    // Return -1 to force chunked streaming and avoid MediaStore EXIF content-length mismatches
    override fun contentLength(): Long = -1L

    override fun writeTo(sink: BufferedSink) {
        contentResolver.openInputStream(uri)?.use { inputStream ->
            val source = inputStream.source()
            sink.writeAll(source)
        } ?: throw IOException("Unable to open input stream for URI: $uri")
    }
}

class MediaBackupWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val prefs = PreferenceManager(context)
    private val db = AppDatabase.getDatabase(context)
    private val dao = db.backupDao()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (prefs.authToken.isEmpty()) {
            Log.d("NexoraWorker", "No auth token configured, skipping backup.")
            return@withContext Result.failure(workDataOf("error" to "No auth token configured"))
        }

        try {
            Log.d("NexoraWorker", "Starting camera backup check...")

            try {
                setForeground(createForegroundInfo("Connecting to Nexora server..."))
            } catch (e: Exception) {
                Log.w("NexoraWorker", "Could not set foreground: ${e.message}")
            }

            // 0. Initialize API client & pre-flight connection check
            val api = try {
                ApiClient.getService(context)
            } catch (e: Exception) {
                Log.e("NexoraWorker", "Failed to initialize ApiClient: ${e.message}")
                try {
                    setForeground(createForegroundInfo("Failed to connect: Invalid Server URL"))
                } catch (ex: Exception) {}
                return@withContext Result.failure(workDataOf("error" to "Invalid Server URL"))
            }

            // Test server authentication with a quick empty hash check
            try {
                val pingRes = api.checkHashes(CheckHashesRequest(emptyList()))
                if (pingRes.code() == 401) {
                    Log.e("NexoraWorker", "Auth token rejected by server (HTTP 401)")
                    try {
                        setForeground(createForegroundInfo("Backup paused: Invalid or Expired JWT Auth Token"))
                    } catch (ex: Exception) {}
                    return@withContext Result.failure(workDataOf("error" to "Invalid or Expired JWT Auth Token (401)"))
                }
            } catch (e: Exception) {
                Log.e("NexoraWorker", "Cannot connect to server: ${e.message}")
                try {
                    setForeground(createForegroundInfo("Backup paused: Cannot reach ${prefs.serverUrl}"))
                } catch (ex: Exception) {}
                return@withContext Result.failure(workDataOf("error" to "Cannot reach server: ${e.message}"))
            }

            // 1. Scan DCIM/Camera media
            try {
                setForeground(createForegroundInfo("Scanning camera media..."))
            } catch (e: Exception) {}

            val scannedMedia = MediaScannerUtils.scanCameraMedia(context)
            Log.d("NexoraWorker", "Scanned ${scannedMedia.size} camera files.")

            if (scannedMedia.isEmpty()) {
                try {
                    setForeground(createForegroundInfo("No media files found to backup"))
                } catch (e: Exception) {}
                return@withContext Result.success()
            }

            // 2. Identify new or unhashed files, reusing existing Room DB hashes
            val itemsToProcess = mutableListOf<BackupEntity>()
            val totalScanned = scannedMedia.size

            for ((idx, scanned) in scannedMedia.withIndex()) {
                try {
                    // Check if already known in local DB (by URI, direct path, or filename+size)
                    val existing = dao.getByFilePath(scanned.uri.toString())
                        ?: (if (scanned.filePath.isNotEmpty()) dao.getByFilePath(scanned.filePath) else null)
                        ?: dao.getByFileNameAndSize(scanned.fileName, scanned.size)

                    if (existing != null && existing.sha256Hash.isNotEmpty()) {
                        if (!existing.isUploaded) {
                            itemsToProcess.add(existing)
                        }
                        continue
                    }

                    // For newly discovered files, compute hash (update notification periodically)
                    if (idx % 25 == 0 || idx == totalScanned - 1) {
                        try {
                            setForeground(
                                createForegroundInfo("Indexing media (${idx + 1}/$totalScanned)...", idx + 1, totalScanned)
                            )
                        } catch (e: Exception) {}
                    }

                    val hash = HashUtils.getMediaHash(context, scanned.uri, scanned.filePath)
                    if (hash.isEmpty()) {
                        Log.w("NexoraWorker", "Could not compute hash for ${scanned.fileName}")
                        continue
                    }

                    // Check if this hash already exists (e.g. file was renamed/moved)
                    val existingByHash = dao.getByHash(hash)
                    if (existingByHash != null) {
                        if (!existingByHash.isUploaded) {
                            itemsToProcess.add(existingByHash)
                        }
                        continue
                    }

                    val entity = BackupEntity(
                        filePath = scanned.uri.toString(),
                        fileName = scanned.fileName,
                        sha256Hash = hash,
                        fileSize = scanned.size,
                        mimeType = scanned.mimeType,
                        isUploaded = false
                    )
                    dao.insert(entity)
                    itemsToProcess.add(entity)
                } catch (e: Exception) {
                    Log.w("NexoraWorker", "Error indexing ${scanned.fileName}: ${e.message}")
                }
            }

            if (itemsToProcess.isEmpty()) {
                Log.d("NexoraWorker", "All items are already backed up.")
                prefs.lastSyncTimestamp = System.currentTimeMillis()
                try {
                    setForeground(createForegroundInfo("All camera files are up to date!"))
                } catch (e: Exception) {}
                return@withContext Result.success()
            }

            // 3. Fast Server Deduplication Check (in chunks of 500)
            val allHashesToCheck = itemsToProcess.map { it.sha256Hash }.distinct()
            val neededHashesSet = mutableSetOf<String>()

            for (chunk in allHashesToCheck.chunked(500)) {
                try {
                    val checkRes = api.checkHashes(CheckHashesRequest(chunk))
                    if (checkRes.isSuccessful && checkRes.body() != null) {
                        val body = checkRes.body()!!
                        if (body.existingHashes.isNotEmpty()) {
                            dao.markAllUploaded(body.existingHashes)
                        }
                        neededHashesSet.addAll(body.neededHashes)
                    } else if (checkRes.code() == 401) {
                        Log.e("NexoraWorker", "Auth token rejected during hash check (401)")
                        return@withContext Result.failure(workDataOf("error" to "Auth token rejected (401)"))
                    } else {
                        neededHashesSet.addAll(chunk)
                    }
                } catch (e: Exception) {
                    Log.w("NexoraWorker", "checkHashes network error: ${e.message}")
                    neededHashesSet.addAll(chunk)
                }
            }

            val queueToUpload = itemsToProcess.filter { neededHashesSet.contains(it.sha256Hash) }
            Log.d("NexoraWorker", "${queueToUpload.size} files queued for upload.")

            if (queueToUpload.isEmpty()) {
                Log.d("NexoraWorker", "All files verified as backed up on server.")
                prefs.lastSyncTimestamp = System.currentTimeMillis()
                try {
                    setForeground(createForegroundInfo("All camera files verified backed up!"))
                } catch (e: Exception) {}
                return@withContext Result.success()
            }

            // 4. Upload files sequentially with accurate progress
            var uploadedCount = 0
            var failedCount = 0
            var lastErrorMessage = ""
            val totalToUpload = queueToUpload.size

            for ((index, item) in queueToUpload.withIndex()) {
                val currentFileNumber = index + 1
                try {
                    try {
                        setForeground(
                            createForegroundInfo(
                                "Uploading ${item.fileName} ($currentFileNumber/$totalToUpload)",
                                currentFileNumber,
                                totalToUpload
                            )
                        )
                    } catch (e: Exception) {
                        // Ignore notification update errors
                    }

                    val mediaType = (item.mimeType.ifEmpty { "application/octet-stream" }).toMediaTypeOrNull()
                    val reqBody = createMediaRequestBody(item, mediaType)

                    val safeFileName = File(item.fileName).name.replace("\"", "")
                    val filePart = MultipartBody.Part.createFormData("file", safeFileName, reqBody)
                    val folderReq = prefs.targetFolder.toRequestBody("text/plain".toMediaTypeOrNull())
                    val hashReq = item.sha256Hash.toRequestBody("text/plain".toMediaTypeOrNull())

                    val uploadRes = api.uploadMedia(filePart, folderReq, hashReq)
                    if (uploadRes.isSuccessful) {
                        dao.markUploaded(item.sha256Hash)
                        uploadedCount++
                        Log.d("NexoraWorker", "Uploaded ${item.fileName} ($currentFileNumber/$totalToUpload) successfully.")
                    } else {
                        failedCount++
                        val code = uploadRes.code()
                        lastErrorMessage = "HTTP $code ${uploadRes.message()}"
                        Log.w("NexoraWorker", "Upload failed for ${item.fileName}: HTTP $code")

                        // If auth token expired, do not hammer server for remaining files
                        if (code == 401) {
                            try {
                                setForeground(createForegroundInfo("Backup paused: Invalid or Expired Auth Token (401)"))
                            } catch (e: Exception) {}
                            return@withContext Result.failure(workDataOf("error" to "Invalid Auth Token (401)"))
                        }
                    }
                } catch (e: Exception) {
                    failedCount++
                    lastErrorMessage = e.message ?: "Connection error"
                    Log.e("NexoraWorker", "Error uploading file ${item.fileName}: ${e.message}", e)
                }
            }

            if (uploadedCount > 0) {
                prefs.lastSyncTimestamp = System.currentTimeMillis()
            }

            Log.d("NexoraWorker", "Backup finished. Uploaded $uploadedCount, failed $failedCount.")

            if (failedCount > 0 && uploadedCount == 0) {
                try {
                    setForeground(createForegroundInfo("Backup failed for $failedCount files ($lastErrorMessage)"))
                } catch (e: Exception) {}
                Result.failure(workDataOf("error" to "Upload failed ($lastErrorMessage)"))
            } else {
                try {
                    setForeground(createForegroundInfo("Backup complete: $uploadedCount uploaded"))
                } catch (e: Exception) {}
                Result.success(workDataOf("uploaded" to uploadedCount, "failed" to failedCount))
            }
        } catch (e: Exception) {
            Log.e("NexoraWorker", "Error during backup execution", e)
            Result.failure(workDataOf("error" to (e.message ?: "Backup execution error")))
        }
    }

    private fun createMediaRequestBody(
        item: BackupEntity,
        mediaType: MediaType?
    ): RequestBody {
        // If content URI, stream directly via ContentResolver
        if (item.filePath.startsWith("content://")) {
            val uri = Uri.parse(item.filePath)
            return ContentUriRequestBody(
                contentResolver = context.contentResolver,
                uri = uri,
                contentType = mediaType
            )
        }

        // Direct file fallback
        val directFile = File(item.filePath)
        if (directFile.exists() && directFile.isFile && directFile.canRead()) {
            return directFile.asRequestBody(mediaType)
        }

        // URI fallback
        val uri = Uri.parse(item.filePath)
        return ContentUriRequestBody(
            contentResolver = context.contentResolver,
            uri = uri,
            contentType = mediaType
        )
    }

    private fun createForegroundInfo(progressText: String, current: Int = 0, total: Int = 0): ForegroundInfo {
        val builder = NotificationCompat.Builder(context, NexoraApp.CHANNEL_ID)
            .setContentTitle("Nexora Camera Backup")
            .setContentText(progressText)
            .setSmallIcon(R.drawable.ic_sync_notification)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (total > 0) {
            builder.setProgress(total, current, false)
        } else {
            builder.setProgress(0, 0, true)
        }

        val notification = builder.build()

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(1001, notification)
        }
    }
}

