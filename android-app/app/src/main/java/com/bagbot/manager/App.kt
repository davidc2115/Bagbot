@file:OptIn(ExperimentalMaterial3Api::class)

package com.bagbot.manager

import android.net.Uri
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.Gamepad
import androidx.compose.material.icons.filled.Extension  
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import com.bagbot.manager.ui.theme.BagBotTheme
import com.bagbot.manager.ui.screens.SplashScreen
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.ui.components.ChannelSelector
import com.bagbot.manager.ui.components.RoleSelector

private const val TAG = "BAG_APP"


// ============================================
// CONFIGURATION PAR GROUPES v2.1.3
// ============================================

data class ConfigGroup(
    val id: String,
    val name: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val color: Color,
    val sections: List<String>
)

val configGroups = listOf(
    ConfigGroup(
        "messages",
        "👋 Messages & Bienvenue",
        Icons.Default.EmojiPeople,
        Color(0xFF4CAF50),
        listOf("welcome", "goodbye")
    ),
    ConfigGroup(
        "moderation",
        "👮 Modération & Sécurité",
        Icons.Default.Security,
        Color(0xFFE53935),
        listOf("logs", "autokick", "inactivity", "staffRoleIds", "quarantineRoleId")
    ),
    ConfigGroup(
        "gamification",
        "🎮 Gamification & Fun",
        Icons.Default.Gamepad,
        Color(0xFF9C27B0),
        listOf("economy", "levels", "truthdare")
    ),
    ConfigGroup(
        "features",
        "🛠️ Fonctionnalités",
        Icons.Default.Extension,
        Color(0xFF2196F3),
        listOf("tickets", "confess", "counting", "disboard", "autothread")
    ),
    ConfigGroup(
        "customization",
        "🎨 Personnalisation",
        Icons.Default.Palette,
        Color(0xFFFF9800),
        listOf("categoryBanners", "footerLogoUrl", "geo")
    )
)


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
    
    // État pour la navigation dans config
    var selectedConfigSection by remember { mutableStateOf<String?>(null) }

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
                                if (selectedConfigSection != null) "Configuration" 
                                else "💎 BAG Bot Manager", 
                                fontWeight = FontWeight.Bold
                            ) 
                        },
                        navigationIcon = {
                            if (selectedConfigSection != null) {
                                IconButton(onClick = { selectedConfigSection = null }) {
                                    Icon(Icons.Default.ArrowBack, "Retour", tint = Color.White)
                                }
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color(0xFFFF1744),
                            titleContentColor = Color.White
                        )
                    )
                },
                bottomBar = {
                    if (token?.isNotBlank() == true && selectedConfigSection == null) {
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
                        selectedConfigSection != null -> {
                            // Afficher l'éditeur de configuration
                            ConfigEditorScreen(
                                sectionKey = selectedConfigSection!!,
                                configData = configData,
                                members = members,
                                channels = channels,
                                roles = roles,
                                api = api,
                                json = json,
                                scope = scope,
                                snackbar = snackbar,
                                onBack = { selectedConfigSection = null },
                                onConfigUpdated = { updatedSection ->
                                    // Recharger la config
                                    scope.launch {
                                        withContext(Dispatchers.IO) {
                                            try {
                                                val configJson = api.getJson("/api/configs")
                                                withContext(Dispatchers.Main) {
                                                    configData = json.parseToJsonElement(configJson).jsonObject
                                                }
                                            } catch (e: Exception) {
                                                Log.e(TAG, "Error reloading config: ${e.message}")
                                            }
                                        }
                                    }
                                }
                            )
                        }
                        token.isNullOrBlank() -> {
                            // Écran de connexion (inchangé)
                            LoginScreen(
                                baseUrl = baseUrl,
                                onBaseUrlChange = { baseUrl = it },
                                onLogin = { login() }
                            )
                        }
                        tab == 0 -> {
                            HomeScreen(
                                isLoading = isLoading,
                                loadingMessage = loadingMessage,
                                botOnline = botOnline,
                                botStats = botStats,
                                members = members,
                                channels = channels,
                                roles = roles,
                                userName = userName,
                                userId = userId,
                                isFounder = isFounder,
                                memberRoles = memberRoles,
                                errorMessage = errorMessage
                            )
                        }
                        tab == 1 -> {
                            AppConfigScreen(
                                baseUrl = baseUrl,
                                token = token,
                                userName = userName,
                                store = store,
                                scope = scope,
                                snackbar = snackbar,
                                onDisconnect = {
                                    token = null
                                    userName = ""
                                    userId = ""
                                    isFounder = false
                                    members = emptyMap()
                                    channels = emptyMap()
                                    roles = emptyMap()
                                    configData = null
                                }
                            )
                        }
                        tab == 2 -> {
                            ConfigGroupsScreen(
                                configData = configData,
                                members = members,
                                channels = channels,
                                roles = roles,
                                api = api,
                                json = json,
                                scope = scope,
                                snackbar = snackbar,
                                isLoading = isLoading,
                                onReloadConfig = {
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
                                }
                            )
                        }
                        tab == 3 && isFounder -> {
                            AdminScreenWithAccess(
                                members = members,
                                api = api,
                                json = json,
                                scope = scope,
                                snackbar = snackbar
                            )
                        }
                    }
                }
            }
        }
    }
}

// Partie 2 - Composables principaux

@Composable
fun LoginScreen(
    baseUrl: String,
    onBaseUrlChange: (String) -> Unit,
    onLogin: () -> Unit
) {
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
            onValueChange = onBaseUrlChange,
            label = { Text("URL Dashboard") },
            placeholder = { Text("http://88.174.155.230:33002") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        
        Spacer(Modifier.height(16.dp))
        
        Button(
            onClick = onLogin,
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

@Composable
fun HomeScreen(
    isLoading: Boolean,
    loadingMessage: String,
    botOnline: Boolean,
    botStats: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    userName: String,
    userId: String,
    isFounder: Boolean,
    memberRoles: Map<String, List<String>>,
    errorMessage: String?
) {
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = Color(0xFFFF1744))
                Spacer(Modifier.height(16.dp))
                Text(loadingMessage.ifBlank { "Chargement..." }, color = Color.White)
            }
        }
    } else {
        LazyColumn(
            Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (botOnline) Icons.Default.CheckCircle else Icons.Default.Error,
                                null,
                                tint = if (botOnline) Color(0xFF4CAF50) else Color(0xFFE53935),
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
                                    if (botOnline) "✅ En ligne" else "❌ Hors ligne",
                                    color = if (botOnline) Color(0xFF4CAF50) else Color(0xFFE53935)
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
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${members.size}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFF1744)
                                )
                                Text("Membres", color = Color.Gray)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${channels.size}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF9C27B0)
                                )
                                Text("Salons", color = Color.Gray)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
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
                                Text("⚡ $it commandes disponibles", color = Color.White)
                            }
                            stats["version"]?.jsonPrimitive?.contentOrNull?.let {
                                Text("📦 Version: $it", color = Color.Gray)
                            }
                        }
                    }
                }
            }
            
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
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
                            Text("👑 Fondateur du serveur", color = Color(0xFFFFD700))
                            Text("Accès complet", color = Color.Gray)
                        } else {
                            Text("✅ Membre autorisé", color = Color(0xFF4CAF50))
                        }
                        
                        if (userId.isNotBlank() && memberRoles.containsKey(userId)) {
                            val userRoleIds = memberRoles[userId] ?: emptyList()
                            val userRoleNames = userRoleIds.mapNotNull { roleId -> roles[roleId] }
                            
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
            
            errorMessage?.let { error ->
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF3E2723))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warning, null, tint = Color(0xFFFF9800))
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

@Composable
fun AppConfigScreen(
    baseUrl: String,
    token: String?,
    userName: String,
    store: SettingsStore,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    onDisconnect: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
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
                    Text("Version: 2.1.2", color = Color.Gray)
                    Text(
                        "Statut: ${if (token.isNullOrBlank()) "Non connecté" else "Connecté"}",
                        color = if (token.isNullOrBlank()) Color(0xFFE53935) else Color(0xFF4CAF50)
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
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
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
                                onDisconnect()
                                snackbar.showSnackbar("✅ Déconnecté")
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE53935))
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

@Composable
fun ConfigGroupsScreen(
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    isLoading: Boolean,
    onReloadConfig: () -> Unit
) {
    var selectedGroup by remember { mutableStateOf<ConfigGroup?>(null) }
    var expandedSection by remember { mutableStateOf<String?>(null) }
    
    if (selectedGroup != null) {
        // Afficher les sections du groupe sélectionné
        ConfigGroupDetailScreen(
            group = selectedGroup!!,
            configData = configData,
            members = members,
            channels = channels,
            roles = roles,
            api = api,
            json = json,
            scope = scope,
            snackbar = snackbar,
            expandedSection = expandedSection,
            onExpandSection = { expandedSection = if (expandedSection == it) null else it },
            onBack = { selectedGroup = null }
        )
    } else {
        // Afficher les vignettes de groupes
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF9C27B0))
            }
        } else if (configData != null) {
            LazyColumn(
                Modifier.fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
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
                            Text("${members.size} membres • ${channels.size} salons", color = Color.Gray)
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "💡 Sélectionnez un groupe pour configurer",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFFF1744),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                
                items(configGroups) { group ->
                    val sectionsInConfig = group.sections.count { configData.containsKey(it) }
                    
                    Card(
                        Modifier
                            .fillMaxWidth()
                            .clickable { selectedGroup = group },
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    Modifier
                                        .size(48.dp)
                                        .background(group.color.copy(alpha = 0.2f), RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        group.icon,
                                        null,
                                        tint = group.color,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(Modifier.width(16.dp))
                                Column {
                                    Text(
                                        group.name,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        "$sectionsInConfig/${group.sections.size} sections configurées",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray
                                    )
                                }
                            }
                            Icon(Icons.Default.ChevronRight, null, tint = group.color)
                        }
                    }
                }
            }
        } else {
            Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Settings, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    Text("⚠️ Configuration non chargée", color = Color.White)
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = { onReloadConfig() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0))
                    ) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Recharger")
                    }
                }
            }
        }
    }
}

@Composable
fun ConfigGroupDetailScreen(
    group: ConfigGroup,
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    expandedSection: String?,
    onExpandSection: (String) -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(1.dp)
    ) {
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = group.color)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Retour", tint = Color.White)
                    }
                    Spacer(Modifier.width(8.dp))
                    Icon(group.icon, null, tint = Color.White, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(
                        group.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
        
        items(group.sections) { sectionKey ->
            if (configData?.containsKey(sectionKey) == true) {
                val sectionData = configData[sectionKey]
                val isExpanded = expandedSection == sectionKey
                
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                ) {
                    Column {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { onExpandSection(sectionKey) }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    getSectionDisplayName(sectionKey),
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    if (isExpanded) "Cliquez pour masquer" else "Cliquez pour afficher",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                            Icon(
                                if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                null,
                                tint = group.color
                            )
                        }
                        
                        if (isExpanded && sectionData != null) {
                            Divider(color = Color(0xFF2E2E2E))
                            Column(Modifier.padding(16.dp)) {
                                var jsonText by remember { mutableStateOf(sectionData.toString()) }
                                var isSaving by remember { mutableStateOf(false) }
                                
                                Text(
                                    "Contenu JSON (modifiable):",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                                Spacer(Modifier.height(8.dp))
                                
                                OutlinedTextField(
                                    value = jsonText,
                                    onValueChange = { jsonText = it },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(min = 150.dp, max = 300.dp),
                                    textStyle = MaterialTheme.typography.bodySmall.copy(
                                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                    ),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.LightGray
                                    )
                                )
                                
                                Spacer(Modifier.height(12.dp))
                                
                                Button(
                                    onClick = {
                                        scope.launch {
                                            isSaving = true
                                            withContext(Dispatchers.IO) {
                                                try {
                                                    val updates = json.parseToJsonElement(jsonText).jsonObject
                                                    api.putJson("/api/configs/$sectionKey", updates.toString())
                                                    withContext(Dispatchers.Main) {
                                                        snackbar.showSnackbar("✅ $sectionKey sauvegardé")
                                                    }
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                                    }
                                                } finally {
                                                    withContext(Dispatchers.Main) {
                                                        isSaving = false
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = group.color),
                                    enabled = !isSaving
                                ) {
                                    if (isSaving) {
                                        CircularProgressIndicator(
                                            color = Color.White,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    } else {
                                        Icon(Icons.Default.Save, null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Sauvegarder")
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

fun getSectionDisplayName(key: String): String {
    return when (key) {
        "economy" -> "💰 Économie"
        "tickets" -> "🎫 Tickets"
        "welcome" -> "👋 Bienvenue"
        "goodbye" -> "👋 Au revoir"
        "inactivity" -> "💤 Inactivité"
        "levels" -> "📈 Niveaux/XP"
        "logs" -> "📝 Logs"
        "autokick" -> "🦶 Auto-kick"
        "autothread" -> "🧵 Auto-thread"
        "categoryBanners" -> "🎨 Bannières catégories"
        "confess" -> "🤫 Confessions"
        "counting" -> "🔢 Comptage"
        "disboard" -> "📢 Disboard"
        "footerLogoUrl" -> "🖼️ Logo footer"
        "geo" -> "🌍 Géolocalisation"
        "quarantineRoleId" -> "🔒 Rôle quarantaine"
        "staffRoleIds" -> "👮 Rôles staff"
        "truthdare" -> "🎲 Action ou vérité"
        else -> "⚙️ $key"
    }
}

// Partie 3 - AdminScreenWithAccess et ConfigEditorScreen

@Composable
fun AdminScreenWithAccess(
    members: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var allowedUsers by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var selectedMember by remember { mutableStateOf<String?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }
    
    // Charger la liste des utilisateurs autorisés
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/admin/allowed-users")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    allowedUsers = data["allowedUsers"]?.jsonArray?.map {
                        it.jsonPrimitive.content
                    } ?: emptyList()
                }
                Log.d(TAG, "Allowed users loaded: ${allowedUsers.size}")
            } catch (e: Exception) {
                Log.e(TAG, "Error loading allowed users: ${e.message}")
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
    
    fun removeUser(userId: String) {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    api.deleteJson("/api/admin/allowed-users/$userId")
                    withContext(Dispatchers.Main) {
                        allowedUsers = allowedUsers.filter { it != userId }
                        snackbar.showSnackbar("✅ Utilisateur retiré")
                    }
                    Log.d(TAG, "User removed: $userId")
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing user: ${e.message}")
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                }
            }
        }
    }
    
    fun addUser(userId: String) {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val body = buildJsonObject { put("userId", userId) }
                    api.postJson("/api/admin/allowed-users", body.toString())
                    withContext(Dispatchers.Main) {
                        allowedUsers = allowedUsers + userId
                        snackbar.showSnackbar("✅ Utilisateur ajouté")
                        showAddDialog = false
                        selectedMember = null
                    }
                    Log.d(TAG, "User added: $userId")
                } catch (e: Exception) {
                    Log.e(TAG, "Error adding user: ${e.message}")
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                }
            }
        }
    }
    
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Ajouter un utilisateur") },
            text = {
                Column {
                    Text("Sélectionnez un membre à autoriser")
                    Spacer(Modifier.height(16.dp))
                    MemberSelector(
                        members = members.filterKeys { !allowedUsers.contains(it) },
                        selectedMemberId = selectedMember,
                        onMemberSelected = { selectedMember = it },
                        label = "Membre"
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedMember?.let { addUser(it) } },
                    enabled = selectedMember != null
                ) {
                    Text("Ajouter")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
    
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF9C27B0))
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Security,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(
                            "👑 Gestion des Accès",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "${allowedUsers.size} utilisateur(s) autorisé(s)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFE1BEE7)
                        )
                    }
                }
            }
        }
        
        item {
            Button(
                onClick = { showAddDialog = true },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
            ) {
                Icon(Icons.Default.PersonAdd, null)
                Spacer(Modifier.width(8.dp))
                Text("Ajouter un utilisateur")
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF9C27B0))
                }
            }
        } else {
            items(allowedUsers) { userId ->
                val memberName = members[userId] ?: "Utilisateur $userId"
                val isFounder = userId == "943487722738311219"
                
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isFounder) Color(0xFF2A2A2A) else Color(0xFF1E1E1E)
                    )
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (isFounder) Icons.Default.Star else Icons.Default.Person,
                                null,
                                tint = if (isFounder) Color(0xFFFFD700) else Color(0xFF9C27B0),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(
                                    memberName,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                if (isFounder) {
                                    Text(
                                        "👑 Fondateur (non supprimable)",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFFFFD700)
                                    )
                                } else {
                                    Text(
                                        "ID: $userId",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray
                                    )
                                }
                            }
                        }
                        
                        if (!isFounder) {
                            IconButton(
                                onClick = { removeUser(userId) }
                            ) {
                                Icon(
                                    Icons.Default.Delete,
                                    "Retirer l'accès",
                                    tint = Color(0xFFE53935)
                                )
                            }
                        }
                    }
                }
            }
        }
        
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(
                        "💡 Conseil",
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFF9800)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Les utilisateurs autorisés peuvent se connecter à l'application mobile et consulter les configurations du bot.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}

@Composable
fun ConfigEditorScreen(
    sectionKey: String,
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    onBack: () -> Unit,
    onConfigUpdated: (String) -> Unit
) {
    val sectionData = configData?.get(sectionKey)?.jsonObject
    var isSaving by remember { mutableStateOf(false) }
    
    // États pour économie
    var ecoStartAmount by remember { mutableStateOf("") }
    var ecoDailyAmount by remember { mutableStateOf("") }
    var ecoWeeklyAmount by remember { mutableStateOf("") }
    var ecoWorkMin by remember { mutableStateOf("") }
    var ecoWorkMax by remember { mutableStateOf("") }
    
    // États pour tickets
    var ticketsEnabled by remember { mutableStateOf(false) }
    var ticketsChannel by remember { mutableStateOf<String?>(null) }
    var ticketsCategory by remember { mutableStateOf<String?>(null) }
    var ticketsStaffRole by remember { mutableStateOf<String?>(null) }
    
    // États pour welcome/goodbye
    var welcomeEnabled by remember { mutableStateOf(false) }
    var welcomeChannel by remember { mutableStateOf<String?>(null) }
    var welcomeMessage by remember { mutableStateOf("") }
    var goodbyeEnabled by remember { mutableStateOf(false) }
    var goodbyeChannel by remember { mutableStateOf<String?>(null) }
    var goodbyeMessage by remember { mutableStateOf("") }
    
    // États pour inactivity
    var inactivityThresholdDays by remember { mutableStateOf("") }
    var inactivityExemptRoles by remember { mutableStateOf<List<String>>(emptyList()) }
    
    // Charger les données initiales
    LaunchedEffect(sectionData) {
        sectionData?.let { data ->
            when (sectionKey) {
                "economy" -> {
                    ecoStartAmount = data["startAmount"]?.jsonPrimitive?.contentOrNull ?: ""
                    ecoDailyAmount = data["dailyAmount"]?.jsonPrimitive?.contentOrNull ?: ""
                    ecoWeeklyAmount = data["weeklyAmount"]?.jsonPrimitive?.contentOrNull ?: ""
                    ecoWorkMin = data["workMin"]?.jsonPrimitive?.contentOrNull ?: ""
                    ecoWorkMax = data["workMax"]?.jsonPrimitive?.contentOrNull ?: ""
                }
                "tickets" -> {
                    ticketsEnabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    ticketsChannel = data["channelId"]?.jsonPrimitive?.contentOrNull
                    ticketsCategory = data["categoryId"]?.jsonPrimitive?.contentOrNull
                    ticketsStaffRole = data["staffRoleId"]?.jsonPrimitive?.contentOrNull
                }
                "welcome" -> {
                    welcomeEnabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    welcomeChannel = data["channelId"]?.jsonPrimitive?.contentOrNull
                    welcomeMessage = data["message"]?.jsonPrimitive?.contentOrNull ?: ""
                }
                "goodbye" -> {
                    goodbyeEnabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    goodbyeChannel = data["channelId"]?.jsonPrimitive?.contentOrNull
                    goodbyeMessage = data["message"]?.jsonPrimitive?.contentOrNull ?: ""
                }
                "inactivity" -> {
                    inactivityThresholdDays = data["thresholdDays"]?.jsonPrimitive?.contentOrNull ?: ""
                    inactivityExemptRoles = data["exemptRoles"]?.jsonArray?.map {
                        it.jsonPrimitive.content
                    } ?: emptyList()
                }
            }
        }
    }
    
    fun saveConfig() {
        scope.launch {
            isSaving = true
            withContext(Dispatchers.IO) {
                try {
                    val updates = buildJsonObject {
                        when (sectionKey) {
                            "economy" -> {
                                if (ecoStartAmount.isNotBlank()) put("startAmount", ecoStartAmount.toIntOrNull() ?: 0)
                                if (ecoDailyAmount.isNotBlank()) put("dailyAmount", ecoDailyAmount.toIntOrNull() ?: 0)
                                if (ecoWeeklyAmount.isNotBlank()) put("weeklyAmount", ecoWeeklyAmount.toIntOrNull() ?: 0)
                                if (ecoWorkMin.isNotBlank()) put("workMin", ecoWorkMin.toIntOrNull() ?: 0)
                                if (ecoWorkMax.isNotBlank()) put("workMax", ecoWorkMax.toIntOrNull() ?: 0)
                            }
                            "tickets" -> {
                                put("enabled", ticketsEnabled)
                                ticketsChannel?.let { put("channelId", it) }
                                ticketsCategory?.let { put("categoryId", it) }
                                ticketsStaffRole?.let { put("staffRoleId", it) }
                            }
                            "welcome" -> {
                                put("enabled", welcomeEnabled)
                                welcomeChannel?.let { put("channelId", it) }
                                if (welcomeMessage.isNotBlank()) put("message", welcomeMessage)
                            }
                            "goodbye" -> {
                                put("enabled", goodbyeEnabled)
                                goodbyeChannel?.let { put("channelId", it) }
                                if (goodbyeMessage.isNotBlank()) put("message", goodbyeMessage)
                            }
                            "inactivity" -> {
                                if (inactivityThresholdDays.isNotBlank()) {
                                    put("thresholdDays", inactivityThresholdDays.toIntOrNull() ?: 30)
                                }
                                put("exemptRoles", JsonArray(inactivityExemptRoles.map { JsonPrimitive(it) }))
                            }
                        }
                    }
                    
                    api.putJson("/api/configs/$sectionKey", updates.toString())
                    
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("✅ Configuration sauvegardée")
                        onConfigUpdated(sectionKey)
                    }
                    Log.d(TAG, "Config saved: $sectionKey")
                } catch (e: Exception) {
                    Log.e(TAG, "Error saving config: ${e.message}")
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        isSaving = false
                    }
                }
            }
        }
    }
    
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(
                        when (sectionKey) {
                            "economy" -> "💰 Configuration Économie"
                            "tickets" -> "🎫 Configuration Tickets"
                            "welcome" -> "👋 Configuration Bienvenue"
                            "goodbye" -> "👋 Configuration Au revoir"
                            "inactivity" -> "💤 Configuration Inactivité"
                            else -> "Configuration: $sectionKey"
                        },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Modifiez les paramètres ci-dessous",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray
                    )
                }
            }
        }
        
        // Formulaires spécifiques à chaque section
        when (sectionKey) {
            "economy" -> {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Montants de départ et gains", fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(12.dp))
                            
                            OutlinedTextField(
                                value = ecoStartAmount,
                                onValueChange = { ecoStartAmount = it },
                                label = { Text("Montant de départ") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = ecoDailyAmount,
                                onValueChange = { ecoDailyAmount = it },
                                label = { Text("Gain journalier") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = ecoWeeklyAmount,
                                onValueChange = { ecoWeeklyAmount = it },
                                label = { Text("Gain hebdomadaire") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = ecoWorkMin,
                                onValueChange = { ecoWorkMin = it },
                                label = { Text("Gain travail (min)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = ecoWorkMax,
                                onValueChange = { ecoWorkMax = it },
                                label = { Text("Gain travail (max)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
            
            "tickets" -> {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Système activé", fontWeight = FontWeight.Bold, color = Color.White)
                                Switch(
                                    checked = ticketsEnabled,
                                    onCheckedChange = { ticketsEnabled = it }
                                )
                            }
                            
                            Spacer(Modifier.height(16.dp))
                            
                            ChannelSelector(
                                channels = channels,
                                selectedChannelId = ticketsChannel,
                                onChannelSelected = { ticketsChannel = it },
                                label = "Salon des tickets"
                            )
                            
                            Spacer(Modifier.height(12.dp))
                            
                            ChannelSelector(
                                channels = channels,
                                selectedChannelId = ticketsCategory,
                                onChannelSelected = { ticketsCategory = it },
                                label = "Catégorie des tickets"
                            )
                            
                            Spacer(Modifier.height(12.dp))
                            
                            RoleSelector(
                                roles = roles,
                                selectedRoleId = ticketsStaffRole,
                                onRoleSelected = { ticketsStaffRole = it },
                                label = "Rôle staff"
                            )
                        }
                    }
                }
            }
            
            "welcome" -> {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Messages de bienvenue", fontWeight = FontWeight.Bold, color = Color.White)
                                Switch(
                                    checked = welcomeEnabled,
                                    onCheckedChange = { welcomeEnabled = it }
                                )
                            }
                            
                            Spacer(Modifier.height(16.dp))
                            
                            ChannelSelector(
                                channels = channels,
                                selectedChannelId = welcomeChannel,
                                onChannelSelected = { welcomeChannel = it },
                                label = "Salon de bienvenue"
                            )
                            
                            Spacer(Modifier.height(12.dp))
                            
                            OutlinedTextField(
                                value = welcomeMessage,
                                onValueChange = { welcomeMessage = it },
                                label = { Text("Message de bienvenue") },
                                placeholder = { Text("Bienvenue {user} !") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 3
                            )
                        }
                    }
                }
            }
            
            "goodbye" -> {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Messages au revoir", fontWeight = FontWeight.Bold, color = Color.White)
                                Switch(
                                    checked = goodbyeEnabled,
                                    onCheckedChange = { goodbyeEnabled = it }
                                )
                            }
                            
                            Spacer(Modifier.height(16.dp))
                            
                            ChannelSelector(
                                channels = channels,
                                selectedChannelId = goodbyeChannel,
                                onChannelSelected = { goodbyeChannel = it },
                                label = "Salon au revoir"
                            )
                            
                            Spacer(Modifier.height(12.dp))
                            
                            OutlinedTextField(
                                value = goodbyeMessage,
                                onValueChange = { goodbyeMessage = it },
                                label = { Text("Message au revoir") },
                                placeholder = { Text("Au revoir {user}...") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 3
                            )
                        }
                    }
                }
            }
            
            "inactivity" -> {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Seuil d'inactivité", fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(12.dp))
                            
                            OutlinedTextField(
                                value = inactivityThresholdDays,
                                onValueChange = { inactivityThresholdDays = it },
                                label = { Text("Nombre de jours") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            
                            Spacer(Modifier.height(16.dp))
                            Text("Rôles exempts (${inactivityExemptRoles.size})", color = Color.Gray)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Fonctionnalité de sélection multiple à venir",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFFF9800)
                            )
                        }
                    }
                }
            }
        }
        
        item {
            Button(
                onClick = { saveConfig() },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                } else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder les modifications")
                }
            }
        }
    }
}
