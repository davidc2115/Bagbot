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
import java.util.concurrent.TimeUnit

class BagBotApplication : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader {
        // Client HTTP configuré pour Discord CDN
        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
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
            .respectCacheHeaders(false) // Ignorer les headers d'expiration pour les URLs Discord
            .build()
    }
}
