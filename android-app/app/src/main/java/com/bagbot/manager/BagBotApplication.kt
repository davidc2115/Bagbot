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
        // Client HTTP avec timeout augmenté mais SANS intercepteur Discord
        // (pour tester si l'intercepteur est le problème)
        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
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
                    .maxSizePercent(0.30) // 30% de la RAM
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(100 * 1024 * 1024) // 100 MB
                    .build()
            }
            .crossfade(true)
            .respectCacheHeaders(false) // Ignorer les headers d'expiration
            .build()
    }
}
