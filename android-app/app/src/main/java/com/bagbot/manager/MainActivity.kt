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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
  private val deepLinkState = mutableStateOf<Uri?>(null)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    ExternalBrowser.bind { startActivity(it) }
    deepLinkState.value = intent?.data

    setContent {
      Surface(color = MaterialTheme.colorScheme.background) {
        Box(Modifier.fillMaxSize()) {
          App(deepLinkState.value, onDeepLinkConsumed = { deepLinkState.value = null })
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    deepLinkState.value = intent.data
  }
}

