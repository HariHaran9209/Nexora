package com.nexora.backup.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

data class CheckHashesRequest(
    val hashes: List<String>
)

data class CheckHashesResponse(
    val success: Boolean,
    val existingHashes: List<String>,
    val neededHashes: List<String>
)

data class LoginRequest(
    val identifier: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val token: String,
    val user: UserDto?
)

data class UserDto(
    val id: String,
    val username: String,
    val email: String
)

interface NexoraApiService {

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/sync/android/check-hashes")
    suspend fun checkHashes(@Body request: CheckHashesRequest): Response<CheckHashesResponse>

    @Multipart
    @POST("api/sync/android/upload")
    suspend fun uploadMedia(
        @Part file: MultipartBody.Part,
        @Part("folderName") folderName: RequestBody,
        @Part("clientHash") clientHash: RequestBody
    ): Response<ResponseBody>
}
