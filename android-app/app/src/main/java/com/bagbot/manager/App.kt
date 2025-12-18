@file:OptIn(ExperimentalMaterial3Api::class)

package com.bagbot.manager

import android.net.Uri
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import com.bagbot.manager.ui.theme.BagBotTheme
import com.bagbot.manager.ui.screens.SplashScreen
import com.bagbot.manager.ui.screens.AdminScreen

private const val TAG = "BAG_APP"

@Composable
fun App(deepLink: Uri?, onDeepLinkConsumed: () -> Unit) {
    val context = LocalContext.current
    val store = remember { SettingsStore.getInstance(context) }
    val api = remember { ApiClient(store) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

    // États de base
    var baseUrl by remember { mutableStateOf(store.getBaseUrl()) }
    var token by remember { mutableStateOf(store.getToken()) }
    var tab by remember { mutableStateOf(0) }
    var showSplash by remember { mutableStateOf(true) }
    
    // États utilisateur
    var userName by remember { mutableStateOf("") }
    var userId by remember { mutableStateOf("") }
    var isFounder by remember { mutableStateOf(false) }
    
    // États données serveur
    var members by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var memberRoles by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var channels by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var roles by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var botOnline by remember { mutableStateOf(false) }
    var botStats by remember { mutableStateOf<JsonObject?>(null) }
    var configData by remember { mutableStateOf<JsonObject?>(null) }
    
    // États UI
    var isLoading by remember { mutableStateOf(false) }
    var loadingMessage by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val json = remember { Json { ignoreUnknownKeys = true; coerceInputValues = true } }

    // Gestion du deep link OAuth
    LaunchedEffect(deepLink) {
        deepLink?.getQueryParameter("token")?.takeIf { it.isNotBlank() }?.let { t ->
            Log.d(TAG, "Token reçu via deep link")
            store.setToken(t.trim())
            token = t.trim()
            snackbar.showSnackbar("✅ Authentification réussie !")
            onDeepLinkConsumed()
        }
    }

    // Chargement des données
    LaunchedEffect(token, baseUrl) {
        if (token.isNullOrBlank() || baseUrl.isNullOrBlank()) return@LaunchedEffect
        
        isLoading = true
        errorMessage = null
        
        withContext(Dispatchers.IO) {
            try {
                // 1. Informations utilisateur
                loadingMessage = "Récupération de votre profil..."
                Log.d(TAG, "Fetching /api/me")
                try {
                    val meJson = api.getJson("/api/me")
                    Log.d(TAG, "Response /api/me: ${meJson.take(100)}")
                    val me = json.parseToJsonElement(meJson).jsonObject
                    withContext(Dispatchers.Main) {
                        userId = me["userId"]?.jsonPrimitive?.contentOrNull ?: ""
                        userName = me["username"]?.jsonPrimitive?.contentOrNull ?: ""
                        isFounder = userId == "943487722738311219"
                    }
                    Log.d(TAG, "User loaded: $userName ($userId)")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/me: ${e.message}")
                    withContext(Dispatchers.Main) {
                        errorMessage = "Erreur authentification: ${e.message}"
                    }
                }
                
                // 2. Statut du bot
                loadingMessage = "Vérification du bot..."
                Log.d(TAG, "Fetching /api/bot/status")
                try {
                    val statusJson = api.getJson("/api/bot/status")
                    Log.d(TAG, "Response /api/bot/status: ${statusJson.take(100)}")
                    val status = json.parseToJsonElement(statusJson).jsonObject
                    withContext(Dispatchers.Main) {
                        botStats = status
                        botOnline = status["status"]?.jsonPrimitive?.contentOrNull == "online"
                    }
                    Log.d(TAG, "Bot status: ${if (botOnline) "Online" else "Offline"}")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/bot/status: ${e.message}")
                    withContext(Dispatchers.Main) {
                        botOnline = false
                    }
                }
                
                // 3. Membres et rôles
                loadingMessage = "Chargement des membres..."
                Log.d(TAG, "Fetching /api/discord/members")
                try {
                    val membersJson = api.getJson("/api/discord/members")
                    Log.d(TAG, "Response /api/discord/members: ${membersJson.take(150)}")
                    val membersData = json.parseToJsonElement(membersJson).jsonObject
                    
                    withContext(Dispatchers.Main) {
                        membersData["names"]?.jsonObject?.let { namesObj ->
                            members = namesObj.mapValues { it.value.jsonPrimitive.content }
                        }
                        
                        membersData["roles"]?.jsonObject?.let { rolesObj ->
                            memberRoles = rolesObj.mapValues { (_, v) ->
                                v.jsonArray.map { it.jsonPrimitive.content }
                            }
                        }
                    }
                    Log.d(TAG, "Loaded ${members.size} members")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/discord/members: ${e.message}")
                }
                
                // 4. Salons
                loadingMessage = "Chargement des salons..."
                Log.d(TAG, "Fetching /api/discord/channels")
                try {
                    val channelsJson = api.getJson("/api/discord/channels")
                    Log.d(TAG, "Response /api/discord/channels: ${channelsJson.take(100)}")
                    val channelsObj = json.parseToJsonElement(channelsJson).jsonObject
                    withContext(Dispatchers.Main) {
                        channels = channelsObj.mapValues { it.value.jsonPrimitive.content }
                    }
                    Log.d(TAG, "Loaded ${channels.size} channels")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/discord/channels: ${e.message}")
                }
                
                // 5. Rôles
                loadingMessage = "Chargement des rôles..."
                Log.d(TAG, "Fetching /api/discord/roles")
                try {
                    val rolesJson = api.getJson("/api/discord/roles")
                    Log.d(TAG, "Response /api/discord/roles: ${rolesJson.take(100)}")
                    val rolesObj = json.parseToJsonElement(rolesJson).jsonObject
                    withContext(Dispatchers.Main) {
                        roles = rolesObj.mapValues { it.value.jsonPrimitive.content }
                    }
                    Log.d(TAG, "Loaded ${roles.size} roles")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/discord/roles: ${e.message}")
                }
                
                // 6. Configuration
                loadingMessage = "Chargement de la configuration..."
                Log.d(TAG, "Fetching /api/configs")
                try {
                    val configJson = api.getJson("/api/configs")
                    Log.d(TAG, "Response /api/configs: ${configJson.take(200)}")
                    withContext(Dispatchers.Main) {
                        configData = json.parseToJsonElement(configJson).jsonObject
                    }
                    Log.d(TAG, "Config loaded: ${configData?.keys?.size} sections")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/configs: ${e.message}")
                    withContext(Dispatchers.Main) {
                        errorMessage = "Erreur configuration: ${e.message}"
                    }
                }
                
                Log.d(TAG, "✅ All data loaded successfully")
                
            } catch (e: Exception) {
                Log.e(TAG, "Fatal error: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    errorMessage = "Erreur: ${e.message}"
                }
            } finally {
                withContext(Dispatchers.Main) {
                    isLoading = false
                    loadingMessage = ""
                }
            }
        }
    }

    fun login() {
        val url = baseUrl.trim().removeSuffix("/")
        if (url.isBlank()) {
            scope.launch { snackbar.showSnackbar("❌ Entrez l'URL du dashboard") }
            return
        }
        store.setBaseUrl(url)
        baseUrl = url
        val authUrl = "$url/auth/mobile/start?app_redirect=bagbot://auth"
        Log.d(TAG, "Opening OAuth: $authUrl")
        ExternalBrowser.open(authUrl)
    }

    BagBotTheme {
        if (showSplash) {
            SplashScreen(onFinished = { showSplash = false })
        } else {
            Scaffold(
                snackbarHost = { SnackbarHost(snackbar) },
                topBar = {
                    TopAppBar(
                        title = { 
                            Text(
                                "💎 BAG Bot Manager", 
                                fontWeight = FontWeight.Bold
                            ) 
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color(0xFFFF1744),
                            titleContentColor = Color.White
                        )
                    )
                },
                bottomBar = {
                    if (token?.isNotBlank() == true) {
                        NavigationBar {
                            NavigationBarItem(
                                selected = tab == 0,
                                onClick = { tab = 0 },
                                icon = { Icon(Icons.Default.Home, "Accueil") },
                                label = { Text("Accueil") }
                            )
                            NavigationBarItem(
                                selected = tab == 1,
                                onClick = { tab = 1 },
                                icon = { Icon(Icons.Default.PhoneAndroid, "App") },
                                label = { Text("App") }
                            )
                            NavigationBarItem(
                                selected = tab == 2,
                                onClick = { tab = 2 },
                                icon = { Icon(Icons.Default.Settings, "Config") },
                                label = { Text("Config") }
                            )
                            if (isFounder) {
                                NavigationBarItem(
                                    selected = tab == 3,
                                    onClick = { tab = 3 },
                                    icon = { Icon(Icons.Default.Security, "Admin") },
                                    label = { Text("Admin") }
                                )
                            }
                        }
                    }
                }
            ) { padding ->
                Box(
                    Modifier
                        .padding(padding)
                        .fillMaxSize()
                        .background(Color(0xFF121212))
                ) {
                    when {
                        token.isNullOrBlank() -> {
                            // Écran de connexion
                            Column(
                                Modifier
                                    .fillMaxSize()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Image(
                                    painter = rememberAsyncImagePainter(
                                        "https://cdn.discordapp.com/attachments/1408458115283812484/1451165138769150002/1760963220294.jpg"
                                    ),
                                    contentDescription = "Logo BAG",
                                    modifier = Modifier
                                        .size(120.dp)
                                        .clip(RoundedCornerShape(60.dp))
                                )
                                
                                Spacer(Modifier.height(32.dp))
                                
                                Text(
                                    "💎 BAG Bot Manager",
                                    style = MaterialTheme.typography.headlineLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFF1744)
                                )
                                
                                Text(
                                    "Gestion complète de votre serveur",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = Color.Gray
                                )
                                
                                Spacer(Modifier.height(48.dp))
                                
                                OutlinedTextField(
                                    value = baseUrl,
                                    onValueChange = { baseUrl = it },
                                    label = { Text("URL Dashboard") },
                                    placeholder = { Text("http://88.174.155.230:33002") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                                
                                Spacer(Modifier.height(16.dp))
                                
                                Button(
                                    onClick = { login() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(56.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFFF1744)
                                    )
                                ) {
                                    Icon(Icons.Default.Login, null)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Se connecter via Discord")
                                }
                            }
                        }
                        tab == 0 -> {
                            // Onglet Accueil
                            if (isLoading) {
                                Box(
                                    Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        CircularProgressIndicator(
                                            color = Color(0xFFFF1744)
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Text(
                                            loadingMessage.ifBlank { "Chargement..." },
                                            color = Color.White
                                        )
                                    }
                                }
                            } else {
                                LazyColumn(
                                    Modifier
                                        .fillMaxSize()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    // Card Statut Bot
                                    item {
                                        Card(
                                            Modifier.fillMaxWidth(),
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color(0xFF1E1E1E)
                                            )
                                        ) {
                                            Column(Modifier.padding(20.dp)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        if (botOnline) Icons.Default.CheckCircle 
                                                        else Icons.Default.Error,
                                                        null,
                                                        tint = if (botOnline) Color(0xFF4CAF50) 
                                                               else Color(0xFFE53935),
                                                        modifier = Modifier.size(32.dp)
                                                    )
                                                    Spacer(Modifier.width(12.dp))
                                                    Column {
                                                        Text(
                                                            "Statut du Bot",
                                                            style = MaterialTheme.typography.titleLarge,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color.White
                                                        )
                                                        Text(
                                                            if (botOnline) "✅ En ligne" 
                                                            else "❌ Hors ligne",
                                                            color = if (botOnline) Color(0xFF4CAF50) 
                                                                   else Color(0xFFE53935)
                                                        )
                                                    }
                                                }
                                                
                                                Spacer(Modifier.height(16.dp))
                                                Divider(color = Color(0xFF2E2E2E))
                                                Spacer(Modifier.height(16.dp))
                                                
                                                Row(
                                                    Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceAround
                                                ) {
                                                    Column(
                                                        horizontalAlignment = Alignment.CenterHorizontally
                                                    ) {
                                                        Text(
                                                            "${members.size}",
                                                            style = MaterialTheme.typography.headlineMedium,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFFF1744)
                                                        )
                                                        Text("Membres", color = Color.Gray)
                                                    }
                                                    Column(
                                                        horizontalAlignment = Alignment.CenterHorizontally
                                                    ) {
                                                        Text(
                                                            "${channels.size}",
                                                            style = MaterialTheme.typography.headlineMedium,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFF9C27B0)
                                                        )
                                                        Text("Salons", color = Color.Gray)
                                                    }
                                                    Column(
                                                        horizontalAlignment = Alignment.CenterHorizontally
                                                    ) {
                                                        Text(
                                                            "${roles.size}",
                                                            style = MaterialTheme.typography.headlineMedium,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFFFD700)
                                                        )
                                                        Text("Rôles", color = Color.Gray)
                                                    }
                                                }
                                                
                                                botStats?.let { stats ->
                                                    Spacer(Modifier.height(16.dp))
                                                    Divider(color = Color(0xFF2E2E2E))
                                                    Spacer(Modifier.height(16.dp))
                                                    
                                                    stats["commandCount"]?.jsonPrimitive?.intOrNull?.let {
                                                        Text(
                                                            "⚡ $it commandes disponibles",
                                                            color = Color.White
                                                        )
                                                    }
                                                    stats["version"]?.jsonPrimitive?.contentOrNull?.let {
                                                        Text(
                                                            "📦 Version: $it",
                                                            color = Color.Gray
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Card Profil
                                    item {
                                        Card(
                                            Modifier.fillMaxWidth(),
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color(0xFF1E1E1E)
                                            )
                                        ) {
                                            Column(Modifier.padding(20.dp)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        Icons.Default.Person,
                                                        null,
                                                        tint = Color(0xFF9C27B0),
                                                        modifier = Modifier.size(32.dp)
                                                    )
                                                    Spacer(Modifier.width(12.dp))
                                                    Text(
                                                        "Votre Profil",
                                                        style = MaterialTheme.typography.titleLarge,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.White
                                                    )
                                                }
                                                
                                                Spacer(Modifier.height(16.dp))
                                                
                                                if (userName.isNotBlank()) {
                                                    Text(
                                                        "👤 $userName",
                                                        style = MaterialTheme.typography.titleMedium,
                                                        color = Color.White
                                                    )
                                                    Spacer(Modifier.height(8.dp))
                                                }
                                                
                                                if (isFounder) {
                                                    Text(
                                                        "👑 Fondateur du serveur",
                                                        color = Color(0xFFFFD700)
                                                    )
                                                    Text(
                                                        "Accès complet",
                                                        color = Color.Gray
                                                    )
                                                } else {
                                                    Text(
                                                        "✅ Membre autorisé",
                                                        color = Color(0xFF4CAF50)
                                                    )
                                                }
                                                
                                                // Afficher les rôles
                                                if (userId.isNotBlank() && memberRoles.containsKey(userId)) {
                                                    val userRoleIds = memberRoles[userId] ?: emptyList()
                                                    val userRoleNames = userRoleIds.mapNotNull { roleId -> 
                                                        roles[roleId] 
                                                    }
                                                    
                                                    if (userRoleNames.isNotEmpty()) {
                                                        Spacer(Modifier.height(12.dp))
                                                        Text(
                                                            "Vos rôles:",
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFFF1744)
                                                        )
                                                        Spacer(Modifier.height(4.dp))
                                                        Text(
                                                            userRoleNames.take(5).joinToString(" • "),
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = Color.LightGray
                                                        )
                                                        if (userRoleNames.size > 5) {
                                                            Text(
                                                                "... et ${userRoleNames.size - 5} autres",
                                                                style = MaterialTheme.typography.bodySmall,
                                                                color = Color.Gray
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Afficher les erreurs si présentes
                                    errorMessage?.let { error ->
                                        item {
                                            Card(
                                                Modifier.fillMaxWidth(),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = Color(0xFF3E2723)
                                                )
                                            ) {
                                                Column(Modifier.padding(16.dp)) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Warning,
                                                            null,
                                                            tint = Color(0xFFFF9800)
                                                        )
                                                        Spacer(Modifier.width(8.dp))
                                                        Text(
                                                            "⚠️ Information",
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFFF9800)
                                                        )
                                                    }
                                                    Spacer(Modifier.height(8.dp))
                                                    Text(
                                                        error,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = Color.LightGray
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        tab == 1 -> {
                            // Onglet App
                            LazyColumn(
                                Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                item {
                                    Card(
                                        Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(
                                            containerColor = Color(0xFF1E1E1E)
                                        )
                                    ) {
                                        Column(Modifier.padding(20.dp)) {
                                            Text(
                                                "📱 Configuration de l'Application",
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Spacer(Modifier.height(16.dp))
                                            Text("URL Dashboard: $baseUrl", color = Color.White)
                                            Text("Version: 2.1.0", color = Color.Gray)
                                            Text(
                                                "Statut: ${if (token.isNullOrBlank()) "Non connecté" else "Connecté"}",
                                                color = if (token.isNullOrBlank()) Color(0xFFE53935) 
                                                       else Color(0xFF4CAF50)
                                            )
                                            if (userName.isNotBlank()) {
                                                Text("Utilisateur: $userName", color = Color.White)
                                            }
                                        }
                                    }
                                }
                                
                                item {
                                    Card(
                                        Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(
                                            containerColor = Color(0xFF1E1E1E)
                                        )
                                    ) {
                                        Column(Modifier.padding(20.dp)) {
                                            Text(
                                                "⚙️ Paramètres",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Spacer(Modifier.height(16.dp))
                                            Button(
                                                onClick = {
                                                    scope.launch {
                                                        store.clear()
                                                        token = null
                                                        userName = ""
                                                        userId = ""
                                                        isFounder = false
                                                        members = emptyMap()
                                                        channels = emptyMap()
                                                        roles = emptyMap()
                                                        configData = null
                                                        snackbar.showSnackbar("✅ Déconnecté")
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = Color(0xFFE53935)
                                                )
                                            ) {
                                                Icon(Icons.Default.Logout, null)
                                                Spacer(Modifier.width(8.dp))
                                                Text("Se déconnecter")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        tab == 2 -> {
                            // Onglet Configuration
                            if (isLoading) {
                                Box(
                                    Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = Color(0xFF9C27B0))
                                }
                            } else if (configData != null) {
                                LazyColumn(
                                    Modifier
                                        .fillMaxSize()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    item {
                                        Card(
                                            Modifier.fillMaxWidth(),
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color(0xFF1E1E1E)
                                            )
                                        ) {
                                            Column(Modifier.padding(20.dp)) {
                                                Text(
                                                    "🤖 Configuration du Bot",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White
                                                )
                                                Spacer(Modifier.height(12.dp))
                                                Text("Serveur: 💎 BAG", color = Color.White)
                                                Text("${members.size} membres", color = Color.Gray)
                                                Text("${channels.size} salons", color = Color.Gray)
                                            }
                                        }
                                    }
                                    
                                    configData?.keys?.forEach { key ->
                                        item {
                                            Card(
                                                Modifier.fillMaxWidth(),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = Color(0xFF1E1E1E)
                                                )
                                            ) {
                                                Row(
                                                    Modifier
                                                        .padding(16.dp)
                                                        .fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column {
                                                        Text(
                                                            when (key) {
                                                                "economy" -> "💰 Économie"
                                                                "tickets" -> "🎫 Tickets"
                                                                "welcome" -> "👋 Bienvenue"
                                                                "goodbye" -> "👋 Au revoir"
                                                                "inactivity" -> "💤 Inactivité"
                                                                else -> key
                                                            },
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color.White
                                                        )
                                                        Text(
                                                            "Configuration disponible",
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = Color.Gray
                                                        )
                                                    }
                                                    Icon(
                                                        Icons.Default.ChevronRight,
                                                        null,
                                                        tint = Color.Gray
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                Box(
                                    Modifier
                                        .fillMaxSize()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(
                                            Icons.Default.Settings,
                                            null,
                                            modifier = Modifier.size(64.dp),
                                            tint = Color.Gray
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Text(
                                            "⚠️ Configuration non chargée",
                                            color = Color.White
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Button(
                                            onClick = {
                                                scope.launch {
                                                    isLoading = true
                                                    withContext(Dispatchers.IO) {
                                                        try {
                                                            val configJson = api.getJson("/api/configs")
                                                            withContext(Dispatchers.Main) {
                                                                configData = json.parseToJsonElement(configJson).jsonObject
                                                                snackbar.showSnackbar("✅ Configuration rechargée")
                                                            }
                                                        } catch (e: Exception) {
                                                            withContext(Dispatchers.Main) {
                                                                snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                                            }
                                                        } finally {
                                                            withContext(Dispatchers.Main) {
                                                                isLoading = false
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFF9C27B0)
                                            )
                                        ) {
                                            Icon(Icons.Default.Refresh, null)
                                            Spacer(Modifier.width(8.dp))
                                            Text("Recharger")
                                        }
                                    }
                                }
                            }
                        }
                        tab == 3 && isFounder -> {
                            AdminScreen(
                                api = api,
                                members = members,
                                onShowSnackbar = { 
                                    scope.launch { snackbar.showSnackbar(it) } 
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
