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
    
    // États pour les données formatées
    val botStatus = remember { mutableStateOf<String?>(null) }
    val configData = remember { mutableStateOf<Map<String, Any>?>(null) }
    val isLoading = remember { mutableStateOf(false) }
    val errorMessage = remember { mutableStateOf<String?>(null) }

    val json = remember { Json { ignoreUnknownKeys = true } }

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
                val meJson = api.getJson("/api/me")
                val me = json.parseToJsonElement(meJson).jsonObject
                isFounder.value = me["userId"]?.jsonPrimitive?.content == "943487722738311219"
                
                // Récupérer statut du bot
                val statusJson = api.getJson("/api/bot/status")
                botStatus.value = statusJson
                
                // Récupérer membres
                val membersJson = api.getJson("/api/discord/members")
                members.value = json.parseToJsonElement(membersJson).jsonObject.mapValues {
                    it.value.jsonPrimitive.content
                }
                
                // Récupérer config
                val configJson = api.getJson("/api/configs")
                val configObj = json.parseToJsonElement(configJson).jsonObject
                configData.value = configObj.mapValues { it.value }
                
            } catch (e: Exception) {
                errorMessage.value = "Erreur: ${e.message}"
                snackbar.showSnackbar("❌ ${e.message}")
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
                            NavigationBarItem(
                                selected = tab.value == 0,
                                onClick = { tab.value = 0 },
                                icon = { Icon(Icons.Default.Home, null) },
                                label = { Text("Accueil") }
                            )
                            NavigationBarItem(
                                selected = tab.value == 1,
                                onClick = { tab.value = 1 },
                                icon = { Icon(Icons.Default.Settings, null) },
                                label = { Text("Config") }
                            )
                            if (isFounder.value) {
                                NavigationBarItem(
                                    selected = tab.value == 2,
                                    onClick = { tab.value = 2 },
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
                            // Onglet Accueil avec affichage formaté
                            if (isLoading.value) {
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator()
                                }
                            } else if (errorMessage.value != null) {
                                Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                    Text(errorMessage.value!!, color = MaterialTheme.colorScheme.error)
                                }
                            } else {
                                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    item {
                                        Card(Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(16.dp)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.primary)
                                                    Spacer(Modifier.width(8.dp))
                                                    Text("Statut du Bot", style = MaterialTheme.typography.titleLarge)
                                                }
                                                Spacer(Modifier.height(12.dp))
                                                Text("✅ Bot en ligne", style = MaterialTheme.typography.bodyLarge)
                                                Text("${members.value.size} membres", style = MaterialTheme.typography.bodyMedium)
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
                                                    Text("Accès administrateur activé", style = MaterialTheme.typography.bodyMedium)
                                                } else {
                                                    Text("👤 Membre autorisé", style = MaterialTheme.typography.bodyLarge)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        tab.value == 1 -> {
                            // Onglet Configuration avec affichage formaté
                            if (isLoading.value) {
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator()
                                }
                            } else if (configData.value != null) {
                                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    item {
                                        Card(Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(16.dp)) {
                                                Text("Configuration du Serveur", style = MaterialTheme.typography.titleLarge)
                                                Spacer(Modifier.height(12.dp))
                                                Text("✅ Système configuré", style = MaterialTheme.typography.bodyLarge)
                                                Text("${members.value.size} membres Discord", style = MaterialTheme.typography.bodyMedium)
                                            }
                                        }
                                    }
                                }
                            } else {
                                Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                    Text("Aucune configuration disponible")
                                }
                            }
                        }
                        tab.value == 2 && isFounder.value -> {
                            AdminScreen(
                                api = api,
                                members = members.value,
                                onShowSnackbar = { snackbar.showSnackbar(it) }
                            )
                        }
                    }
                }
            }
        }
    }
}
