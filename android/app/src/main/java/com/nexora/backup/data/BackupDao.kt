package com.nexora.backup.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface BackupDao {

    @Query("SELECT * FROM synced_media WHERE sha256Hash = :hash LIMIT 1")
    suspend fun getByHash(hash: String): BackupEntity?

    @Query("SELECT * FROM synced_media WHERE filePath = :filePath LIMIT 1")
    suspend fun getByFilePath(filePath: String): BackupEntity?

    @Query("SELECT * FROM synced_media WHERE fileName = :fileName AND fileSize = :fileSize LIMIT 1")
    suspend fun getByFileNameAndSize(fileName: String, fileSize: Long): BackupEntity?

    @Query("SELECT sha256Hash FROM synced_media WHERE isUploaded = 1")
    suspend fun getAllUploadedHashes(): List<String>

    @Query("SELECT COUNT(*) FROM synced_media WHERE isUploaded = 1")
    suspend fun getUploadedCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: BackupEntity): Long

    @Query("UPDATE synced_media SET isUploaded = 1, uploadedAt = :timestamp WHERE sha256Hash = :hash")
    suspend fun markUploaded(hash: String, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE synced_media SET isUploaded = 1, uploadedAt = :timestamp WHERE sha256Hash IN (:hashes)")
    suspend fun markAllUploaded(hashes: List<String>, timestamp: Long = System.currentTimeMillis())
}
