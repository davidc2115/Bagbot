package com.bagbot.manager

import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backup
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun App(deepLink: Uri?, onDeepLinkConsumed: () -> Unit) {
  val scope = rememberCoroutineScope()
  val snackbar = remember { SnackbarHostState() }

  val context = LocalContext.current
  val store = remember(context) { SettingsStore(context) }
  val api = remember { ApiClient(store) }

  val baseUrl = remember { mutableStateOf(store.getBaseUrl()) }
  val token = remember { mutableStateOf(store.getToken()) }
  val tab = remember { mutableStateOf(0) } // 0 Home, 1 Configurer, 2 Backups, 3 Settings

  val busy = remember { mutableStateOf(false) }
  val statusJson = remember { mutableStateOf<String?>(null) }
  val meJson = remember { mutableStateOf<String?>(null) }
  val configJson = remember { mutableStateOf<String?>(null) }
  val configEdit = remember { mutableStateOf("") }

  val sectionKey = remember { mutableStateOf<String?>(null) }
  val sectionEdit = remember { mutableStateOf("") }

  val backups = remember { mutableStateOf<List<BackupItem>>(emptyList()) }

  val json = remember { Json { ignoreUnknownKeys = true } }

  fun ensureBaseUrlOrWarn(): Boolean {
    val b = baseUrl.value.trim().removeSuffix("/")
    if (b.isBlank()) {
      scope.launch { snackbar.showSnackbar("Renseigne l'URL du dashboard dans Paramètres") }
      return false
    }
    return true
  }

  fun currentConfigObject(): JsonObject? {
    val s = configJson.value ?: return null
    return try { json.parseToJsonElement(s).jsonObject } catch (_: Exception) { null }
  }

  fun prettyPrint(el: kotlinx.serialization.json.JsonElement): String {
    return Json { prettyPrint = true }.encodeToString(kotlinx.serialization.json.JsonElement.serializer(), el)
  }

  fun saveFullConfig(newConfigJson: String) {
    scope.launch {
      if (!ensureBaseUrlOrWarn()) return@launch
      busy.value = true
      try {
        JsonUtil.parseObject(newConfigJson)
        withContext(Dispatchers.IO) {
          api.putJson("/api/configs", newConfigJson)
        }
        configJson.value = newConfigJson
        configEdit.value = newConfigJson
        snackbar.showSnackbar("Config sauvegardée")
      } catch (e: Exception) {
        snackbar.showSnackbar("Erreur: ${e.message}")
      } finally {
        busy.value = false
      }
    }
  }

  fun openSection(key: String) {
    if (key == "__full__") {
      val s = configJson.value
      if (s.isNullOrBlank()) {
        scope.launch { snackbar.showSnackbar("Config non chargée") }
        return
      }
      sectionKey.value = key
      sectionEdit.value = s
      return
    }
    val cfg = currentConfigObject() ?: run {
      scope.launch { snackbar.showSnackbar("Config non chargée") }
      return
    }
    val el = cfg[key] ?: JsonObject(emptyMap())
    sectionKey.value = key
    sectionEdit.value = prettyPrint(el)
  }

  fun saveSection(key: String, newSectionJson: String) {
    val cfg = currentConfigObject() ?: run {
      scope.launch { snackbar.showSnackbar("Config non chargée") }
      return
    }
    if (key == "__full__") {
      saveFullConfig(newSectionJson)
      sectionKey.value = null
      return
    }
    try {
      val newEl = json.parseToJsonElement(newSectionJson)
      val root = cfg.toMutableMap()
      root[key] = newEl
      val newJson = Json { prettyPrint = true }.encodeToString(kotlinx.serialization.json.JsonObject.serializer(), JsonObject(root))
      saveFullConfig(newJson)
      sectionKey.value = null
    } catch (e: Exception) {
      scope.launch { snackbar.showSnackbar("JSON invalide: ${e.message}") }
    }
  }

  fun refreshAll() {
    scope.launch {
      if (!ensureBaseUrlOrWarn()) return@launch
      busy.value = true
      try {
        val (st, me, cfg) = withContext(Dispatchers.IO) {
          Triple(
            api.getJson("/api/bot/status"),
            api.getJson("/api/me"),
            api.getJson("/api/configs")
          )
        }
        statusJson.value = st
        meJson.value = me
        configJson.value = cfg
        configEdit.value = configJson.value ?: ""
      } catch (e: Exception) {
        snackbar.showSnackbar("Erreur: ${e.message}")
      } finally {
        busy.value = false
      }
    }
  }

  fun refreshBackups() {
    scope.launch {
      if (!ensureBaseUrlOrWarn()) return@launch
      busy.value = true
      try {
        val raw = withContext(Dispatchers.IO) { api.getJson("/backups") }
        val obj = json.parseToJsonElement(raw).jsonObject
        val arr = obj["backups"]
        val list = if (arr is JsonArray) {
          arr.mapNotNull { el ->
            val o = el.jsonObject
            val filename = (o["filename"] as? JsonPrimitive)?.content ?: return@mapNotNull null
            BackupItem(
              filename = filename,
              displayName = (o["displayName"] as? JsonPrimitive)?.content ?: filename,
              date = (o["date"] as? JsonPrimitive)?.content ?: "",
              size = (o["size"] as? JsonPrimitive)?.content ?: ""
            )
          }
        } else emptyList()
        backups.value = list
      } catch (e: Exception) {
        snackbar.showSnackbar("Erreur backups: ${e.message}")
      } finally {
        busy.value = false
      }
    }
  }

  fun login() {
    val url = baseUrl.value.trim().removeSuffix("/")
    if (url.isBlank()) {
      scope.launch { snackbar.showSnackbar("Renseigne l'URL du dashboard (ex: http://88.174.155.230:33002)") }
      return
    }
    store.setBaseUrl(url)
    baseUrl.value = url
    ExternalBrowser.open("$url/auth/mobile/start?app_redirect=bagbot://auth")
  }

  // Deep link: bagbot://auth?token=...
  LaunchedEffect(deepLink) {
    if (deepLink == null) return@LaunchedEffect
    val t = deepLink.getQueryParameter("token")
    if (!t.isNullOrBlank()) {
      store.setToken(t.trim())
      token.value = t.trim()
      scope.launch { snackbar.showSnackbar("Connecté") }
      onDeepLinkConsumed()
      refreshAll()
    }
  }

  LaunchedEffect(token.value, baseUrl.value) {
    if (!token.value.isNullOrBlank() && !baseUrl.value.isNullOrBlank()) {
      refreshAll()
    }
  }

  // Auto-load config when entering "Configurer"
  LaunchedEffect(tab.value, token.value, baseUrl.value) {
    if (token.value.isNotBlank() && tab.value == 1 && configJson.value.isNullOrBlank()) {
      refreshAll()
    }
  }

  val connected = token.value.isNotBlank()

  Scaffold(
    topBar = { TopAppBar(title = { Text("BAG Bot Manager") }) },
    bottomBar = {
      if (connected) {
        NavigationBar {
          NavigationBarItem(
            selected = tab.value == 0,
            onClick = { tab.value = 0 },
            icon = { Icon(Icons.Default.Home, contentDescription = null) },
            label = { Text("Accueil") }
          )
          NavigationBarItem(
            selected = tab.value == 1,
            onClick = { tab.value = 1 },
            icon = { Icon(Icons.Default.List, contentDescription = null) },
            label = { Text("Configurer") }
          )
          NavigationBarItem(
            selected = tab.value == 2,
            onClick = { tab.value = 2 },
            icon = { Icon(Icons.Default.Backup, contentDescription = null) },
            label = { Text("Backups") }
          )
          NavigationBarItem(
            selected = tab.value == 3,
            onClick = { tab.value = 3 },
            icon = { Icon(Icons.Default.Settings, contentDescription = null) },
            label = { Text("Paramètres") }
          )
        }
      }
    },
    snackbarHost = { SnackbarHost(snackbar) }
  ) { padding ->
    Box(
      modifier = Modifier
        .padding(padding)
        .fillMaxSize()
    ) {
      if (!connected) {
        Column(
          modifier = Modifier
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
              Text("Connexion", style = MaterialTheme.typography.titleMedium)
              OutlinedTextField(
                value = baseUrl.value,
                onValueChange = { baseUrl.value = it },
                label = { Text("URL Dashboard") },
                placeholder = { Text("http://88.174.155.230:33002") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
              )
              Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = { login() }) { Text("Connexion Discord") }
                OutlinedButton(onClick = {
                  store.setToken("")
                  token.value = ""
                  scope.launch { snackbar.showSnackbar("Token effacé") }
                }) { Text("Effacer token") }
              }
              Text("Après autorisation, appuie sur « Ouvrir l'app » si nécessaire.", style = MaterialTheme.typography.bodySmall)
            }
          }
        }
      } else {
        if (baseUrl.value.trim().isBlank()) {
          Column(
            modifier = Modifier
              .padding(16.dp)
              .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
          ) {
            Text("Paramètres requis", style = MaterialTheme.typography.titleLarge)
            Text("L'URL du dashboard est vide. Renseigne-la dans Paramètres.", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              Button(onClick = { tab.value = 3 }) { Text("Aller aux paramètres") }
              OutlinedButton(onClick = {
                store.setToken("")
                token.value = ""
                scope.launch { snackbar.showSnackbar("Déconnecté") }
              }) { Text("Se déconnecter") }
            }
          }
        } else {
          if (busy.value) {
            Row(
              modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
              horizontalArrangement = Arrangement.Center
            ) {
              CircularProgressIndicator()
            }
          }

          when (tab.value) {
          0 -> {
            Column(
              modifier = Modifier
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
              verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
              Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = { refreshAll() }) { Text("Rafraîchir") }
                Button(onClick = {
                  scope.launch {
                    busy.value = true
                    try {
                      withContext(Dispatchers.IO) {
                        api.postJson("/bot/control", """{"action":"restart"}""")
                      }
                      snackbar.showSnackbar("Restart envoyé")
                    } catch (e: Exception) {
                      snackbar.showSnackbar("Erreur: ${e.message}")
                    } finally {
                      busy.value = false
                    }
                  }
                }) { Text("Restart") }
                OutlinedButton(onClick = {
                  scope.launch {
                    busy.value = true
                    try {
                      withContext(Dispatchers.IO) {
                        api.postJson("/bot/control", """{"action":"deploy"}""")
                      }
                      snackbar.showSnackbar("Déploiement commandes lancé")
                    } catch (e: Exception) {
                      snackbar.showSnackbar("Erreur: ${e.message}")
                    } finally {
                      busy.value = false
                    }
                  }
                }) { Text("Deploy cmd") }
              }

              Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                  Text("Compte", style = MaterialTheme.typography.titleMedium)
                  Text(meJson.value ?: "—", fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                }
              }

              Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                  Text("Statut bot", style = MaterialTheme.typography.titleMedium)
                  Text(statusJson.value ?: "—", fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                }
              }
            }
          }

          1 -> {
            val key = sectionKey.value
            if (key != null) {
              val isFull = key == "__full__"
              Column(
                modifier = Modifier
                  .padding(16.dp)
                  .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
              ) {
                Card(Modifier.fillMaxWidth()) {
                  Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (isFull) "Éditeur complet" else "Section: $key", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(
                      value = sectionEdit.value,
                      onValueChange = { sectionEdit.value = it },
                      modifier = Modifier
                        .fillMaxWidth()
                        .height(320.dp),
                      label = { Text(if (isFull) "JSON complet" else "JSON") },
                      textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                      Button(onClick = { saveSection(key, sectionEdit.value) }) { Text("Sauvegarder") }
                      OutlinedButton(onClick = { sectionKey.value = null }) { Text("Retour") }
                    }
                  }
                }
              }
            } else {
              val cfg = currentConfigObject()
              if (cfg == null) {
                Column(
                  modifier = Modifier
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                  verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                  Text("Configuration", style = MaterialTheme.typography.titleLarge)
                  Text("Config non chargée.", style = MaterialTheme.typography.bodySmall)
                  Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { refreshAll() }) { Text("Charger") }
                    OutlinedButton(onClick = { tab.value = 3 }) { Text("Paramètres") }
                  }
                }
              } else {
                Column(
                  modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                  verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                  Text("Configuration", style = MaterialTheme.typography.titleLarge)
                  Text("Sélectionne une section (vignettes).", style = MaterialTheme.typography.bodySmall)

                  LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 170.dp),
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                  ) {
                    items(sectionCards()) { item ->
                      val present = cfg.containsKey(item.key)
                      Card(
                        modifier = Modifier
                          .fillMaxWidth()
                          .height(118.dp)
                          .clickable { openSection(item.key) },
                        colors = CardDefaults.cardColors(
                          containerColor = if (present) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        )
                      ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                          Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            Icon(item.icon, contentDescription = null)
                            Column(Modifier.weight(1f)) {
                              Text(item.title, style = MaterialTheme.typography.titleMedium)
                              Text(if (present) "Configuré" else "À configurer", style = MaterialTheme.typography.labelSmall)
                            }
                          }
                          Text(item.subtitle, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          2 -> {
            LaunchedEffect(Unit) { refreshBackups() }
            Column(
              modifier = Modifier
                .padding(16.dp)
                .fillMaxSize(),
              verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
              Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = {
                  scope.launch {
                    busy.value = true
                    try {
                      withContext(Dispatchers.IO) {
                        api.postJson("/backup", "{}")
                      }
                      snackbar.showSnackbar("Backup créé")
                      refreshBackups()
                    } catch (e: Exception) {
                      snackbar.showSnackbar("Erreur: ${e.message}")
                    } finally {
                      busy.value = false
                    }
                  }
                }) { Text("Créer backup") }
                OutlinedButton(onClick = { refreshBackups() }) { Text("Rafraîchir") }
              }

              if (backups.value.isEmpty()) {
                Text("Aucun backup trouvé.", style = MaterialTheme.typography.bodyMedium)
              } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxSize()) {
                  items(backups.value) { b ->
                    Card(Modifier.fillMaxWidth()) {
                      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(b.displayName, style = MaterialTheme.typography.titleMedium)
                        Text("${b.date} • ${b.size}", style = MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                          Button(onClick = {
                            scope.launch {
                              busy.value = true
                              try {
                                withContext(Dispatchers.IO) {
                                  api.postJson("/restore", """{"filename":"${b.filename}"}""")
                                }
                                snackbar.showSnackbar("Restore lancé")
                                refreshAll()
                              } catch (e: Exception) {
                                snackbar.showSnackbar("Erreur: ${e.message}")
                              } finally {
                                busy.value = false
                              }
                            }
                          }) { Text("Restaurer") }
                          Spacer(Modifier.width(1.dp))
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          else -> {
            Column(
              modifier = Modifier
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
              verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
              Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                  Text("Paramètres", style = MaterialTheme.typography.titleMedium)
                  OutlinedTextField(
                    value = baseUrl.value,
                    onValueChange = { baseUrl.value = it },
                    label = { Text("URL Dashboard") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                  )
                  Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = {
                      store.setBaseUrl(baseUrl.value.trim().removeSuffix("/"))
                      scope.launch { snackbar.showSnackbar("URL enregistrée") }
                    }) { Text("Enregistrer") }
                    OutlinedButton(onClick = { refreshAll() }) { Text("Recharger") }
                  }
                }
              }
              Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                  Text("Session", style = MaterialTheme.typography.titleMedium)
                  Text("Token: présent", style = MaterialTheme.typography.bodySmall)
                  Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { login() }) { Text("Se reconnecter") }
                    OutlinedButton(onClick = {
                      store.setToken("")
                      token.value = ""
                      scope.launch { snackbar.showSnackbar("Déconnecté") }
                    }) { Text("Se déconnecter") }
                  }
                }
              }
            }
          }
        }
        }
      }
    }
  }
}

data class BackupItem(
  val filename: String,
  val displayName: String,
  val date: String,
  val size: String
)

data class SectionCard(
  val key: String,
  val title: String,
  val subtitle: String,
  val icon: ImageVector
)

fun sectionCards(): List<SectionCard> = listOf(
  SectionCard("economy", "Économie", "Monnaie, boutique, actions, cooldowns", Icons.Default.Build),
  SectionCard("tickets", "Tickets", "Panel, catégories, réglages", Icons.Default.Notifications),
  SectionCard("confess", "Confess", "Channels, settings, nsfwNames", Icons.Default.Notifications),
  SectionCard("welcome", "Welcome", "Message de bienvenue", Icons.Default.Notifications),
  SectionCard("goodbye", "Goodbye", "Message d'au revoir", Icons.Default.Notifications),
  SectionCard("autokick", "AutoKick / Inactivité", "InactivityKick, tracking", Icons.Default.Build),
  SectionCard("counting", "Counting", "Allow formulas, channels, state", Icons.Default.Build),
  SectionCard("truthdare", "Action/Vérité", "Prompts + channels", Icons.Default.Build),
  SectionCard("actions", "Actions", "Gifs/messages/config", Icons.Default.Build),
  SectionCard("logs", "Logs", "Config logs (via config)", Icons.Default.Build),
  SectionCard("__full__", "Éditeur complet", "Modifier toute la config (fallback)", Icons.Default.List),
)

