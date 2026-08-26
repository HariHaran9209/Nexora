package com.nexora.backup.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "synced_media",
    indices = [Index(value = ["sha256Hash"], unique = true)]
)
data class BackupEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val filePath: String,
    val fileName: String,
    val sha256Hash: String,
    val fileSize: Long,
    val mimeType: String,
    val isUploaded: Boolean = false,
    val uploadedAt: Long = System.currentTimeMillis()
)
