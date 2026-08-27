package com.nexora.backup.utils

import android.content.Context
import android.net.Uri
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.security.MessageDigest

object HashUtils {

    fun calculateSHA256(inputStream: InputStream): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val buffer = ByteArray(65536)
            inputStream.use { fis ->
                var read: Int
                while (fis.read(buffer).also { read = it } != -1) {
                    digest.update(buffer, 0, read)
                }
            }
            val hashBytes = digest.digest()
            val sb = StringBuilder()
            for (b in hashBytes) {
                sb.append(String.format("%02x", b))
            }
            sb.toString()
        } catch (e: Exception) {
            Log.w("HashUtils", "Failed to compute SHA256 from stream: ${e.message}")
            ""
        }
    }

    fun calculateSHA256(file: File): String {
        return try {
            if (!file.exists() || !file.isFile || !file.canRead()) {
                ""
            } else {
                calculateSHA256(FileInputStream(file))
            }
        } catch (e: Exception) {
            ""
        }
    }

    fun getMediaHash(context: Context, uri: Uri, directPath: String = ""): String {
        // 1. First try ContentResolver (100% Scoped Storage compliant across Android 10-15)
        try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val hash = calculateSHA256(stream)
                if (hash.isNotEmpty()) return hash
            }
        } catch (e: Exception) {
            Log.w("HashUtils", "ContentResolver stream failed for $uri: ${e.message}")
        }

        // 2. Fallback to direct File if readable
        if (directPath.isNotEmpty()) {
            try {
                val file = File(directPath)
                if (file.exists() && file.isFile && file.canRead()) {
                    val hash = calculateSHA256(file)
                    if (hash.isNotEmpty()) return hash
                }
            } catch (e: Exception) {
                Log.w("HashUtils", "Direct file stream failed for $directPath: ${e.message}")
            }
        }

        return ""
    }
}

