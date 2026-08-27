package com.nexora.backup.utils

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import java.io.File

data class ScannedMediaItem(
    val uri: Uri,
    val filePath: String,
    val fileName: String,
    val size: Long,
    val mimeType: String,
    val dateAdded: Long
)

object MediaScannerUtils {

    fun scanCameraMedia(context: Context): List<ScannedMediaItem> {
        val items = mutableListOf<ScannedMediaItem>()

        // 1. Scan Images
        scanMediaCollection(
            context = context,
            contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            defaultMime = "image/jpeg",
            items = items
        )

        // 2. Scan Videos
        scanMediaCollection(
            context = context,
            contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            defaultMime = "video/mp4",
            items = items
        )

        return items
    }

    private fun scanMediaCollection(
        context: Context,
        contentUri: Uri,
        defaultMime: String,
        items: MutableList<ScannedMediaItem>
    ) {
        val projection = arrayOf(
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.MIME_TYPE,
            MediaStore.MediaColumns.DATE_ADDED,
            MediaStore.MediaColumns.DATA
        )

        val sortOrder = "${MediaStore.MediaColumns.DATE_ADDED} DESC"

        try {
            context.contentResolver.query(
                contentUri,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
                val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
                val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_ADDED)
                val dataCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)

                while (cursor.moveToNext()) {
                    try {
                        val id = if (idCol >= 0) cursor.getLong(idCol) else continue
                        val uri = ContentUris.withAppendedId(contentUri, id)

                        val directPath = if (dataCol >= 0) (cursor.getString(dataCol) ?: "") else ""
                        val displayName = if (nameCol >= 0) (cursor.getString(nameCol) ?: "") else ""
                        var size = if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L
                        val mime = if (mimeCol >= 0) (cursor.getString(mimeCol) ?: defaultMime) else defaultMime
                        val dateAdded = if (dateCol >= 0) cursor.getLong(dateCol) else System.currentTimeMillis() / 1000

                        val finalName = when {
                            displayName.isNotEmpty() -> displayName
                            directPath.isNotEmpty() -> File(directPath).name
                            else -> "media_$id.${if (defaultMime.contains("video")) "mp4" else "jpg"}"
                        }

                        // Size fallback if MediaStore returned 0
                        if (size <= 0L && directPath.isNotEmpty()) {
                            try {
                                val f = File(directPath)
                                if (f.exists() && f.isFile) {
                                    size = f.length()
                                }
                            } catch (e: Exception) {}
                        }

                        if (size <= 0L) {
                            try {
                                context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { afd ->
                                    size = afd.length
                                }
                            } catch (e: Exception) {}
                        }

                        items.add(
                            ScannedMediaItem(
                                uri = uri,
                                filePath = directPath,
                                fileName = finalName,
                                size = if (size > 0) size else 0L,
                                mimeType = mime,
                                dateAdded = dateAdded
                            )
                        )
                    } catch (e: Exception) {
                        Log.w("MediaScannerUtils", "Skipping individual item due to error: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("MediaScannerUtils", "Error querying collection $contentUri", e)
        }
    }
}

