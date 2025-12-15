package com.bagbot.manager

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    ExternalBrowser.bind { startActivity(it) }

    setContent {
      val deepLink = remember { mutableStateOf<Uri?>(null) }

      LaunchedEffect(Unit) {
        deepLink.value = intent?.data
      }

      Surface(color = MaterialTheme.colorScheme.background) {
        Box(Modifier.fillMaxSize()) {
          App(deepLink.value, onDeepLinkConsumed = { deepLink.value = null })
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}

