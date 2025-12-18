@file:OptIn(ExperimentalMaterial3Api::class)

package com.bagbot.manager

import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
import com.bagbot.manager.ui.theme.BagBotTheme
import com.bagbot.manager.ui.screens.SplashScreen
import com.bagbot.manager.ui.screens.AdminScreen

@Composable
fun App(deepLink: Uri?, onDeepLinkConsumed: () -> Unit) {
    val context = LocalContext.current
    val store = remember { SettingsStore.getInstance(context) }
    val api = remember { ApiClient(store) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

    val baseUrl = remember { mutableStateOf(store.getBaseUrl()) }
    val token = remember { mutableStateOf(store.getToken()) }
    val tab = remember { mutableStateOf(0) }
    val isFounder = remember { mutableStateOf(false) }
    val showSplash = remember { mutableStateOf(true) }
    val members = remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    
    val botOnline = remember { mutableStateOf(false) }
    val configData = remember { mutableStateOf<JsonObject?>(null) }
    val isLoading = remember { mutableStateOf(false) }
    val errorMessage = remember { mutableStateOf<String?>(null) }
    val channels = remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    val roles = remember { mutableStateOf<Map<String, String>>(emptyMap()) }

    val json = remember { Json { ignoreUnknownKeys = true; coerceInputValues = true } }

    LaunchedEffect(deepLink) {
        if (deepLink == null) return@LaunchedEffect
        val t = deepLink.getQueryParameter("token")
        if (!t.isNullOrBlank()) {
            store.setToken(t.trim())
            token.value = t.trim()
            snackbar.showSnackbar("✅ Connecté")
            onDeepLinkConsumed()
        }
    }

    LaunchedEffect(token.value, baseUrl.value) {
        if (!token.value.isNullOrBlank() && !baseUrl.value.isNullOrBlank()) {
            isLoading.value = true
            errorMessage.value = null
            try {
                // Récupérer infos utilisateur
                try {
                    val meJson = api.getJson("/api/me")
                    val me = json.parseToJsonElement(meJson).jsonObject
                    isFounder.value = me["userId"]?.jsonPrimitive?.content == "943487722738311219"
                } catch (e: Exception) {
                    errorMessage.value = "Auth: ${e.message}"
                }
                
                // Récupérer statut du bot
                try {
                    val statusJson = api.getJson("/api/bot/status")
                    botOnline.value = statusJson.contains("online") || statusJson.contains("true")
                } catch (e: Exception) {
                    botOnline.value = false
                }
                
                // Récupérer membres
                try {
                    val membersJson = api.getJson("/api/discord/members")
                    val membersData = json.parseToJsonElement(membersJson).jsonObject
                    // L API retourne {"names": {...}, "roles": {...}}
                    members.value = membersData["names"]?.jsonObject?.mapValues { it.value.jsonPrimitive.content } ?: emptyMap()
                } catch (e: Exception) {
                    // Ignorer si pas de membres
                }
                
                // Récupérer channels
                try {
                    val channelsJson = api.getJson("/api/discord/channels")
                    val channelsObj = json.parseToJsonElement(channelsJson).jsonObject
                    channels.value = channelsObj.mapValues { it.value.jsonPrimitive.content }
                } catch (e: Exception) {
                    // Ignorer
                }
                
                // Récupérer roles
                try {
                    val rolesJson = api.getJson("/api/discord/roles")
                    val rolesObj = json.parseToJsonElement(rolesJson).jsonObject
                    roles.value = rolesObj.mapValues { it.value.jsonPrimitive.content }
                } catch (e: Exception) {
                    // Ignorer
                }
                
                // Récupérer config
                try {
                    val configJson = api.getJson("/api/configs")
                    configData.value = json.parseToJsonElement(configJson).jsonObject
                } catch (e: Exception) {
                    errorMessage.value = "Config: ${e.message}"
                }
                
            } catch (e: Exception) {
                errorMessage.value = "Erreur: ${e.message}"
            } finally {
                isLoading.value = false
            }
        }
    }

    fun login() {
        val url = baseUrl.value.trim().removeSuffix("/")
        if (url.isBlank()) {
            scope.launch { snackbar.showSnackbar("Entrez l'URL du dashboard") }
            return
        }
        store.setBaseUrl(url)
        baseUrl.value = url
        val authUrl = "$url/auth/mobile/start?app_redirect=bagbot://auth"
        ExternalBrowser.open(authUrl)
    }

    BagBotTheme {
        if (showSplash.value) {
            SplashScreen(onFinished = { showSplash.value = false })
        } else {
            Scaffold(
                snackbarHost = { SnackbarHost(snackbar) },
                topBar = {
                    TopAppBar(
                        title = { Text("BAG Bot Manager") },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            titleContentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )
                },
                bottomBar = {
                    if (token.value?.isNotBlank() == true) {
                        NavigationBar {
                            // Onglet Accueil
                            NavigationBarItem(
                                selected = tab.value == 0,
                                onClick = { tab.value = 0 },
                                icon = { Icon(Icons.Default.Home, null) },
                                label = { Text("Accueil") }
                            )
                            // Onglet Config App
                            NavigationBarItem(
                                selected = tab.value == 1,
                                onClick = { tab.value = 1 },
                                icon = { Icon(Icons.Default.PhoneAndroid, null) },
                                label = { Text("App") }
                            )
                            // Onglet Config Bot
                            NavigationBarItem(
                                selected = tab.value == 2,
                                onClick = { tab.value = 2 },
                                icon = { Icon(Icons.Default.Settings, null) },
                                label = { Text("Bot") }
                            )
                            // Onglet Chat Staff
                            NavigationBarItem(
                                selected = tab.value == 3,
                                onClick = { tab.value = 3 },
                                icon = { Icon(Icons.Default.Chat, null) },
                                label = { Text("Staff") }
                            )
                            // Onglet Admin (si fondateur)
                            if (isFounder.value) {
                                NavigationBarItem(
                                    selected = tab.value == 4,
                                    onClick = { tab.value = 4 },
                                    icon = { Icon(Icons.Default.Security, null) },
                                    label = { Text("Admin") }
                                )
                            }
                        }
                    }
                }
            ) { padding ->
                Box(Modifier.padding(padding).fillMaxSize()) {
                    when {
                        token.value.isNullOrBlank() -> {
                            // Écran de connexion
                            Column(
                                Modifier.fillMaxSize().padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                OutlinedTextField(
                                    value = baseUrl.value,
                                    onValueChange = { baseUrl.value = it },
                                    label = { Text("URL Dashboard") },
                                    modifier = Modifier.fillMaxWidth(),
                                    placeholder = { Text("http://88.174.155.230:33002") }
                                )
                                Spacer(Modifier.height(16.dp))
                                Button(onClick = { login() }, modifier = Modifier.fillMaxWidth()) {
                                    Text("Se connecter via Discord")
                                }
                            }
                        }
                        tab.value == 0 -> {
                            // Onglet Accueil
                            if (isLoading.value) {
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        CircularProgressIndicator()
                                        Spacer(Modifier.height(16.dp))
                                        Text("Chargement...")
                                    }
                                }
                            } else {
                                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    item {
                                        Card(Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(16.dp)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(
                                                        if (botOnline.value) Icons.Default.CheckCircle else Icons.Default.Error,
                                                        null,
                                                        tint = if (botOnline.value) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                                    )
                                                    Spacer(Modifier.width(8.dp))
                                                    Text("Statut du Bot", style = MaterialTheme.typography.titleLarge)
                                                }
                                                Spacer(Modifier.height(12.dp))
                                                Text(
                                                    if (botOnline.value) "✅ Bot en ligne" else "❌ Bot hors ligne",
                                                    style = MaterialTheme.typography.bodyLarge
                                                )
                                                Text("${members.value.size} membres", style = MaterialTheme.typography.bodyMedium)
                                                Text("${channels.value.size} channels", style = MaterialTheme.typography.bodyMedium)
                                                Text("${roles.value.size} rôles", style = MaterialTheme.typography.bodyMedium)
                                            }
                                        }
                                    }
                                    
                                    item {
                                        Card(Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(16.dp)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.secondary)
                                                    Spacer(Modifier.width(8.dp))
                                                    Text("Votre Profil", style = MaterialTheme.typography.titleLarge)
                                                }
                                                Spacer(Modifier.height(12.dp))
                                                if (isFounder.value) {
                                                    Text("🔒 Fondateur du serveur", style = MaterialTheme.typography.bodyLarge)
                                                    Text("Accès complet", style = MaterialTheme.typography.bodyMedium)
                                                } else {
                                                    Text("👤 Membre autorisé", style = MaterialTheme.typography.bodyLarge)
                                                }
                                            }
                                        }
                                    }
                                    
                                    if (errorMessage.value != null) {
                                        item {
                                            Card(Modifier.fillMaxWidth()) {
                                                Column(Modifier.padding(16.dp)) {
                                                    Text("⚠️ Informations", style = MaterialTheme.typography.titleMedium)
                                                    Spacer(Modifier.height(8.dp))
                                                    Text(errorMessage.value!!, style = MaterialTheme.typography.bodySmall)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        tab.value == 1 -> {
                            // Onglet Config App
                            LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                item {
                                    Card(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(16.dp)) {
                                            Text("📱 Configuration de l'Application", style = MaterialTheme.typography.titleLarge)
                                            Spacer(Modifier.height(12.dp))
                                            Text("URL Dashboard : ${baseUrl.value}", style = MaterialTheme.typography.bodyMedium)
                                            Text("Version : 2.0.3", style = MaterialTheme.typography.bodyMedium)
                                            Text("Connecté : Oui", style = MaterialTheme.typography.bodyMedium)
                                        }
                                    }
                                }
                                
                                item {
                                    Card(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(16.dp)) {
                                            Text("⚙️ Paramètres", style = MaterialTheme.typography.titleMedium)
                                            Spacer(Modifier.height(12.dp))
                                            Button(
                                                onClick = {
                                                    scope.launch {
                                                        store.clear()
                                                        token.value = null
                                                        snackbar.showSnackbar("Déconnecté")
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Text("Se déconnecter")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        tab.value == 2 -> {
                            // Onglet Config Bot
                            if (isLoading.value) {
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator()
                                }
                            } else if (configData.value != null) {
                                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    item {
                                        Card(Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(16.dp)) {
                                                Text("🤖 Configuration du Bot", style = MaterialTheme.typography.titleLarge)
                                                Spacer(Modifier.height(12.dp))
                                                Text("Serveur : BAG", style = MaterialTheme.typography.bodyLarge)
                                                Text("${members.value.size} membres actifs", style = MaterialTheme.typography.bodyMedium)
                                            }
                                        }
                                    }
                                    
                                    // Afficher les sections de configuration
                                    configData.value?.keys?.forEach { key ->
                                        item {
                                            Card(Modifier.fillMaxWidth()) {
                                                Column(Modifier.padding(16.dp)) {
                                                    Text(key, style = MaterialTheme.typography.titleMedium)
                                                    Spacer(Modifier.height(8.dp))
                                                    Text("Configuration disponible", style = MaterialTheme.typography.bodySmall)
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Configuration en cours de chargement...", style = MaterialTheme.typography.bodyLarge)
                                        Spacer(Modifier.height(16.dp))
                                        Button(onClick = {
                                            scope.launch {
                                                isLoading.value = true
                                                try {
                                                    val configJson = api.getJson("/api/configs")
                                                    configData.value = json.parseToJsonElement(configJson).jsonObject
                                                } catch (e: Exception) {
                                                    snackbar.showSnackbar("Erreur: ${e.message}")
                                                } finally {
                                                    isLoading.value = false
                                                }
                                            }
                                        }) {
                                            Text("Recharger")
                                        }
                                    }
                                }
                            }
                        }
                        tab.value == 3 -> {
                            // Onglet Chat Staff
                            Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.Chat, null, modifier = Modifier.size(64.dp))
                                    Spacer(Modifier.height(16.dp))
                                    Text("💬 Chat Staff", style = MaterialTheme.typography.titleLarge)
                                    Spacer(Modifier.height(8.dp))
                                    Text("Fonctionnalité en développement", style = MaterialTheme.typography.bodyMedium)
                                    Spacer(Modifier.height(16.dp))
                                    Text(
                                        "Cette section permettra de communiquer avec l'équipe de modération directement depuis l'application.",
                                        style = MaterialTheme.typography.bodySmall,
                                        modifier = Modifier.padding(horizontal = 32.dp)
                                    )
                                }
                            }
                        }
                        tab.value == 4 && isFounder.value -> {
                            // Onglet Admin
                            AdminScreen(
                                api = api,
                                members = members.value,
                                onShowSnackbar = { scope.launch { snackbar.showSnackbar(it) } }
                            )
                        }
                    }
                }
            }
        }
    }
}
