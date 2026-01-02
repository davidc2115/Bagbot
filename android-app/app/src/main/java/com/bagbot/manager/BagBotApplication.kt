package com.bagbot.manager

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.disk.DiskCache
import coil.memory.MemoryCache
import android.os.Build
import okhttp3.OkHttpClient
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit

class BagBotApplication : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader {
        // Intercepteur pour ajouter les headers Discord
        val discordHeadersInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()
            val url = originalRequest.url.toString()
            
            // Ajouter headers seulement pour Discord CDN
            val newRequest = if (url.contains("cdn.discord")) {
                originalRequest.newBuilder()
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept", "image/webp,image/apng,image/*,*/*;q=0.8")
                    .header("Accept-Language", "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
                    .header("Referer", "https://discord.com/")
                    .header("Sec-Fetch-Dest", "image")
                    .header("Sec-Fetch-Mode", "no-cors")
                    .header("Sec-Fetch-Site", "cross-site")
                    .build()
            } else {
                originalRequest
            }
            
            chain.proceed(newRequest)
        }
        
        // Client HTTP configuré pour Discord CDN
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(discordHeadersInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
        
        return ImageLoader.Builder(this)
            .components {
                // Ajouter le support GIF
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
            }
            .okHttpClient(okHttpClient)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25) // 25% de la RAM
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(50 * 1024 * 1024) // 50 MB
                    .build()
            }
            .crossfade(true)
            .respectCacheHeaders(false) // Ignorer les headers d'expiration
            .build()
    }
}
