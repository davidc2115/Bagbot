package com.bagbot.manager

import android.content.Context
import android.content.Intent
import android.net.Uri

object ExternalBrowser {
    private var context: Context? = null
    
    fun init(ctx: Context) {
        context = ctx.applicationContext
    }
    
    fun open(url: String) {
        context?.let { ctx ->
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
        }
    }
}
