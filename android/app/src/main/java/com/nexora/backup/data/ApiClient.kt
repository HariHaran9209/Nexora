package com.nexora.backup.data

import android.content.Context
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    fun getService(context: Context): NexoraApiService {
        val prefs = PreferenceManager(context)
        var rawUrl = prefs.serverUrl.trim()
        if (rawUrl.isEmpty()) {
            rawUrl = "http://127.0.0.1:5000"
        }
        if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
            rawUrl = "http://$rawUrl"
        }
        val baseUrl = if (rawUrl.endsWith("/")) rawUrl else "$rawUrl/"
        val validBaseUrl = baseUrl.toHttpUrlOrNull()?.toString() ?: "http://127.0.0.1:5000/"

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()

            var token = prefs.authToken.trim()
            // Strip quotes and Bearer prefix if user copied raw header or JSON value
            token = token.trim('"', '\'')
            if (token.startsWith("Bearer ", ignoreCase = true)) {
                token = token.substring(7).trim()
            }

            if (token.isNotEmpty()) {
                requestBuilder.header("Authorization", "Bearer $token")
            }

            chain.proceed(requestBuilder.build())
        }

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(300, TimeUnit.SECONDS)
            .writeTimeout(300, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(validBaseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(NexoraApiService::class.java)
    }
}
