package com.bagbot.manager

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.core.graphics.drawable.toBitmap
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult

object ShortcutUtils {
    private const val SHORTCUT_ID = "bagbot_custom_shortcut"

    suspend fun pinCustomShortcut(
        context: Context,
        label: String,
        logoUrl: String?
    ): Boolean {
        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) return false

        val icon = run {
            val bmp = loadBitmap(context, logoUrl)
            if (bmp != null) IconCompat.createWithBitmap(bmp)
            else IconCompat.createWithResource(context, R.mipmap.ic_launcher)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("bagbot://home")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val shortcut = ShortcutInfoCompat.Builder(context, SHORTCUT_ID)
            .setShortLabel(label.ifBlank { "BAG Bot" })
            .setLongLabel(label.ifBlank { "BAG Bot" })
            .setIcon(icon)
            .setIntent(intent)
            .build()

        return ShortcutManagerCompat.requestPinShortcut(context, shortcut, null)
    }

    private suspend fun loadBitmap(context: Context, url: String?): Bitmap? {
        val u = url?.trim().orEmpty()
        if (u.isBlank()) return null
        return try {
            val loader = ImageLoader(context)
            val req = ImageRequest.Builder(context)
                .data(u)
                .allowHardware(false)
                .build()
            val result = loader.execute(req)
            if (result is SuccessResult) {
                result.drawable.toBitmap()
            } else null
        } catch (_: Exception) {
            null
        }
    }
}

