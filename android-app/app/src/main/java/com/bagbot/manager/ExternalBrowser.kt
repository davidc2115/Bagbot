package com.bagbot.manager

import android.content.Intent
import android.net.Uri

/**
 * Small indirection so we don't need to pass an Android Context everywhere.
 * MainActivity will set it on start.
 */
object ExternalBrowser {
  @Volatile private var starter: ((Intent) -> Unit)? = null

  fun bind(startActivity: (Intent) -> Unit) {
    starter = startActivity
  }

  fun open(url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    starter?.invoke(intent)
  }
}

