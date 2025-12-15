package com.bagbot.manager

import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun App(deepLink: Uri?, onDeepLinkConsumed: () -> Unit) {
  val scope = rememberCoroutineScope()
  val snackbar = remember { SnackbarHostState() }

  val store = remember { SettingsStore() }
  val api = remember { ApiClient(store) }

  val baseUrl = remember { mutableStateOf(store.getBaseUrl()) }
  val token = remember { mutableStateOf(store.getToken()) }

  val statusJson = remember { mutableStateOf<String?>(null) }
  val configJson = remember { mutableStateOf<String?>(null) }
  val configEdit = remember { mutableStateOf("") }
  val busy = remember { mutableStateOf(false) }

  // Handle deep link: bagbot://auth?token=...
  LaunchedEffect(deepLink) {
    if (deepLink == null) return@LaunchedEffect
    val t = deepLink.getQueryParameter("token")
    if (!t.isNullOrBlank()) {
      store.setToken(t.trim())
      token.value = t.trim()
      snackbar.showSnackbar("Connecté (token reçu)")
      onDeepLinkConsumed()
    }
  }

  fun login() {
    val url = baseUrl.value.trim().removeSuffix("/")
    if (url.isBlank()) {
      scope.launch { snackbar.showSnackbar("Renseigne l'URL du dashboard (ex: http://192.168.0.10:3002)") }
      return
    }
    store.setBaseUrl(url)
    baseUrl.value = url
    // Open browser to server-driven OAuth flow (server will deep-link back).
    val authUrl = "$url/auth/mobile/start?app_redirect=bagbot://auth"
    ExternalBrowser.open(authUrl)
  }

  fun refreshAll() {
    scope.launch {
      busy.value = true
      try {
        statusJson.value = api.getJson("/api/bot/status")
        configJson.value = api.getJson("/api/configs")
        configEdit.value = configJson.value ?: ""
      } catch (e: Exception) {
        snackbar.showSnackbar("Erreur: ${e.message}")
      } finally {
        busy.value = false
      }
    }
  }

  LaunchedEffect(token.value, baseUrl.value) {
    if (!token.value.isNullOrBlank() && !baseUrl.value.isNullOrBlank()) {
      refreshAll()
    }
  }

  Scaffold(
    topBar = { TopAppBar(title = { Text("BAG Bot Manager") }) },
    snackbarHost = { SnackbarHost(snackbar) }
  ) { padding ->
    Column(
      modifier = Modifier
        .padding(padding)
        .padding(16.dp)
        .verticalScroll(rememberScrollState()),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
          Text("Connexion", style = MaterialTheme.typography.titleMedium)
          OutlinedTextField(
            value = baseUrl.value,
            onValueChange = { baseUrl.value = it },
            label = { Text("URL Dashboard") },
            placeholder = { Text("http://IP_FREEBOX:3002") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
          )
          Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = { login() }) { Text("Connexion Discord") }
            Button(onClick = {
              store.setToken("")
              token.value = ""
              snackbar.currentSnackbarData?.dismiss()
              scope.launch { snackbar.showSnackbar("Déconnecté") }
            }) { Text("Déconnexion") }
          }
          Text(
            "Statut: " + if (token.value.isNullOrBlank()) "non connecté" else "connecté",
            style = MaterialTheme.typography.bodyMedium
          )
          Text(
            "Note: la connexion s'ouvre dans le navigateur (OAuth).",
            style = MaterialTheme.typography.bodySmall
          )
        }
      }

      if (busy.value) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
          CircularProgressIndicator()
        }
      }

      if (!token.value.isNullOrBlank()) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
          Button(onClick = { refreshAll() }) { Text("Rafraîchir") }
          Button(onClick = {
            scope.launch {
              busy.value = true
              try {
                api.postJson("/bot/control", """{"action":"restart"}""")
                snackbar.showSnackbar("Restart envoyé")
              } catch (e: Exception) {
                snackbar.showSnackbar("Erreur: ${e.message}")
              } finally {
                busy.value = false
              }
            }
          }) { Text("Restart bot") }
          Button(onClick = {
            scope.launch {
              busy.value = true
              try {
                api.postJson("/backup", "{}")
                snackbar.showSnackbar("Backup créé")
              } catch (e: Exception) {
                snackbar.showSnackbar("Erreur: ${e.message}")
              } finally {
                busy.value = false
              }
            }
          }) { Text("Backup") }
        }

        Spacer(Modifier.height(6.dp))

        Card(Modifier.fillMaxWidth()) {
          Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Bot status (JSON)", style = MaterialTheme.typography.titleMedium)
            Text(
              statusJson.value ?: "—",
              fontFamily = FontFamily.Monospace,
              style = MaterialTheme.typography.bodySmall
            )
          }
        }

        Card(Modifier.fillMaxWidth()) {
          Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Configuration complète (éditeur JSON)", style = MaterialTheme.typography.titleMedium)
            Text(
              "Tu peux modifier toute la config du bot ici. Sauvegarde = PUT /api/configs.",
              style = MaterialTheme.typography.bodySmall
            )
            OutlinedTextField(
              value = configEdit.value,
              onValueChange = { configEdit.value = it },
              modifier = Modifier
                .fillMaxWidth()
                .height(280.dp),
              label = { Text("Guild config JSON") },
              textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              Button(onClick = {
                scope.launch {
                  busy.value = true
                  try {
                    // Validate JSON locally (basic)
                    JsonUtil.parseObject(configEdit.value)
                    api.putJson("/api/configs", configEdit.value)
                    snackbar.showSnackbar("Config sauvegardée")
                    configJson.value = configEdit.value
                  } catch (e: Exception) {
                    snackbar.showSnackbar("Erreur: ${e.message}")
                  } finally {
                    busy.value = false
                  }
                }
              }) { Text("Sauvegarder") }
              Button(onClick = { configEdit.value = configJson.value ?: "" }) { Text("Annuler") }
            }
          }
        }
      }
    }
  }
}

