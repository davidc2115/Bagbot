@file:OptIn(ExperimentalMaterial3Api::class)

package com.bagbot.manager

import android.content.Context
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

    val statusJson = remember { mutableStateOf<String?>(null) }
    val configJson = remember { mutableStateOf<String?>(null) }
    val baseUrl = remember { mutableStateOf(store.getBaseUrl()) }
    val token = remember { mutableStateOf(store.getToken()) }
    val tab = remember { mutableStateOf(0) }
    val isFounder = remember { mutableStateOf(false) }
    val showSplash = remember { mutableStateOf(true) }
    val members = remember { mutableStateOf<Map<String, String>>(emptyMap()) }

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
            try {
                val meJson = api.getJson("/api/me")
                val me = json.parseToJsonElement(meJson).jsonObject
                isFounder.value = me["userId"]?.jsonPrimitive?.content == "943487722738311219"
                
                statusJson.value = api.getJson("/api/bot/status")
                configJson.value = api.getJson("/api/configs")
                
                val membersJson = api.getJson("/api/discord/members")
                members.value = json.parseToJsonElement(membersJson).jsonObject.mapValues {
                    it.value.jsonPrimitive.content
                }
            } catch (e: Exception) {
                snackbar.showSnackbar("Erreur: ${e.message}")
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
                            LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                                item {
                                    Card(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(16.dp)) {
                                            Text("Statut du Bot", style = MaterialTheme.typography.titleLarge)
                                            Spacer(Modifier.height(8.dp))
                                            Text(statusJson.value ?: "Chargement...")
                                        }
                                    }
                                }
                            }
                        }
                        tab.value == 1 -> {
                            LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                                item {
                                    Card(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(16.dp)) {
                                            Text("Configuration", style = MaterialTheme.typography.titleLarge)
                                            Spacer(Modifier.height(8.dp))
                                            Text(configJson.value ?: "Chargement...")
                                        }
                                    }
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
