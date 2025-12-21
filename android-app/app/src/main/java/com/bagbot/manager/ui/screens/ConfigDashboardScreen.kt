@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.bagbot.manager.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed as itemsIndexedGrid
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.ChannelSelector
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.ui.components.RoleSelector
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private const val TAG = "BAG_CONFIG"

private enum class DashTab(val label: String) {
    Dashboard("🏠 Dashboard"),
    Economy("💰 Économie"),
    Levels("📈 Niveaux"),
    Booster("🚀 Booster"),
    Counting("🔢 Comptage"),
    TruthDare("🎲 A/V"),
    Actions("🎬 Actions"),
    Tickets("🎫 Tickets"),
    Logs("📝 Logs"),
    Confess("💬 Confess"),
    Welcome("👋 Welcome"),
    Goodbye("😢 Goodbye"),
    Staff("👥 Staff"),
    AutoKick("👢 AutoKick"),
    Inactivity("⏰ Inactivité"),
    AutoThread("🧵 AutoThread"),
    Disboard("📢 Disboard"),
    Geo("🌍 Géo"),
    Backups("💾 Backups"),
    Control("🎮 Contrôle"),
    Music("🎵 Musique"),
    Raw("🧾 JSON Brut"),
}

@Composable
fun ConfigDashboardScreen(
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    isLoading: Boolean,
    onReloadConfig: () -> Unit,
) {
    var selectedTab by remember { mutableStateOf<DashTab?>(null) }
    val tabs = remember { DashTab.entries }

    Column(Modifier.fillMaxSize()) {
        // Header actions
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Back button when a category is selected
                if (selectedTab != null) {
                    IconButton(onClick = { selectedTab = null }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                    }
                    Spacer(Modifier.width(8.dp))
                }
                Column {
                    Text(
                        if (selectedTab == null) "⚙️ Configuration (dashboard)" else "⚙️ ${selectedTab?.label}",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        "${members.size} membres • ${channels.size} salons • ${roles.size} rôles",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }
            IconButton(onClick = onReloadConfig, enabled = !isLoading) {
                Icon(Icons.Default.Refresh, contentDescription = "Recharger", tint = Color.White)
            }
        }

        if (isLoading && configData == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        // Show grid of category cards or selected category content
        if (selectedTab == null) {
            // Grid view of categories
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                itemsIndexedGrid(tabs) { _, tab ->
                    CategoryCard(
                        label = tab.label,
                        onClick = { selectedTab = tab }
                    )
                }
            }
        } else {
            // Show selected category content
            when (selectedTab) {
                DashTab.Dashboard -> DashboardTab(configData, members, api, json, scope, snackbar)
                DashTab.Economy -> EconomyConfigTab(configData, members, api, json, scope, snackbar)
                DashTab.Levels -> LevelsConfigTab(configData, roles, api, json, scope, snackbar)
                DashTab.Booster -> BoosterConfigTab(configData, roles, api, json, scope, snackbar)
                DashTab.Counting -> CountingConfigTab(configData, channels, api, json, scope, snackbar)
                DashTab.TruthDare -> TruthDareConfigTab(channels, api, json, scope, snackbar)
                DashTab.Actions -> ActionsConfigTab(configData, api, json, scope, snackbar)
                DashTab.Tickets -> TicketsConfigTab(configData, channels, roles, api, json, scope, snackbar)
                DashTab.Logs -> LogsConfigTab(configData, members, channels, roles, api, json, scope, snackbar)
                DashTab.Confess -> ConfessConfigTab(configData, channels, api, json, scope, snackbar)
                DashTab.Welcome -> WelcomeConfigTab(api, json, channels, scope, snackbar)
                DashTab.Goodbye -> GoodbyeConfigTab(api, json, channels, scope, snackbar)
                DashTab.Staff -> StaffConfigTab(configData, roles, api, json, scope, snackbar)
                DashTab.AutoKick -> AutoKickConfigTab(configData, roles, api, json, scope, snackbar)
                DashTab.Inactivity -> InactivityConfigTab(members, roles, api, json, scope, snackbar)
                DashTab.AutoThread -> AutoThreadConfigTab(configData, channels, api, json, scope, snackbar)
                DashTab.Disboard -> DisboardConfigTab(configData, channels, api, json, scope, snackbar)
                DashTab.Geo -> GeoConfigTab(configData, members)
                DashTab.Backups -> BackupsTab(api, json, scope, snackbar)
                DashTab.Control -> ControlTab(api, json, scope, snackbar)
                DashTab.Music -> MusicTab(api, json, scope, snackbar)
                DashTab.Raw -> RawConfigTab(configData, json)
                null -> {} // Should not happen
            }
        }
    }
}

@Composable
private fun CategoryCard(
    label: String,
    onClick: () -> Unit
) {
    val icon = when (label) {
        "🏠 Dashboard" -> Icons.Default.Dashboard
        "💰 Économie" -> Icons.Default.MonetizationOn
        "📊 Niveaux" -> Icons.Default.TrendingUp
        "🚀 Booster" -> Icons.Default.Rocket
        "🔢 Comptage" -> Icons.Default.Calculate
        "🎲 Action ou Vérité" -> Icons.Default.Casino
        "🎭 Actions" -> Icons.Default.SportsEsports
        "🎟️ Tickets" -> Icons.Default.ConfirmationNumber
        "📝 Logs" -> Icons.Default.Article
        "🤫 Confessions" -> Icons.Default.Lock
        "👋 Bienvenue" -> Icons.Default.WavingHand
        "👋 Au revoir" -> Icons.Default.ExitToApp
        "🌍 Géolocalisation" -> Icons.Default.Place
        "🎵 Musique" -> Icons.Default.MusicNote
        "💾 Backups" -> Icons.Default.Storage
        "⚙️ Contrôle" -> Icons.Default.Settings
        else -> Icons.Default.Settings
    }
    
    val gradient = androidx.compose.ui.graphics.Brush.verticalGradient(
        colors = listOf(
            Color(0xFF2E2E2E),
            Color(0xFF1A1A1A)
        )
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E1E1E)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(gradient)
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Icon with background circle
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(
                            color = Color(0xFF5865F2).copy(alpha = 0.2f),
                            shape = androidx.compose.foundation.shape.CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = Color(0xFF5865F2),
                        modifier = Modifier.size(32.dp)
                    )
                }
                
                Spacer(Modifier.height(12.dp))
                
                Text(
                    text = label,
                    color = Color.White,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 2
                )
            }
        }
    }
}

// ------------------------
// Helpers
// ------------------------

private fun JsonObject.obj(key: String): JsonObject? = this[key]?.jsonObject
private fun JsonObject.arr(key: String): JsonArray? = this[key]?.jsonArray
private fun JsonObject.str(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull
private fun JsonObject.bool(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull
private fun JsonObject.int(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull
private fun JsonObject.double(key: String): Double? = this[key]?.jsonPrimitive?.doubleOrNull

@Composable
private fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White)
            if (!subtitle.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun RemovableIdRow(
    label: String,
    id: String,
    resolvedName: String?,
    onRemove: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, color = Color.White, fontWeight = FontWeight.SemiBold)
            Text(
                resolvedName ?: id,
                color = Color.Gray,
                style = MaterialTheme.typography.bodySmall
            )
        }
        IconButton(onClick = onRemove) {
            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
        }
    }
}

private suspend fun postOrPutSection(
    api: ApiClient,
    json: Json,
    primaryPostPath: String,
    primaryBody: JsonObject,
    fallbackSectionKey: String,
    fallbackSectionBody: JsonObject,
) {
    try {
        api.postJson(primaryPostPath, json.encodeToString(JsonObject.serializer(), primaryBody))
    } catch (e: Exception) {
        Log.w(TAG, "POST failed ($primaryPostPath): ${e.message} -> fallback PUT /api/configs/$fallbackSectionKey")
        api.putJson("/api/configs/$fallbackSectionKey", json.encodeToString(JsonObject.serializer(), fallbackSectionBody))
    }
}

// ------------------------
// Tabs
// ------------------------

@Composable
private fun DashboardTab(
    configData: JsonObject?,
    members: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val levels = configData?.obj("levels")
    val ecoBalances = eco?.obj("balances")
    val levelsUsers = levels?.obj("users")  // Corrigé: "users" au lieu de "data"
    
    // États pour les statistiques
    var totalMembers by remember { mutableIntStateOf(members.size) }
    var totalHumans by remember { mutableIntStateOf(members.size) }
    var totalBots by remember { mutableIntStateOf(0) }
    var ecoUsers by remember { mutableIntStateOf(ecoBalances?.jsonObject?.size ?: 0) }
    var levelUsers by remember { mutableIntStateOf(levelsUsers?.jsonObject?.size ?: 0) }
    var isLoadingStats by remember { mutableStateOf(false) }
    
    fun loadStats() {
        scope.launch {
            isLoadingStats = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/dashboard/stats")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    withContext(Dispatchers.Main) {
                        totalMembers = obj["totalMembers"]?.jsonPrimitive?.intOrNull ?: members.size
                        totalHumans = obj["totalHumans"]?.jsonPrimitive?.intOrNull ?: members.size
                        totalBots = obj["totalBots"]?.jsonPrimitive?.intOrNull ?: 0
                        ecoUsers = obj["ecoUsers"]?.jsonPrimitive?.intOrNull ?: (ecoBalances?.jsonObject?.size ?: 0)
                        levelUsers = obj["levelUsers"]?.jsonPrimitive?.intOrNull ?: (levelsUsers?.jsonObject?.size ?: 0)
                    }
                } catch (e: Exception) {
                    // Fallback aux données locales si l'endpoint n'existe pas
                    withContext(Dispatchers.Main) {
                        totalMembers = members.size
                        totalHumans = members.size
                        totalBots = 0
                        ecoUsers = ecoBalances?.jsonObject?.size ?: 0
                        levelUsers = levelsUsers?.jsonObject?.size ?: 0
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoadingStats = false }
                }
            }
        }
    }
    
    var connectedUsers by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var isLoadingUsers by remember { mutableStateOf(false) }
    
    fun loadConnectedUsers() {
        scope.launch {
            isLoadingUsers = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/admin/sessions")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val sessions = obj["sessions"]?.jsonArray?.mapNotNull {
                        val session = it.jsonObject
                        val userId = session["userId"]?.jsonPrimitive?.contentOrNull
                        val lastSeen = session["lastSeen"]?.jsonPrimitive?.contentOrNull
                        if (userId != null && lastSeen != null) Pair(userId, lastSeen) else null
                    } ?: emptyList()
                    withContext(Dispatchers.Main) {
                        connectedUsers = sessions
                    }
                } catch (e: Exception) {
                    // Silently fail if endpoint doesn't exist
                    withContext(Dispatchers.Main) {
                        connectedUsers = emptyList()
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoadingUsers = false }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) { 
        loadStats()
        loadConnectedUsers()
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                "📊 Dashboard",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
        
        // Grid of statistics cards
        item {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.height(600.dp)
            ) {
                // Membres Total
                item {
                    StatCard(
                        title = "👥 Membres Total",
                        value = totalMembers.toString(),
                        color = Color(0xFF5865F2)
                    )
                }
                
                // Humains
                item {
                    StatCard(
                        title = "😊 Humains",
                        value = totalHumans.toString(),
                        color = Color(0xFF57F287)
                    )
                }
                
                // Bots
                item {
                    StatCard(
                        title = "🤖 Bots",
                        value = totalBots.toString(),
                        color = Color(0xFFED4245)
                    )
                }
                
                // Économie
                item {
                    StatCard(
                        title = "💰 Économie",
                        value = ecoUsers.toString(),
                        color = Color(0xFFFEE75C),
                        textColor = Color.Black
                    )
                }
                
                // Niveaux
                item {
                    StatCard(
                        title = "📊 Niveaux",
                        value = levelUsers.toString(),
                        color = Color(0xFF9B59B6)
                    )
                }
                
                // Connectés
                item {
                    StatCard(
                        title = "🟢 Connectés",
                        value = connectedUsers.size.toString(),
                        color = Color(0xFF57F287),
                        textColor = Color.Black
                    )
                }
            }
        }
        
        // Connected users section
        item {
            SectionCard(
                title = "🟢 Membres Connectés",
                subtitle = "${connectedUsers.size} en ligne"
            ) {
                if (isLoadingUsers) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (connectedUsers.isEmpty()) {
                    Text(
                        "Aucun membre connecté actuellement",
                        color = Color.Gray,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(8.dp)
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        connectedUsers.take(10).forEach { (userId, lastSeen) ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        members[userId] ?: "Membre inconnu",
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White
                                    )
                                    Text(
                                        "Vu: $lastSeen",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(Color(0xFF57F287), shape = androidx.compose.foundation.shape.CircleShape)
                                )
                            }
                            if (connectedUsers.indexOf(Pair(userId, lastSeen)) < connectedUsers.size - 1) {
                                Divider(color = Color(0xFF2A2A2A))
                            }
                        }
                        if (connectedUsers.size > 10) {
                            Text(
                                "+ ${connectedUsers.size - 10} autres membres",
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                    }
                }
            }
        }
        
        item {
            Button(
                onClick = {
                    scope.launch {
                        try {
                            loadStats()
                            loadConnectedUsers()
                            snackbar.showSnackbar("🔄 Rechargé")
                        } catch (e: Exception) {
                            snackbar.showSnackbar("❌ Erreur: ${e.message}")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Recharger")
                Spacer(Modifier.width(8.dp))
                Text("Rafraîchir les données")
            }
        }
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    color: Color,
    textColor: Color = Color.White
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        colors = CardDefaults.cardColors(containerColor = color),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = textColor.copy(alpha = 0.9f),
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.displaySmall,
                    color = textColor,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun EconomyConfigTab(
    configData: JsonObject?,
    members: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var selectedSubTab by remember { mutableIntStateOf(0) }
    val subTabs = listOf("Settings", "Actions", "Users", "Boutique", "Karma", "Suites")
    
    val eco = configData?.obj("economy")
    val settings = eco?.obj("settings")
    val currency = eco?.obj("currency")

    var emoji by remember { mutableStateOf(settings?.str("emoji") ?: "💰") }
    var currencyName by remember { mutableStateOf(currency?.str("name") ?: "BAG$") }

    // Cooldowns (settings.cooldowns: object of key -> seconds)
    val initialCooldowns = remember(settings) {
        settings?.obj("cooldowns")?.mapValues { it.value.jsonPrimitive.intOrNull ?: 0 } ?: emptyMap()
    }
    var cooldowns by remember(initialCooldowns) { mutableStateOf(initialCooldowns) }
    var newCooldownKey by remember { mutableStateOf("") }
    var newCooldownValue by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        // Sub-tabs
        ScrollableTabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color(0xFF1E1E1E),
            contentColor = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            subTabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedSubTab == index,
                    onClick = { selectedSubTab = index },
                    text = { Text(title) }
                )
            }
        }
        
        when (selectedSubTab) {
            0 -> {
                // Settings
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        SectionCard(
                            title = "💰 Paramètres Économie",
                            subtitle = "Emoji + devise"
                        ) {
                            OutlinedTextField(
                                value = emoji,
                                onValueChange = { emoji = it },
                                label = { Text("Emoji") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(10.dp))
                            OutlinedTextField(
                                value = currencyName,
                                onValueChange = { currencyName = it },
                                label = { Text("Devise") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("settings", buildJsonObject {
                                                    put("emoji", emoji)
                                                    put("cooldowns", buildJsonObject {
                                                        cooldowns.forEach { (k, v) -> put(k, v) }
                                                    })
                                                })
                                                put("currency", buildJsonObject { put("name", currencyName) })
                                            }
                                            api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) {
                                                snackbar.showSnackbar("✅ Settings sauvegardés")
                                            }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) {
                                                snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                            }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Settings")
                            }
                        }
                    }
                }
            }
            1 -> {
                // Actions - Configuration complète
                val actionsList = eco?.obj("actions")?.obj("list")
                val actionsKeys = remember(actionsList) {
                    actionsList?.jsonObject?.keys?.toList()?.sorted() ?: emptyList()
                }
                
                var selectedActionKey by remember { mutableStateOf(actionsKeys.firstOrNull() ?: "") }
                val selectedAction = remember(selectedActionKey, actionsList) {
                    actionsList?.obj(selectedActionKey)
                }
                
                // États pour l'action sélectionnée
                var label by remember(selectedActionKey) { mutableStateOf(selectedAction?.str("label") ?: "") }
                var image by remember(selectedActionKey) { mutableStateOf(selectedAction?.str("image") ?: "") }
                var moneyMin by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("moneyMin")?.toString() ?: "0") }
                var moneyMax by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("moneyMax")?.toString() ?: "0") }
                var karma by remember(selectedActionKey) { mutableStateOf(selectedAction?.str("karma") ?: "none") }
                var karmaDelta by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("karmaDelta")?.toString() ?: "0") }
                var xpDelta by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("xpDelta")?.toString() ?: "0") }
                var successRate by remember(selectedActionKey) { mutableStateOf(selectedAction?.double("successRate")?.toString() ?: "1.0") }
                var failMoneyMin by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("failMoneyMin")?.toString() ?: "0") }
                var failMoneyMax by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("failMoneyMax")?.toString() ?: "0") }
                var failKarmaDelta by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("failKarmaDelta")?.toString() ?: "0") }
                var failXpDelta by remember(selectedActionKey) { mutableStateOf(selectedAction?.int("failXpDelta")?.toString() ?: "0") }
                var partnerMoney by remember(selectedActionKey) { mutableStateOf(((selectedAction?.double("partnerMoneyShare") ?: 0.0) * 100).toString()) }
                var partnerKarma by remember(selectedActionKey) { mutableStateOf(((selectedAction?.double("partnerKarmaShare") ?: 0.0) * 100).toString()) }
                var partnerXp by remember(selectedActionKey) { mutableStateOf(((selectedAction?.double("partnerXpShare") ?: 0.0) * 100).toString()) }
                var cooldown by remember(selectedActionKey) { mutableStateOf(cooldowns[selectedActionKey]?.toString() ?: "0") }
                
                var savingAction by remember { mutableStateOf(false) }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text("🎭 Sélectionner une action", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                
                                var expanded by remember { mutableStateOf(false) }
                                Box {
                                    OutlinedButton(
                                        onClick = { expanded = true },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(label.ifBlank { selectedActionKey }, modifier = Modifier.weight(1f))
                                        Icon(if (expanded) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown, null)
                                    }
                                    androidx.compose.material3.DropdownMenu(
                                        expanded = expanded,
                                        onDismissRequest = { expanded = false },
                                        modifier = Modifier.fillMaxWidth(0.9f)
                                    ) {
                                        actionsKeys.forEach { key ->
                                            androidx.compose.material3.DropdownMenuItem(
                                                text = { Text(actionsList?.obj(key)?.str("label") ?: key) },
                                                onClick = {
                                                    selectedActionKey = key
                                                    expanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Infos de base
                    item {
                        SectionCard(title = "📝 Informations", subtitle = "Label & Image") {
                            OutlinedTextField(label, { label = it }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(image, { image = it }, label = { Text("URL Image/GIF") }, modifier = Modifier.fillMaxWidth())
                        }
                    }
                    
                    // Gains succès
                    item {
                        SectionCard(title = "✅ Gains Succès") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    moneyMin, { moneyMin = it }, label = { Text("Argent Min") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                                OutlinedTextField(
                                    moneyMax, { moneyMax = it }, label = { Text("Argent Max") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                xpDelta, { xpDelta = it }, label = { Text("XP") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    
                    // Karma
                    item {
                        SectionCard(title = "💫 Karma") {
                            Text("Type de Karma", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("none" to "Aucun", "charm" to "Charme", "perversion" to "Perversion").forEach { (value, label) ->
                                    FilterChip(
                                        selected = karma == value,
                                        onClick = { karma = value },
                                        label = { Text(label) }
                                    )
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                karmaDelta, { karmaDelta = it }, label = { Text("Karma Δ") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    
                    // Taux succès
                    item {
                        SectionCard(title = "🎯 Taux de Succès") {
                            OutlinedTextField(
                                successRate, { successRate = it }, label = { Text("Taux (0.0 à 1.0)") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal)
                            )
                            Text("Ex: 0.8 = 80% de réussite", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    
                    // Gains échec
                    item {
                        SectionCard(title = "❌ Gains Échec") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    failMoneyMin, { failMoneyMin = it }, label = { Text("Argent Min") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                                OutlinedTextField(
                                    failMoneyMax, { failMoneyMax = it }, label = { Text("Argent Max") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    failKarmaDelta, { failKarmaDelta = it }, label = { Text("Karma Δ") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                                OutlinedTextField(
                                    failXpDelta, { failXpDelta = it }, label = { Text("XP") },
                                    modifier = Modifier.weight(1f),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                            }
                        }
                    }
                    
                    // Parts partenaire
                    item {
                        SectionCard(title = "👥 Parts Partenaire (%)") {
                            OutlinedTextField(
                                partnerMoney, { partnerMoney = it }, label = { Text("Argent %") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                partnerKarma, { partnerKarma = it }, label = { Text("Karma %") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                partnerXp, { partnerXp = it }, label = { Text("XP %") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    
                    // Cooldown
                    item {
                        SectionCard(title = "⏱️ Cooldown") {
                            OutlinedTextField(
                                cooldown, { cooldown = it }, label = { Text("Secondes") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    
                    // Save
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    savingAction = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val actionData = buildJsonObject {
                                                put("label", label)
                                                put("image", image)
                                                put("moneyMin", moneyMin.toIntOrNull() ?: 0)
                                                put("moneyMax", moneyMax.toIntOrNull() ?: 0)
                                                put("karma", karma)
                                                put("karmaDelta", karmaDelta.toIntOrNull() ?: 0)
                                                put("xpDelta", xpDelta.toIntOrNull() ?: 0)
                                                put("successRate", successRate.toDoubleOrNull() ?: 1.0)
                                                put("failMoneyMin", failMoneyMin.toIntOrNull() ?: 0)
                                                put("failMoneyMax", failMoneyMax.toIntOrNull() ?: 0)
                                                put("failKarmaDelta", failKarmaDelta.toIntOrNull() ?: 0)
                                                put("failXpDelta", failXpDelta.toIntOrNull() ?: 0)
                                                put("partnerMoneyShare", (partnerMoney.toDoubleOrNull() ?: 0.0) / 100.0)
                                                put("partnerKarmaShare", (partnerKarma.toDoubleOrNull() ?: 0.0) / 100.0)
                                                put("partnerXpShare", (partnerXp.toDoubleOrNull() ?: 0.0) / 100.0)
                                            }
                                            
                                            val body = buildJsonObject {
                                                put("actions", buildJsonObject {
                                                    put("list", buildJsonObject {
                                                        put(selectedActionKey, actionData)
                                                    })
                                                })
                                                put("settings", buildJsonObject {
                                                    put("cooldowns", buildJsonObject {
                                                        put(selectedActionKey, cooldown.toIntOrNull() ?: 0)
                                                    })
                                                })
                                            }
                                            
                                            api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Action sauvegardée") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { savingAction = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !savingAction
                        ) {
                            if (savingAction) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Action")
                            }
                        }
                    }
                }
            }
            2 -> {
                // Users list (read-only for now)
                val balances = eco?.obj("balances")
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Text(
                            "👥 Utilisateurs Économie",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${balances?.jsonObject?.size ?: 0} utilisateurs actifs",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }
                    
                    balances?.jsonObject?.entries?.sortedByDescending { 
                        it.value.jsonObject["amount"]?.jsonPrimitive?.intOrNull ?: 0 
                    }?.forEach { (userId, userData) ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(
                                        members[userId] ?: "Utilisateur inconnu",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Text(
                                        "ID: ${userId.takeLast(8)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Text(
                                            "💰 ${userData.jsonObject["amount"]?.jsonPrimitive?.intOrNull ?: 0} $currencyName",
                                            color = Color(0xFF57F287),
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        userData.jsonObject["charm"]?.jsonPrimitive?.intOrNull?.let {
                                            Text("🫦 $it", color = Color(0xFFEB459E))
                                        }
                                        userData.jsonObject["perversion"]?.jsonPrimitive?.intOrNull?.let {
                                            Text("😈 $it", color = Color(0xFF9B59B6))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            3 -> {
                // Boutique - Ajout/Modif/Suppression d'objets
                val shopData = eco?.obj("shop")
                var shopItems by remember(shopData) {
                    mutableStateOf(shopData?.arr("items")?.mapNotNull { it.jsonObject }?.toMutableList() ?: mutableListOf())
                }
                
                var showAddDialog by remember { mutableStateOf(false) }
                var editingIndex by remember { mutableStateOf<Int?>(null) }
                var newItemId by remember { mutableStateOf("") }
                var newItemName by remember { mutableStateOf("") }
                var newItemPrice by remember { mutableStateOf("") }
                var newItemEmoji by remember { mutableStateOf("") }
                var savingShop by remember { mutableStateOf(false) }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    "🛒 Boutique",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    "${shopItems.size} objet(s)",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.Gray
                                )
                            }
                            Button(onClick = {
                                newItemId = ""
                                newItemName = ""
                                newItemPrice = ""
                                newItemEmoji = ""
                                editingIndex = null
                                showAddDialog = true
                            }) {
                                Icon(Icons.Default.Add, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Ajouter")
                            }
                        }
                    }
                    
                    if (shopItems.isNotEmpty()) {
                        itemsIndexed(shopItems) { index, item ->
                            val emoji = item["emoji"]?.jsonPrimitive?.contentOrNull ?: "🎁"
                            val name = item["name"]?.jsonPrimitive?.contentOrNull ?: ""
                            val itemId = item["id"]?.jsonPrimitive?.contentOrNull ?: ""
                            val price = item["price"]?.jsonPrimitive?.intOrNull ?: 0
                            
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(emoji, style = MaterialTheme.typography.headlineMedium)
                                        Column {
                                            Text(name, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text("ID: $itemId", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("$price $currencyName", color = Color(0xFF57F287), fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                    Row {
                                        IconButton(onClick = {
                                            newItemId = itemId
                                            newItemName = name
                                            newItemPrice = price.toString()
                                            newItemEmoji = emoji
                                            editingIndex = index
                                            showAddDialog = true
                                        }) {
                                            Icon(Icons.Default.Edit, null, tint = Color(0xFF5865F2))
                                        }
                                        IconButton(onClick = { shopItems.removeAt(index) }) {
                                            Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        item {
                            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
                                Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("🛒", style = MaterialTheme.typography.displayLarge)
                                        Spacer(Modifier.height(16.dp))
                                        Text("Aucun objet dans la boutique", color = Color.Gray, textAlign = TextAlign.Center)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Save button
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    savingShop = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("shop", buildJsonObject {
                                                    put("items", JsonArray(shopItems.map { buildJsonObject {
                                                        put("id", it["id"]?.jsonPrimitive?.contentOrNull ?: "")
                                                        put("name", it["name"]?.jsonPrimitive?.contentOrNull ?: "")
                                                        put("price", it["price"]?.jsonPrimitive?.intOrNull ?: 0)
                                                        put("emoji", it["emoji"]?.jsonPrimitive?.contentOrNull ?: "")
                                                    }}))
                                                    put("roles", JsonArray(emptyList()))
                                                    put("grants", buildJsonObject {})
                                                })
                                            }
                                            api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Boutique sauvegardée") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { savingShop = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !savingShop
                        ) {
                            if (savingShop) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Boutique")
                            }
                        }
                    }
                }
                
                // Dialog Add/Edit
                if (showAddDialog) {
                    AlertDialog(
                        onDismissRequest = { showAddDialog = false },
                        title = { Text(if (editingIndex != null) "Modifier l'objet" else "Ajouter un objet") },
                        text = {
                            Column {
                                OutlinedTextField(newItemId, { newItemId = it }, label = { Text("ID (ex: item-1)") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(newItemName, { newItemName = it }, label = { Text("Nom") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    newItemPrice, { newItemPrice = it }, label = { Text("Prix") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(newItemEmoji, { newItemEmoji = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
                            }
                        },
                        confirmButton = {
                            Button(onClick = {
                                val newItem = buildJsonObject {
                                    put("id", newItemId)
                                    put("name", newItemName)
                                    put("price", newItemPrice.toIntOrNull() ?: 0)
                                    put("emoji", newItemEmoji)
                                }
                                if (editingIndex != null) {
                                    shopItems[editingIndex!!] = newItem
                                } else {
                                    shopItems.add(newItem)
                                }
                                showAddDialog = false
                            }, enabled = newItemId.isNotBlank() && newItemName.isNotBlank()) {
                                Text(if (editingIndex != null) "Modifier" else "Ajouter")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showAddDialog = false }) {
                                Text("Annuler")
                            }
                        }
                    )
                }
            }
            4 -> {
                // Karma - Configuration complète
                val karmaModifiers = eco?.obj("karmaModifiers")
                val karmaReset = eco?.obj("karmaReset")
                
                var resetEnabled by remember { mutableStateOf(karmaReset?.bool("enabled") ?: false) }
                var resetDay by remember { mutableStateOf(karmaReset?.int("day")?.toString() ?: "1") }
                
                var selectedKarmaTab by remember { mutableIntStateOf(0) }
                var savingKarma by remember { mutableStateOf(false) }
                
                // Pré-calculer toutes les listes AVANT LazyColumn
                val shopMods = remember(karmaModifiers) {
                    karmaModifiers?.arr("shop")?.mapNotNull { it.jsonObject } ?: emptyList()
                }
                val actionMods = remember(karmaModifiers) {
                    karmaModifiers?.arr("actions")?.mapNotNull { it.jsonObject } ?: emptyList()
                }
                val grants = remember(karmaModifiers) {
                    karmaModifiers?.arr("grants")?.mapNotNull { it.jsonObject } ?: emptyList()
                }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text("💫 Karma", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Configuration des modificateurs et reset", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                    }
                    
                    // Reset auto
                    item {
                        SectionCard(title = "🔄 Reset Automatique", subtitle = if (resetEnabled) "Actif" else "Inactif") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Reset automatique", color = Color.White)
                                Switch(checked = resetEnabled, onCheckedChange = { resetEnabled = it })
                            }
                            if (resetEnabled) {
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    resetDay, { resetDay = it }, label = { Text("Jour du mois (1-28)") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                            }
                        }
                    }
                    
                    // Tabs pour modifiers
                    item {
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
                            Column {
                                TabRow(selectedTabIndex = selectedKarmaTab, containerColor = Color.Transparent) {
                                    Tab(selected = selectedKarmaTab == 0, onClick = { selectedKarmaTab = 0 }) { Text("Boutique", Modifier.padding(12.dp)) }
                                    Tab(selected = selectedKarmaTab == 1, onClick = { selectedKarmaTab = 1 }) { Text("Actions", Modifier.padding(12.dp)) }
                                    Tab(selected = selectedKarmaTab == 2, onClick = { selectedKarmaTab = 2 }) { Text("Grants", Modifier.padding(12.dp)) }
                                }
                            }
                        }
                    }
                    
                    // Shop modifiers
                    if (selectedKarmaTab == 0) {
                        item {
                            Text("🛒 Modificateurs Boutique", style = MaterialTheme.typography.titleMedium, color = Color.White)
                            Text("${shopMods.size} modificateurs configurés", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                        itemsIndexed(shopMods) { i, m ->
                            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(m.str("name") ?: "", fontWeight = FontWeight.SemiBold, color = Color.White)
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Condition: ${m.str("condition")}", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                        Text("${m.int("percent") ?: 0}%", color = if ((m.int("percent") ?: 0) >= 0) Color(0xFF57F287) else Color(0xFFED4245), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Actions modifiers
                    if (selectedKarmaTab == 1) {
                        item {
                            Text("🎭 Modificateurs Actions", style = MaterialTheme.typography.titleMedium, color = Color.White)
                            Text("${actionMods.size} modificateurs configurés", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                        itemsIndexed(actionMods) { i, m ->
                            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(m.str("name") ?: "", fontWeight = FontWeight.SemiBold, color = Color.White)
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Condition: ${m.str("condition")}", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                        Text("${m.int("percent") ?: 0}%", color = if ((m.int("percent") ?: 0) >= 0) Color(0xFF57F287) else Color(0xFFED4245), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Grants
                    if (selectedKarmaTab == 2) {
                        item {
                            Text("🎁 Grants (Bonus seuils)", style = MaterialTheme.typography.titleMedium, color = Color.White)
                            Text("${grants.size} grants configurés", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                        itemsIndexed(grants) { i, g ->
                            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(g.str("name") ?: "", fontWeight = FontWeight.SemiBold, color = Color.White)
                                    Text(g.str("description") ?: "", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                    Spacer(Modifier.height(4.dp))
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Condition: ${g.str("condition")}", color = Color(0xFF5865F2), style = MaterialTheme.typography.bodySmall)
                                        Text("+${g.int("money") ?: 0} $currencyName", color = Color(0xFF57F287), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Save button (pour le reset uniquement)
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    savingKarma = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("karmaReset", buildJsonObject {
                                                    put("enabled", resetEnabled)
                                                    put("day", resetDay.toIntOrNull() ?: 1)
                                                })
                                            }
                                            api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Reset Karma sauvegardé") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { savingKarma = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !savingKarma
                        ) {
                            if (savingKarma) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Reset")
                            }
                        }
                    }
                    
                    item {
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E).copy(alpha = 0.5f))) {
                            Column(Modifier.padding(16.dp)) {
                                Text("ℹ️ Modificateurs Karma", fontWeight = FontWeight.Bold, color = Color(0xFF5865F2))
                                Spacer(Modifier.height(8.dp))
                                Text("Les modificateurs (Boutique, Actions, Grants) sont consultables ici.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                Text("Pour les éditer, contactez l'administrateur via le dashboard web ou le bot Discord.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            }
                        }
                    }
                }
            }
            5 -> {
                // Suites - Gestion des suites couple
                val suitesData = eco?.obj("suites")
                var dayPrice by remember { mutableStateOf(suitesData?.obj("prices")?.int("day") ?: 500) }
                var weekPrice by remember { mutableStateOf(suitesData?.obj("prices")?.int("week") ?: 2500) }
                var monthPrice by remember { mutableStateOf(suitesData?.obj("prices")?.int("month") ?: 10000) }
                var categoryId by remember { mutableStateOf(suitesData?.str("categoryId") ?: "") }
                var suiteEmoji by remember { mutableStateOf(suitesData?.str("emoji") ?: "💞") }
                var savingSuites by remember { mutableStateOf(false) }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            "💞 Suites Couple",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "Configuration des prix et catégorie",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }
                    
                    item {
                        SectionCard(title = "💰 Tarifs", subtitle = "Prix par durée") {
                            OutlinedTextField(
                                value = dayPrice.toString(),
                                onValueChange = { dayPrice = it.toIntOrNull() ?: dayPrice },
                                label = { Text("Prix 1 jour") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = weekPrice.toString(),
                                onValueChange = { weekPrice = it.toIntOrNull() ?: weekPrice },
                                label = { Text("Prix 1 semaine") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = monthPrice.toString(),
                                onValueChange = { monthPrice = it.toIntOrNull() ?: monthPrice },
                                label = { Text("Prix 1 mois") },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    
                    item {
                        SectionCard(title = "⚙️ Configuration") {
                            OutlinedTextField(
                                value = categoryId,
                                onValueChange = { categoryId = it },
                                label = { Text("ID Catégorie Discord") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = suiteEmoji,
                                onValueChange = { suiteEmoji = it },
                                label = { Text("Emoji") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    savingSuites = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("suites", buildJsonObject {
                                                    put("prices", buildJsonObject {
                                                        put("day", dayPrice)
                                                        put("week", weekPrice)
                                                        put("month", monthPrice)
                                                    })
                                                    put("categoryId", categoryId)
                                                    put("emoji", suiteEmoji)
                                                    put("durations", buildJsonObject {
                                                        put("day", 1)
                                                        put("week", 7)
                                                        put("month", 30)
                                                    })
                                                })
                                            }
                                            api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Suites sauvegardées") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { savingSuites = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !savingSuites
                        ) {
                            if (savingSuites) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Suites")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LevelsConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var selectedSubTab by remember { mutableIntStateOf(1) } // Start at Config XP
    val subTabs = listOf("Users", "Config XP", "Rewards", "Annonces", "Cartes")
    
    val levels = configData?.obj("levels")
    var enabled by remember { mutableStateOf(levels?.bool("enabled") ?: false) }
    var xpMsg by remember { mutableStateOf((levels?.int("xpPerMessage") ?: 10).toString()) }
    var xpVoice by remember { mutableStateOf((levels?.int("xpPerVoiceMinute") ?: 5).toString()) }
    val curve = levels?.obj("levelCurve")
    var curveBase by remember { mutableStateOf((curve?.int("base") ?: 100).toString()) }
    var curveFactor by remember { mutableStateOf((curve?.double("factor") ?: 1.12).toString()) }

    val initialRewards = remember(levels) {
        levels?.obj("rewards")?.mapValues { it.value.jsonPrimitive.contentOrNull ?: "" } ?: emptyMap()
    }
    var rewards by remember(initialRewards) { mutableStateOf(initialRewards) }
    var newRewardLevel by remember { mutableStateOf("") }
    var newRewardRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        // Sub-tabs
        ScrollableTabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = Color(0xFF1E1E1E),
            contentColor = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            subTabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedSubTab == index,
                    onClick = { selectedSubTab = index },
                    text = { Text(title) }
                )
            }
        }
        
        when (selectedSubTab) {
            0 -> {
                // Users list
                val levelsData = levels?.obj("data")
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Text(
                            "📊 Utilisateurs avec Niveaux",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${levelsData?.jsonObject?.size ?: 0} utilisateurs",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }
                    
                    levelsData?.jsonObject?.entries?.sortedByDescending { 
                        it.value.jsonObject["level"]?.jsonPrimitive?.intOrNull ?: 0 
                    }?.forEach { (userId, userData) ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(
                                        "Membre ID: ${userId.takeLast(8)}",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Text(
                                            "📈 Niveau ${userData.jsonObject["level"]?.jsonPrimitive?.intOrNull ?: 0}",
                                            color = Color(0xFFFEE75C),
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            "⭐ ${userData.jsonObject["xp"]?.jsonPrimitive?.intOrNull ?: 0} XP",
                                            color = Color(0xFF57F287)
                                        )
                                        userData.jsonObject["messages"]?.jsonPrimitive?.intOrNull?.let {
                                            Text("💬 $it msgs", color = Color.Gray)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                // Config XP
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        SectionCard(title = "📈 Configuration XP", subtitle = "Gains et paramètres") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Switch(checked = enabled, onCheckedChange = { enabled = it })
                            }
                            Spacer(Modifier.height(12.dp))
                            Text("Gains d'XP", fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = xpMsg, onValueChange = { xpMsg = it },
                                label = { Text("XP par message") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = xpVoice, onValueChange = { xpVoice = it },
                                label = { Text("XP par minute vocale") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(12.dp))
                            Text("Courbe de niveau", fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = curveBase, onValueChange = { curveBase = it },
                                label = { Text("Base") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = curveFactor, onValueChange = { curveFactor = it },
                                label = { Text("Factor") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("enabled", enabled)
                                                put("xpPerMessage", xpMsg.toIntOrNull() ?: 10)
                                                put("xpPerVoiceMinute", xpVoice.toIntOrNull() ?: 5)
                                                put("levelCurve", buildJsonObject {
                                                    put("base", curveBase.toIntOrNull() ?: 100)
                                                    put("factor", curveFactor.toDoubleOrNull() ?: 1.12)
                                                })
                                                put("rewards", buildJsonObject {
                                                    rewards.forEach { (lvl, roleId) -> put(lvl, roleId) }
                                                })
                                            }
                                            api.putJson("/api/configs/levels", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Config XP sauvegardée") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Config XP")
                            }
                        }
                    }
                }
            }
            2 -> {
                // Rewards
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        SectionCard(title = "🎁 Rewards", subtitle = "${rewards.size} niveaux configurés") {
                            rewards.entries.sortedBy { it.key.toIntOrNull() ?: Int.MAX_VALUE }.forEach { (level, roleId) ->
                                RemovableIdRow(
                                    label = "Niveau $level",
                                    id = roleId,
                                    resolvedName = roles[roleId],
                                    onRemove = { rewards = rewards - level }
                                )
                                Divider(color = Color(0xFF2A2A2A))
                            }

                            Spacer(Modifier.height(12.dp))
                            Text("Ajouter un reward", fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = newRewardLevel,
                                onValueChange = { newRewardLevel = it },
                                label = { Text("Niveau") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            RoleSelector(
                                roles = roles,
                                selectedRoleId = newRewardRoleId,
                                onRoleSelected = { newRewardRoleId = it },
                                label = "Sélectionner le rôle reward"
                            )
                            Spacer(Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    val level = newRewardLevel.trim()
                                    val roleId = newRewardRoleId
                                    if (level.toIntOrNull() != null && roleId != null) {
                                        rewards = rewards + (level to roleId)
                                        newRewardLevel = ""
                                        newRewardRoleId = null
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = newRewardLevel.toIntOrNull() != null && newRewardRoleId != null
                            ) { Text("➕ Ajouter reward") }
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("enabled", enabled)
                                                put("xpPerMessage", xpMsg.toIntOrNull() ?: 10)
                                                put("xpPerVoiceMinute", xpVoice.toIntOrNull() ?: 5)
                                                put("levelCurve", buildJsonObject {
                                                    put("base", curveBase.toIntOrNull() ?: 100)
                                                    put("factor", curveFactor.toDoubleOrNull() ?: 1.12)
                                                })
                                                put("rewards", buildJsonObject {
                                                    rewards.forEach { (lvl, roleId) -> put(lvl, roleId) }
                                                })
                                            }
                                            api.putJson("/api/configs/levels", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Rewards sauvegardés") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Rewards")
                            }
                        }
                    }
                }
            }
            3 -> {
                // Annonces - active system
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            "📢 Annonces",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "Configuration des annonces de level up et récompenses",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }
                    
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                        ) {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.Campaign,
                                        contentDescription = null,
                                        tint = Color(0xFF57F287),
                                        modifier = Modifier.size(64.dp)
                                    )
                                    Spacer(Modifier.height(16.dp))
                                    Text(
                                        "Système d'annonces actif",
                                        color = Color.White,
                                        textAlign = TextAlign.Center,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "Les annonces de montée de niveau et de récompenses\nsont automatiquement envoyées dans le canal configuré",
                                        color = Color.Gray,
                                        textAlign = TextAlign.Center,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }
                    }
                }
            }
            4 -> {
                // Cartes - Level card backgrounds
                val cardsConfig = levels?.obj("cards")
                var femaleRoleIds by remember(cardsConfig) {
                    mutableStateOf(cardsConfig?.arr("femaleRoleIds")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableList() ?: mutableListOf())
                }
                var certifiedRoleIds by remember(cardsConfig) {
                    mutableStateOf(cardsConfig?.arr("certifiedRoleIds")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableList() ?: mutableListOf())
                }
                val backgrounds = cardsConfig?.obj("backgrounds")
                var defaultBg by remember(backgrounds) { mutableStateOf(backgrounds?.str("default") ?: "") }
                var femaleBg by remember(backgrounds) { mutableStateOf(backgrounds?.str("female") ?: "") }
                var certifiedBg by remember(backgrounds) { mutableStateOf(backgrounds?.str("certified") ?: "") }
                var prestigeBlueBg by remember(backgrounds) { mutableStateOf(backgrounds?.str("prestigeBlue") ?: "") }
                var prestigeRoseBg by remember(backgrounds) { mutableStateOf(backgrounds?.str("prestigeRose") ?: "") }
                var savingCards by remember { mutableStateOf(false) }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            "🎴 Cartes de Niveau",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "Configuration des backgrounds personnalisés",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }
                    
                    // Backgrounds
                    item {
                        SectionCard(title = "🖼️ Backgrounds", subtitle = "URLs des images") {
                            OutlinedTextField(
                                value = defaultBg,
                                onValueChange = { defaultBg = it },
                                label = { Text("Background par défaut") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = femaleBg,
                                onValueChange = { femaleBg = it },
                                label = { Text("Background femmes") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = certifiedBg,
                                onValueChange = { certifiedBg = it },
                                label = { Text("Background certifiés") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = prestigeBlueBg,
                                onValueChange = { prestigeBlueBg = it },
                                label = { Text("Background prestige bleu") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = prestigeRoseBg,
                                onValueChange = { prestigeRoseBg = it },
                                label = { Text("Background prestige rose") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                        }
                    }
                    
                    // Female Roles
                    item {
                        SectionCard(title = "♀️ Rôles Femmes (${femaleRoleIds.size})", subtitle = "Pour background femmes") {
                            femaleRoleIds.forEach { roleId ->
                                RemovableIdRow(
                                    label = "Rôle",
                                    id = roleId,
                                    resolvedName = roles[roleId],
                                    onRemove = { femaleRoleIds.remove(roleId) }
                                )
                                Divider(color = Color(0xFF2A2A2A))
                            }
                            
                            var newRoleId by remember { mutableStateOf<String?>(null) }
                            Spacer(Modifier.height(10.dp))
                            RoleSelector(
                                roles = roles.filterKeys { !femaleRoleIds.contains(it) },
                                selectedRoleId = newRoleId,
                                onRoleSelected = { newRoleId = it },
                                label = "Ajouter un rôle"
                            )
                            Spacer(Modifier.height(8.dp))
                            Button(
                                onClick = { newRoleId?.let { femaleRoleIds.add(it); newRoleId = null } },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = newRoleId != null
                            ) {
                                Icon(Icons.Default.Add, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Ajouter")
                            }
                        }
                    }
                    
                    // Certified Roles
                    item {
                        SectionCard(title = "✅ Rôles Certifiés (${certifiedRoleIds.size})", subtitle = "Pour background certifiés") {
                            certifiedRoleIds.forEach { roleId ->
                                RemovableIdRow(
                                    label = "Rôle",
                                    id = roleId,
                                    resolvedName = roles[roleId],
                                    onRemove = { certifiedRoleIds.remove(roleId) }
                                )
                                Divider(color = Color(0xFF2A2A2A))
                            }
                            
                            var newRoleId by remember { mutableStateOf<String?>(null) }
                            Spacer(Modifier.height(10.dp))
                            RoleSelector(
                                roles = roles.filterKeys { !certifiedRoleIds.contains(it) },
                                selectedRoleId = newRoleId,
                                onRoleSelected = { newRoleId = it },
                                label = "Ajouter un rôle"
                            )
                            Spacer(Modifier.height(8.dp))
                            Button(
                                onClick = { newRoleId?.let { certifiedRoleIds.add(it); newRoleId = null } },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = newRoleId != null
                            ) {
                                Icon(Icons.Default.Add, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Ajouter")
                            }
                        }
                    }
                    
                    // Save button
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    savingCards = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val body = buildJsonObject {
                                                put("cards", buildJsonObject {
                                                    put("femaleRoleIds", JsonArray(femaleRoleIds.map { JsonPrimitive(it) }))
                                                    put("certifiedRoleIds", JsonArray(certifiedRoleIds.map { JsonPrimitive(it) }))
                                                    put("backgrounds", buildJsonObject {
                                                        put("default", defaultBg)
                                                        put("female", femaleBg)
                                                        put("certified", certifiedBg)
                                                        put("prestigeBlue", prestigeBlueBg)
                                                        put("prestigeRose", prestigeRoseBg)
                                                    })
                                                    put("perRoleBackgrounds", buildJsonObject {})
                                                })
                                            }
                                            api.putJson("/api/configs/levels", json.encodeToString(JsonObject.serializer(), body))
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Cartes sauvegardées") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { savingCards = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !savingCards
                        ) {
                            if (savingCards) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Cartes")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoosterConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val boost = eco?.obj("booster") // Toujours dans economy.booster

    var enabled by remember { mutableStateOf(boost?.bool("enabled") ?: false) }
    var textXpMult by remember { mutableStateOf((boost?.double("textXpMult") ?: 2.0).toString()) }
    var voiceXpMult by remember { mutableStateOf((boost?.double("voiceXpMult") ?: 2.0).toString()) }
    var actionCooldownMult by remember { mutableStateOf((boost?.double("actionCooldownMult") ?: 0.5).toString()) }
    var shopPriceMult by remember { mutableStateOf((boost?.double("shopPriceMult") ?: 0.5).toString()) }

    val initialRoles = remember(boost) { boost?.arr("roles")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var boosterRoles by remember { mutableStateOf(initialRoles) }
    var newRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🚀 Booster", subtitle = "Multiplicateurs + rôles booster") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(textXpMult, { textXpMult = it }, label = { Text("Text XP Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(voiceXpMult, { voiceXpMult = it }, label = { Text("Voice XP Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(actionCooldownMult, { actionCooldownMult = it }, label = { Text("Action Cooldown Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(shopPriceMult, { shopPriceMult = it }, label = { Text("Shop Price Mult") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "🏷️ Rôles booster (${boosterRoles.size})") {
                boosterRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { boosterRoles = boosterRoles.filterNot { it == rid } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(
                    roles = roles.filterKeys { !boosterRoles.contains(it) },
                    selectedRoleId = newRoleId,
                    onRoleSelected = { newRoleId = it },
                    label = "Ajouter un rôle booster"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { newRoleId?.let { boosterRoles = boosterRoles + it; newRoleId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newRoleId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("booster", buildJsonObject {
                                        put("enabled", enabled)
                                        put("textXpMult", textXpMult.toDoubleOrNull() ?: 2.0)
                                        put("voiceXpMult", voiceXpMult.toDoubleOrNull() ?: 2.0)
                                        put("actionCooldownMult", actionCooldownMult.toDoubleOrNull() ?: 0.5)
                                        put("shopPriceMult", shopPriceMult.toDoubleOrNull() ?: 0.5)
                                        put("roles", JsonArray(boosterRoles.map { JsonPrimitive(it) }))
                                    })
                                }

                                // PUT section economy avec booster
                                api.putJson("/api/configs/economy", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Booster sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Booster")
                }
            }
        }
    }
}

@Composable
private fun ActionsConfigTab(
    configData: JsonObject?,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val actions = eco?.obj("actions")
    
    val actionsList = remember(actions) {
        actions?.obj("list")?.mapValues { (key, value) ->
            val obj = value.jsonObject
            key to (obj["label"]?.jsonPrimitive?.contentOrNull ?: key)
        }?.values?.toList() ?: emptyList()
    }
    
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedActionKey by remember { mutableStateOf(actionsList.firstOrNull()?.first ?: "") }
    
    Column(Modifier.fillMaxSize()) {
        // Header
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "🎭 Actions Économiques",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    "${actionsList.size} actions disponibles",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }
        }
        
        // Tabs
        TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("🎬 GIFs") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("💬 Messages") }
            )
        }
        
        when (selectedTab) {
            0 -> ActionGifsTab(actions, actionsList, selectedActionKey, { selectedActionKey = it }, api, json, scope, snackbar)
            1 -> ActionMessagesTab(actions, actionsList, selectedActionKey, { selectedActionKey = it }, api, json, scope, snackbar)
        }
    }
}

@Composable
private fun ActionGifsTab(
    actions: JsonObject?,
    actionsList: List<Pair<String, String>>,
    selectedActionKey: String,
    onActionSelect: (String) -> Unit,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val gifsData = actions?.obj("gifs")?.obj(selectedActionKey)
    val successGifs = remember(gifsData) {
        gifsData?.arr("success")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableList() ?: mutableListOf()
    }
    val failGifs = remember(gifsData) {
        gifsData?.arr("fail")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableList() ?: mutableListOf()
    }
    
    var showAddSuccess by remember { mutableStateOf(false) }
    var showAddFail by remember { mutableStateOf(false) }
    var newGifUrl by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Action selector
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Sélectionner une action", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    
                    androidx.compose.material3.DropdownMenu(
                        expanded = false,
                        onDismissRequest = {}
                    ) {}
                    
                    // Custom dropdown
                    var expanded by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(
                            onClick = { expanded = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            val selected = actionsList.find { it.first == selectedActionKey }
                            Text(selected?.second ?: "Sélectionner...", modifier = Modifier.weight(1f))
                            Icon(if (expanded) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown, null)
                        }
                        androidx.compose.material3.DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                            modifier = Modifier.fillMaxWidth(0.9f)
                        ) {
                            actionsList.forEach { (key, label) ->
                                androidx.compose.material3.DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        onActionSelect(key)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Success GIFs
        item {
            SectionCard(title = "✅ GIFs Succès (${successGifs.size})") {
                successGifs.forEachIndexed { index, url ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            // Aperçu GIF avec AsyncImage (Coil)
                            androidx.compose.foundation.layout.Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(150.dp)
                                    .background(Color.Black),
                                contentAlignment = Alignment.Center
                            ) {
                                AsyncImage(
                                    model = coil.request.ImageRequest.Builder(androidx.compose.ui.platform.LocalContext.current)
                                        .data(url)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = "GIF ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Fit,
                                    placeholder = androidx.compose.ui.graphics.painter.ColorPainter(Color.DarkGray),
                                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Red.copy(alpha = 0.3f))
                                )
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    url.take(40) + if (url.length > 40) "..." else "",
                                    modifier = Modifier.weight(1f),
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodySmall
                                )
                                IconButton(onClick = { successGifs.removeAt(index) }) {
                                    Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                }
                            }
                        }
                    }
                }
                
                if (showAddSuccess) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newGifUrl,
                        onValueChange = { newGifUrl = it },
                        label = { Text("URL du GIF") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                showAddSuccess = false
                                newGifUrl = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Annuler")
                        }
                        Button(
                            onClick = {
                                if (newGifUrl.isNotBlank()) {
                                    successGifs.add(newGifUrl)
                                    newGifUrl = ""
                                    showAddSuccess = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = newGifUrl.isNotBlank()
                        ) {
                            Text("Ajouter")
                        }
                    }
                } else {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showAddSuccess = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ajouter un GIF succès")
                    }
                }
            }
        }
        
        // Fail GIFs
        item {
            SectionCard(title = "❌ GIFs Échec (${failGifs.size})") {
                failGifs.forEachIndexed { index, url ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            // Aperçu GIF avec AsyncImage (Coil)
                            androidx.compose.foundation.layout.Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(150.dp)
                                    .background(Color.Black),
                                contentAlignment = Alignment.Center
                            ) {
                                AsyncImage(
                                    model = coil.request.ImageRequest.Builder(androidx.compose.ui.platform.LocalContext.current)
                                        .data(url)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = "GIF ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Fit,
                                    placeholder = androidx.compose.ui.graphics.painter.ColorPainter(Color.DarkGray),
                                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Red.copy(alpha = 0.3f))
                                )
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    url.take(40) + if (url.length > 40) "..." else "",
                                    modifier = Modifier.weight(1f),
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodySmall
                                )
                                IconButton(onClick = { failGifs.removeAt(index) }) {
                                    Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                }
                            }
                        }
                    }
                }
                
                if (showAddFail) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newGifUrl,
                        onValueChange = { newGifUrl = it },
                        label = { Text("URL du GIF") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                showAddFail = false
                                newGifUrl = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Annuler")
                        }
                        Button(
                            onClick = {
                                if (newGifUrl.isNotBlank()) {
                                    failGifs.add(newGifUrl)
                                    newGifUrl = ""
                                    showAddFail = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = newGifUrl.isNotBlank()
                        ) {
                            Text("Ajouter")
                        }
                    }
                } else {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showAddFail = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ajouter un GIF échec")
                    }
                }
            }
        }
        
        // Save button
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                // Build the updated gifs structure
                                val body = buildJsonObject {
                                    put(selectedActionKey, buildJsonObject {
                                        put("success", JsonArray(successGifs.map { JsonPrimitive(it) }))
                                        put("fail", JsonArray(failGifs.map { JsonPrimitive(it) }))
                                    })
                                }
                                api.postJson("/api/actions/gifs", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ GIFs sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder les GIFs")
                }
            }
        }
    }
}

@Composable
private fun ActionMessagesTab(
    actions: JsonObject?,
    actionsList: List<Pair<String, String>>,
    selectedActionKey: String,
    onActionSelect: (String) -> Unit,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val messagesData = actions?.obj("messages")?.obj(selectedActionKey)
    val successMessages = remember(messagesData, selectedActionKey) {
        messagesData?.arr("success")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableStateList() ?: mutableStateListOf()
    }
    val failMessages = remember(messagesData, selectedActionKey) {
        messagesData?.arr("fail")?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toMutableStateList() ?: mutableStateListOf()
    }
    
    var showAddSuccess by remember { mutableStateOf(false) }
    var showAddFail by remember { mutableStateOf(false) }
    var newMessage by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Action selector
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Sélectionner une action", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    
                    var expanded by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(
                            onClick = { expanded = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            val selected = actionsList.find { it.first == selectedActionKey }
                            Text(selected?.second ?: "Sélectionner...", modifier = Modifier.weight(1f))
                            Icon(if (expanded) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown, null)
                        }
                        androidx.compose.material3.DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                            modifier = Modifier.fillMaxWidth(0.9f)
                        ) {
                            actionsList.forEach { (key, label) ->
                                androidx.compose.material3.DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        onActionSelect(key)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Success Messages
        item {
            SectionCard(title = "✅ Messages Succès (${successMessages.size})") {
                successMessages.forEachIndexed { index, message ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            var editedMessage by remember(message) { mutableStateOf(message) }
                            
                            OutlinedTextField(
                                value = editedMessage,
                                onValueChange = { editedMessage = it },
                                label = { Text("Message ${index + 1}") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2
                            )
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = { 
                                        successMessages[index] = editedMessage
                                    },
                                    modifier = Modifier.weight(1f),
                                    enabled = editedMessage != message
                                ) {
                                    Text("💾 Modifier")
                                }
                                OutlinedButton(
                                    onClick = { successMessages.removeAt(index) },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Supprimer")
                                }
                            }
                        }
                    }
                }
                
                if (showAddSuccess) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newMessage,
                        onValueChange = { newMessage = it },
                        label = { Text("Nouveau message") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                showAddSuccess = false
                                newMessage = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Annuler")
                        }
                        Button(
                            onClick = {
                                if (newMessage.isNotBlank()) {
                                    successMessages.add(newMessage)
                                    newMessage = ""
                                    showAddSuccess = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = newMessage.isNotBlank()
                        ) {
                            Text("Ajouter")
                        }
                    }
                } else {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showAddSuccess = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ajouter un message succès")
                    }
                }
            }
        }
        
        // Fail Messages
        item {
            SectionCard(title = "❌ Messages Échec (${failMessages.size})") {
                failMessages.forEachIndexed { index, message ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            var editedMessage by remember(message) { mutableStateOf(message) }
                            
                            OutlinedTextField(
                                value = editedMessage,
                                onValueChange = { editedMessage = it },
                                label = { Text("Message ${index + 1}") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2
                            )
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = { 
                                        failMessages[index] = editedMessage
                                    },
                                    modifier = Modifier.weight(1f),
                                    enabled = editedMessage != message
                                ) {
                                    Text("💾 Modifier")
                                }
                                OutlinedButton(
                                    onClick = { failMessages.removeAt(index) },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Supprimer")
                                }
                            }
                        }
                    }
                }
                
                if (showAddFail) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newMessage,
                        onValueChange = { newMessage = it },
                        label = { Text("Nouveau message") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                showAddFail = false
                                newMessage = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Annuler")
                        }
                        Button(
                            onClick = {
                                if (newMessage.isNotBlank()) {
                                    failMessages.add(newMessage)
                                    newMessage = ""
                                    showAddFail = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = newMessage.isNotBlank()
                        ) {
                            Text("Ajouter")
                        }
                    }
                } else {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showAddFail = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ajouter un message échec")
                    }
                }
            }
        }
        
        // Save button
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put(selectedActionKey, buildJsonObject {
                                        put("success", JsonArray(successMessages.map { JsonPrimitive(it) }))
                                        put("fail", JsonArray(failMessages.map { JsonPrimitive(it) }))
                                    })
                                }
                                api.postJson("/api/actions/messages", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Messages sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder les Messages")
                }
            }
        }
    }
}

@Composable
private fun BackupsTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var backups by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var isRestoring by remember { mutableStateOf(false) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/backups")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val list = obj["backups"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    withContext(Dispatchers.Main) { backups = list }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "💾 Backups", subtitle = "Liste / création / restauration") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { load() }, enabled = !isLoading, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Rafraîchir")
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                isLoading = true
                                withContext(Dispatchers.IO) {
                                    try {
                                        api.postJson("/backup", "{}")
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Backup créé") }
                                        load()
                                    } catch (e: Exception) {
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                    } finally {
                                        withContext(Dispatchers.Main) { isLoading = false }
                                    }
                                }
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("➕ Créer")
                    }
                }
            }
        }

        item {
            if (isLoading) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }

        itemsIndexed(backups) { idx, b ->
            val filename = b["filename"]?.jsonPrimitive?.contentOrNull ?: ""
            val date = b["date"]?.jsonPrimitive?.contentOrNull ?: ""
            val size = b["size"]?.jsonPrimitive?.contentOrNull ?: ""

            SectionCard(title = "${idx + 1}. $filename", subtitle = "$date • $size") {
                Button(
                    onClick = {
                        if (filename.isBlank()) return@Button
                        scope.launch {
                            isRestoring = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject { put("filename", filename) }
                                    api.postJson("/restore", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Backup restauré") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isRestoring = false }
                                }
                            }
                        }
                    },
                    enabled = !isRestoring
                ) {
                    Text(if (isRestoring) "Restauration..." else "Restaurer")
                }
            }
        }
    }
}

@Composable
private fun ControlTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isBusy by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🎮 Contrôle Bot", subtitle = "Restart / Deploy (comme le dashboard)") {
                Text(
                    "Ces actions déclenchent des commandes côté serveur (PM2).",
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isBusy = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("action", "restart") }
                                api.postJson("/bot/control", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Restart demandé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isBusy = false }
                            }
                        }
                    }
                },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text("🔄 Redémarrer le bot") }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isBusy = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("action", "deploy") }
                                api.postJson("/bot/control", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Deploy demandé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isBusy = false }
                            }
                        }
                    }
                },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text("🚀 Déployer les commandes") }
        }
    }
}

@Composable
private fun MusicTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var playlists by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var uploads by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var totalSize by remember { mutableStateOf(0L) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var showDeletePlaylistConfirm by remember { mutableStateOf<String?>(null) }
    var showDeleteUploadConfirm by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/music")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val pls = obj["playlists"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ups = obj["uploads"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ts = obj["totalSize"]?.jsonPrimitive?.longOrNull ?: 0L
                    withContext(Dispatchers.Main) {
                        playlists = pls
                        uploads = ups
                        totalSize = ts
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(Modifier.fillMaxSize()) {
        // Header
        SectionCard(title = "🎵 Musique", subtitle = "Playlists & uploads") {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Taille totale: ${totalSize / 1024 / 1024} MB", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                IconButton(onClick = { load() }, enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, contentDescription = "Rafraîchir", tint = Color.White)
                }
            }
            
            Spacer(Modifier.height(8.dp))
            
            TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("📚 Playlists (${playlists.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("📁 Uploads (${uploads.size})") }
                )
            }
        }
        
        when (selectedTab) {
            0 -> {
                // Playlists
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isLoading) {
                        item {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        }
                    } else if (playlists.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            Icons.Default.MusicNote,
                                            contentDescription = null,
                                            tint = Color.Gray.copy(alpha = 0.5f),
                                            modifier = Modifier.size(64.dp)
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Text(
                                            "Aucune playlist",
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        itemsIndexed(playlists) { index, p ->
                            val name = p["name"]?.jsonPrimitive?.contentOrNull ?: "?"
                            val trackCount = p["trackCount"]?.jsonPrimitive?.intOrNull ?: 0
                            val updatedAt = p["updatedAt"]?.jsonPrimitive?.longOrNull ?: 0L
                            val date = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.FRENCH).format(java.util.Date(updatedAt))
                            
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            name,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.bodyLarge
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            "$trackCount piste(s)",
                                            color = Color.Gray,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                        Text(
                                            "Mis à jour: $date",
                                            color = Color.Gray,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                    
                                    IconButton(onClick = { showDeletePlaylistConfirm = name }) {
                                        Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                    }
                                }
                            }
                        }
                    }
                    
                    // Info message pour upload de playlists
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E).copy(alpha = 0.5f))
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text("ℹ️ Upload & Création", fontWeight = FontWeight.Bold, color = Color(0xFF5865F2))
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "Pour uploader des fichiers ou créer de nouvelles playlists, utilisez le dashboard web ou le bot Discord.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
                
                // Delete playlist confirmation
                if (showDeletePlaylistConfirm != null) {
                    AlertDialog(
                        onDismissRequest = { showDeletePlaylistConfirm = null },
                        title = { Text("⚠️ Confirmation") },
                        text = {
                            Text("Voulez-vous vraiment supprimer la playlist \"$showDeletePlaylistConfirm\" ?")
                        },
                        confirmButton = {
                            Button(
                                onClick = {
                                    scope.launch {
                                        withContext(Dispatchers.IO) {
                                            try {
                                                api.deleteJson("/api/music/playlist/${showDeletePlaylistConfirm}")
                                                withContext(Dispatchers.Main) {
                                                    snackbar.showSnackbar("✅ Playlist supprimée")
                                                    showDeletePlaylistConfirm = null
                                                }
                                                load()
                                            } catch (e: Exception) {
                                                withContext(Dispatchers.Main) {
                                                    snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                                }
                                            }
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFED4245))
                            ) {
                                Text("Supprimer")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDeletePlaylistConfirm = null }) {
                                Text("Annuler")
                            }
                        }
                    )
                }
            }
            
            1 -> {
                // Uploads
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isLoading) {
                        item {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        }
                    } else if (uploads.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            Icons.Default.AudioFile,
                                            contentDescription = null,
                                            tint = Color.Gray.copy(alpha = 0.5f),
                                            modifier = Modifier.size(64.dp)
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Text(
                                            "Aucun fichier uploadé",
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        itemsIndexed(uploads) { index, u ->
                            val fn = u["filename"]?.jsonPrimitive?.contentOrNull ?: "?"
                            val size = u["size"]?.jsonPrimitive?.longOrNull ?: 0L
                            val uploadedAt = u["uploadedAt"]?.jsonPrimitive?.longOrNull ?: 0L
                            val date = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.FRENCH).format(java.util.Date(uploadedAt))
                            val sizeKb = size / 1024
                            val sizeMb = sizeKb / 1024.0
                            
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            fn,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.bodyMedium,
                                            maxLines = 2
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            "Taille: ${if (sizeMb >= 1) "%.2f MB".format(sizeMb) else "$sizeKb KB"}",
                                            color = Color.Gray,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                        Text(
                                            "Uploadé: $date",
                                            color = Color.Gray,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                    
                                    IconButton(onClick = { showDeleteUploadConfirm = fn }) {
                                        Icon(Icons.Default.Delete, null, tint = Color(0xFFED4245))
                                    }
                                }
                            }
                        }
                    }
                    
                    // Info message pour upload de fichiers
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E).copy(alpha = 0.5f))
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text("ℹ️ Upload de Fichiers", fontWeight = FontWeight.Bold, color = Color(0xFF5865F2))
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "Pour uploader de nouveaux fichiers audio, utilisez le dashboard web ou le bot Discord.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
                
                // Delete upload confirmation
                if (showDeleteUploadConfirm != null) {
                    AlertDialog(
                        onDismissRequest = { showDeleteUploadConfirm = null },
                        title = { Text("⚠️ Confirmation") },
                        text = {
                            Column {
                                Text("Voulez-vous vraiment supprimer ce fichier ?")
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    showDeleteUploadConfirm!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                        },
                        confirmButton = {
                            Button(
                                onClick = {
                                    scope.launch {
                                        withContext(Dispatchers.IO) {
                                            try {
                                                api.deleteJson("/api/music/upload/${showDeleteUploadConfirm}")
                                                withContext(Dispatchers.Main) {
                                                    snackbar.showSnackbar("✅ Fichier supprimé")
                                                    showDeleteUploadConfirm = null
                                                }
                                                load()
                                            } catch (e: Exception) {
                                                withContext(Dispatchers.Main) {
                                                    snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                                }
                                            }
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFED4245))
                            ) {
                                Text("Supprimer")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDeleteUploadConfirm = null }) {
                                Text("Annuler")
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun CountingConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val counting = configData?.obj("counting")
    var allowFormulas by remember { mutableStateOf(counting?.bool("allowFormulas") ?: false) }
    val initialChannels = remember(counting) {
        counting?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
    }
    var channelIds by remember(initialChannels) { mutableStateOf(initialChannels) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🔢 Comptage", subtitle = "Allow formulas + channels") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Autoriser les formules", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = allowFormulas, onCheckedChange = { allowFormulas = it })
                }
            }
        }

        item {
            SectionCard(title = "📋 Channels", subtitle = "${channelIds.size} configuré(s)") {
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { channelIds = channelIds.filterNot { it == chId } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }

                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        newChannelId?.let { id ->
                            if (!channelIds.contains(id)) channelIds = channelIds + id
                            newChannelId = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter le salon") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("allowFormulas", allowFormulas)
                                    put("channels", JsonArray(channelIds.map { JsonPrimitive(it) }))
                                }
                                api.postJson("/api/counting", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Comptage sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Comptage")
                }
            }
        }
    }
}

@Composable
private fun TruthDareConfigTab(
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var mode by remember { mutableStateOf("sfw") }
    var promptTab by remember { mutableIntStateOf(0) } // 0=vérités, 1=actions
    var isLoading by remember { mutableStateOf(false) }
    var prompts by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var channelIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var newPromptType by remember { mutableStateOf("v") } // v=truth, a=action
    var newPromptText by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/truthdare/$mode")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val p = obj["prompts"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ch = obj["channels"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    withContext(Dispatchers.Main) {
                        prompts = p
                        channelIds = ch
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(mode) { load() }
    
    // Sync newPromptType avec promptTab
    LaunchedEffect(promptTab) {
        newPromptType = if (promptTab == 0) "v" else "a"
    }
    
    // Filtrer par type selon l'onglet actif
    val filteredPrompts = prompts.filter { 
        val type = it["type"]?.jsonPrimitive?.contentOrNull ?: "v"
        // Supporter les deux formats: "v"/"a" ET "verite"/"action"
        if (promptTab == 0) {
            type == "v" || type == "verite" || type == "vérité"
        } else {
            type == "a" || type == "action"
        }
    }
    val veritesCount = prompts.count { 
        val type = it["type"]?.jsonPrimitive?.contentOrNull ?: ""
        type == "v" || type == "verite" || type == "vérité"
    }
    val actionsCount = prompts.count { 
        val type = it["type"]?.jsonPrimitive?.contentOrNull ?: ""
        type == "a" || type == "action"
    }

    Column(Modifier.fillMaxSize()) {
        // TabRow Vérités/Actions EN HAUT
        TabRow(
            selectedTabIndex = promptTab,
            containerColor = Color(0xFF1E1E1E)
        ) {
            Tab(
                selected = promptTab == 0,
                onClick = { promptTab = 0 },
                text = { Text("🤔 Vérités ($veritesCount)") }
            )
            Tab(
                selected = promptTab == 1,
                onClick = { promptTab = 1 },
                text = { Text("🎭 Actions ($actionsCount)") }
            )
        }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🎲 A/V", subtitle = "Channels + prompts (SFW / NSFW)") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    TabRow(selectedTabIndex = if (mode == "sfw") 0 else 1) {
                        Tab(selected = mode == "sfw", onClick = { mode = "sfw" }, text = { Text("🟢 SFW") })
                        Tab(selected = mode == "nsfw", onClick = { mode = "nsfw" }, text = { Text("🔴 NSFW") })
                    }
                    IconButton(onClick = { load() }, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Rafraîchir", tint = Color.White)
                    }
                }
            }
        }

        item {
            SectionCard(title = "📋 Channels (${channelIds.size})") {
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = {
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    try {
                                        api.deleteJson("/api/truthdare/$mode/channels/$chId")
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Channel supprimé") }
                                        load()
                                    } catch (e: Exception) {
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                    }
                                }
                            }
                        }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }

                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val id = newChannelId ?: return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject { put("channelId", id) }
                                    api.postJson("/api/truthdare/$mode/channels", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Channel ajouté") }
                                    withContext(Dispatchers.Main) { newChannelId = null }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            SectionCard(title = if (promptTab == 0) "🤔 Vérités (${filteredPrompts.size})" else "🎭 Actions (${filteredPrompts.size})", subtitle = "Édition rapide (texte) + suppression") {
                if (isLoading) {
                    CircularProgressIndicator()
                } else {
                    if (filteredPrompts.isEmpty()) {
                        Column(
                            Modifier.fillMaxWidth().padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                if (promptTab == 0) Icons.Default.Help else Icons.Default.DirectionsRun,
                                null,
                                modifier = Modifier.size(48.dp),
                                tint = Color.Gray
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Aucun${if (promptTab == 0) "e vérité" else "e action"}",
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    } else {
                        filteredPrompts.sortedBy { it["id"]?.jsonPrimitive?.intOrNull ?: 0 }.forEach { p ->
                        val id = p["id"]?.jsonPrimitive?.intOrNull ?: 0
                        val type = p["type"]?.jsonPrimitive?.contentOrNull ?: "v"
                        var text by remember(id, mode) { mutableStateOf(p["text"]?.jsonPrimitive?.contentOrNull ?: "") }

                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                            Column(Modifier.padding(12.dp)) {
                                Text("ID #$id • ${if (type == "a") "Action" else "Vérité"}", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = text,
                                    onValueChange = { text = it },
                                    label = { Text("Texte") },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2
                                )
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                withContext(Dispatchers.IO) {
                                                    try {
                                                        api.putJson(
                                                            "/api/truthdare/$mode/$id",
                                                            json.encodeToString(JsonObject.serializer(), buildJsonObject { put("text", text) })
                                                        )
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Prompt modifié") }
                                                        load()
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                                    }
                                                }
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) { Text("💾 Sauver") }
                                    OutlinedButton(
                                        onClick = {
                                            scope.launch {
                                                withContext(Dispatchers.IO) {
                                                    try {
                                                        api.deleteJson("/api/truthdare/$mode/$id")
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Prompt supprimé") }
                                                        load()
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                                    }
                                                }
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) { Text("🗑️ Supprimer") }
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                }
                }

                Divider(color = Color(0xFF2A2A2A))
                Spacer(Modifier.height(12.dp))
                Text("➕ Ajouter ${if (promptTab == 0) "une vérité" else "une action"}", color = Color.White, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(
                        onClick = { newPromptType = "v"; promptTab = 0 },
                        label = { Text("Vérité") },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (newPromptType == "v") Color(0xFF2E7D32) else Color(0xFF2A2A2A)
                        )
                    )
                    AssistChip(
                        onClick = { newPromptType = "a"; promptTab = 1 },
                        label = { Text("Action") },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (newPromptType == "a") Color(0xFFB71C1C) else Color(0xFF2A2A2A)
                        )
                    )
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = newPromptText,
                    onValueChange = { newPromptText = it },
                    label = { Text("Texte") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val text = newPromptText.trim()
                        if (text.isBlank()) return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject {
                                        put("type", newPromptType)
                                        put("text", text)
                                    }
                                    api.postJson("/api/truthdare/$mode", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) {
                                        newPromptText = ""
                                        snackbar.showSnackbar("✅ Prompt ajouté")
                                    }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newPromptText.trim().isNotBlank()
                ) { Text("➕ Ajouter prompt") }
            }
        }
    }
    }
}

@Composable
private fun TicketsConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val tickets = configData?.obj("tickets")
    var subTab by remember { mutableIntStateOf(0) } // 0=config, 1=categories, 2=history
    var selectedCategoryIndex by remember { mutableStateOf<Int?>(null) }

    // fields
    var enabled by remember { mutableStateOf(tickets?.bool("enabled") ?: false) }
    var categoryId by remember { mutableStateOf(tickets?.str("categoryId")) }
    var panelChannelId by remember { mutableStateOf(tickets?.str("panelChannelId")) }
    var logChannelId by remember { mutableStateOf(tickets?.str("logChannelId")) }
    var transcriptChannelId by remember { mutableStateOf(tickets?.str("transcriptChannelId")) }
    var pingStaffOnOpen by remember { mutableStateOf(tickets?.bool("pingStaffOnOpen") ?: true) }
    var panelTitle by remember { mutableStateOf(tickets?.str("panelTitle") ?: "🎫 Ouvrir un ticket") }
    var panelText by remember { mutableStateOf(tickets?.str("panelText") ?: "") }
    var bannerUrl by remember { mutableStateOf(tickets?.str("bannerUrl") ?: "") }
    var certifiedRoleId by remember { mutableStateOf(tickets?.str("certifiedRoleId")) }
    var namingMode by remember { mutableStateOf(tickets?.obj("naming")?.str("mode") ?: "custom") }
    var namingPattern by remember { mutableStateOf(tickets?.obj("naming")?.str("customPattern") ?: "{cat}-{user}-{num}") }
    var transcriptStyle by remember { mutableStateOf(tickets?.obj("transcript")?.str("style") ?: "pro") }

    // categories
    val initialCategories = remember(tickets) {
        tickets?.arr("categories")?.mapNotNull { it.jsonObject } ?: emptyList()
    }
    var categories by remember(initialCategories) { mutableStateOf(initialCategories) }

    val records = tickets?.obj("records") ?: buildJsonObject { }
    val recordsCount = records.size
    var isSaving by remember { mutableStateOf(false) }

    // UI
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard(title = "🎫 Tickets", subtitle = "Config / Catégories / Historique / Panel") {
            TabRow(selectedTabIndex = subTab) {
                Tab(selected = subTab == 0, onClick = { subTab = 0; selectedCategoryIndex = null }, text = { Text("⚙️ Config") })
                Tab(selected = subTab == 1, onClick = { subTab = 1 }, text = { Text("📁 Catégories") })
                Tab(selected = subTab == 2, onClick = { subTab = 2; selectedCategoryIndex = null }, text = { Text("📋 Historique") })
                Tab(selected = subTab == 3, onClick = { subTab = 3; selectedCategoryIndex = null }, text = { Text("🎨 Panel") })
            }
        }

        when (subTab) {
            0 -> {
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        SectionCard(title = "⚙️ Configuration générale") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Switch(checked = enabled, onCheckedChange = { enabled = it })
                            }
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, categoryId, { categoryId = it }, label = "Catégorie (ID)")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, panelChannelId, { panelChannelId = it }, label = "Channel du Panel")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, logChannelId, { logChannelId = it }, label = "Channel des logs (tickets)")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, transcriptChannelId, { transcriptChannelId = it }, label = "Channel des transcripts")
                            Spacer(Modifier.height(10.dp))
                            RoleSelector(roles, certifiedRoleId, { certifiedRoleId = it }, label = "Rôle Certified")
                            Spacer(Modifier.height(10.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Ping staff à l'ouverture", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Switch(checked = pingStaffOnOpen, onCheckedChange = { pingStaffOnOpen = it })
                            }
                            Spacer(Modifier.height(10.dp))
                            OutlinedTextField(panelTitle, { panelTitle = it }, label = { Text("Titre panel") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(panelText, { panelText = it }, label = { Text("Texte panel") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(bannerUrl, { bannerUrl = it }, label = { Text("Banner URL") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(12.dp))
                            Text("Naming", color = Color.White, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(namingMode, { namingMode = it }, label = { Text("Mode (ex: custom)") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(namingPattern, { namingPattern = it }, label = { Text("Pattern") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(12.dp))
                            OutlinedTextField(transcriptStyle, { transcriptStyle = it }, label = { Text("Transcript style (ex: pro)") }, modifier = Modifier.fillMaxWidth())
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val settings = buildJsonObject {
                                                put("enabled", enabled)
                                                categoryId?.let { put("categoryId", it) }
                                                panelChannelId?.let { put("panelChannelId", it) }
                                                logChannelId?.let { put("logChannelId", it) }
                                                transcriptChannelId?.let { put("transcriptChannelId", it) }
                                                certifiedRoleId?.let { put("certifiedRoleId", it) }
                                                put("pingStaffOnOpen", pingStaffOnOpen)
                                                put("panelTitle", panelTitle)
                                                put("panelText", panelText)
                                                put("bannerUrl", bannerUrl)
                                                put("naming", buildJsonObject {
                                                    put("mode", namingMode)
                                                    put("customPattern", namingPattern)
                                                })
                                                put("transcript", buildJsonObject { put("style", transcriptStyle) })
                                            }

                                            postOrPutSection(
                                                api = api,
                                                json = json,
                                                primaryPostPath = "/api/tickets",
                                                primaryBody = buildJsonObject { put("settings", settings) },
                                                fallbackSectionKey = "tickets",
                                                fallbackSectionBody = settings
                                            )
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Tickets sauvegardés") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Config Tickets")
                            }
                        }
                    }
                }
            }

            1 -> {
                // Toutes les catégories sous forme de vignettes
                if (selectedCategoryIndex == null) {
                    Column(Modifier.fillMaxSize()) {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 160.dp),
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(4.dp)
                        ) {
                            itemsIndexedGrid(categories) { idx, cat ->
                                val key = cat["key"]?.jsonPrimitive?.contentOrNull ?: ""
                                val label = cat["label"]?.jsonPrimitive?.contentOrNull ?: "Catégorie"
                                val emoji = cat["emoji"]?.jsonPrimitive?.contentOrNull ?: "🎫"
                                val staffCount = cat["staffPingRoleIds"]?.jsonArray?.size ?: 0
                                val viewerCount = cat["extraViewerRoleIds"]?.jsonArray?.size ?: 0

                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedCategoryIndex = idx }
                                ) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(emoji, style = MaterialTheme.typography.headlineMedium)
                                        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
                                        Text(key.ifBlank { "(sans key)" }, color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                        Text("📌 $staffCount • 👁️ $viewerCount", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }

                            item {
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            categories = categories + buildJsonObject {
                                                put("key", "nouvelle-categorie")
                                                put("label", "Nouvelle catégorie")
                                                put("emoji", "🎫")
                                                put("description", "")
                                                put("bannerUrl", "")
                                                put("staffPingRoleIds", JsonArray(emptyList()))
                                                put("extraViewerRoleIds", JsonArray(emptyList()))
                                            }
                                            selectedCategoryIndex = categories.size - 1
                                        }
                                ) {
                                    Box(Modifier.padding(14.dp).height(90.dp), contentAlignment = Alignment.Center) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                                            Spacer(Modifier.height(6.dp))
                                            Text("Ajouter", color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val catsArr = JsonArray(categories)
                                            postOrPutSection(
                                                api = api,
                                                json = json,
                                                primaryPostPath = "/api/tickets",
                                                primaryBody = buildJsonObject { put("categories", catsArr) },
                                                fallbackSectionKey = "tickets",
                                                fallbackSectionBody = buildJsonObject { put("categories", catsArr) }
                                            )
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Catégories sauvegardées") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Catégories")
                            }
                        }
                    }
                } else {
                    val idx = selectedCategoryIndex!!
                    val cat = categories.getOrNull(idx) ?: buildJsonObject { }

                    var key by remember(idx) { mutableStateOf(cat["key"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var label by remember(idx) { mutableStateOf(cat["label"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var emoji by remember(idx) { mutableStateOf(cat["emoji"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var description by remember(idx) { mutableStateOf(cat["description"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var banner by remember(idx) { mutableStateOf(cat["bannerUrl"]?.jsonPrimitive?.contentOrNull ?: "") }
                    val staffPing = remember(idx) {
                        cat["staffPingRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    }
                    val viewers = remember(idx) {
                        cat["extraViewerRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    }
                    var staffPingRoleIds by remember(idx) { mutableStateOf(staffPing) }
                    var extraViewerRoleIds by remember(idx) { mutableStateOf(viewers) }
                    var newStaffRoleId by remember { mutableStateOf<String?>(null) }
                    var newViewerRoleId by remember { mutableStateOf<String?>(null) }

                    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(onClick = { selectedCategoryIndex = null }) {
                                    Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                                }
                                Text("Éditer catégorie", color = Color.White, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(48.dp))
                            }
                        }

                        item {
                            SectionCard(title = "📁 Catégorie", subtitle = key.ifBlank { "(sans key)" }) {
                                OutlinedTextField(value = key, onValueChange = { key = it }, label = { Text("Key") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = emoji, onValueChange = { emoji = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = banner, onValueChange = { banner = it }, label = { Text("Banner URL") }, modifier = Modifier.fillMaxWidth())
                            }
                        }

                        item {
                            SectionCard(title = "📌 Staff ping roles (${staffPingRoleIds.size})") {
                                staffPingRoleIds.forEach { roleId ->
                                    RemovableIdRow(
                                        label = "Rôle",
                                        id = roleId,
                                        resolvedName = roles[roleId],
                                        onRemove = { staffPingRoleIds = staffPingRoleIds.filterNot { it == roleId } }
                                    )
                                }
                                RoleSelector(
                                    roles = roles.filterKeys { !staffPingRoleIds.contains(it) },
                                    selectedRoleId = newStaffRoleId,
                                    onRoleSelected = { newStaffRoleId = it },
                                    label = "Ajouter un rôle staff ping"
                                )
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    onClick = { newStaffRoleId?.let { staffPingRoleIds = staffPingRoleIds + it; newStaffRoleId = null } },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = newStaffRoleId != null
                                ) { Text("➕ Ajouter") }
                            }
                        }

                        item {
                            SectionCard(title = "👁️ Viewer roles (${extraViewerRoleIds.size})") {
                                extraViewerRoleIds.forEach { roleId ->
                                    RemovableIdRow(
                                        label = "Rôle",
                                        id = roleId,
                                        resolvedName = roles[roleId],
                                        onRemove = { extraViewerRoleIds = extraViewerRoleIds.filterNot { it == roleId } }
                                    )
                                }
                                RoleSelector(
                                    roles = roles.filterKeys { !extraViewerRoleIds.contains(it) },
                                    selectedRoleId = newViewerRoleId,
                                    onRoleSelected = { newViewerRoleId = it },
                                    label = "Ajouter un viewer rôle"
                                )
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    onClick = { newViewerRoleId?.let { extraViewerRoleIds = extraViewerRoleIds + it; newViewerRoleId = null } },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = newViewerRoleId != null
                                ) { Text("➕ Ajouter") }
                            }
                        }

                        item {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { categories = categories.filterIndexed { i, _ -> i != idx }; selectedCategoryIndex = null },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE53935))
                                ) { Text("🗑️ Supprimer") }

                                Button(
                                    onClick = {
                                        val updated = buildJsonObject {
                                            put("key", key)
                                            put("label", label)
                                            put("emoji", emoji)
                                            put("description", description)
                                            put("bannerUrl", banner)
                                            put("staffPingRoleIds", JsonArray(staffPingRoleIds.map { JsonPrimitive(it) }))
                                            put("extraViewerRoleIds", JsonArray(extraViewerRoleIds.map { JsonPrimitive(it) }))
                                        }
                                        categories = categories.mapIndexed { i, old -> if (i == idx) updated else old }
                                        selectedCategoryIndex = null
                                    },
                                    modifier = Modifier.weight(1f)
                                ) { Text("✅ Appliquer") }
                            }
                        }
                    }
                }
            }

            2 -> {
                // Historique
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        SectionCard(
                            title = "📋 Historique",
                            subtitle = "$recordsCount enregistrements (read-only)"
                        ) {
                            Text(
                                "Le dashboard web affiche l'historique complet. Ici on montre juste un résumé.",
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
            
            3 -> {
                // Panel (preview)
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        SectionCard(
                            title = "🎨 Panel Tickets",
                            subtitle = "Aperçu de la configuration du panel"
                        ) {
                            Column {
                                Text("Titre:", fontWeight = FontWeight.Bold, color = Color.White)
                                Text(panelTitle, color = Color.Gray)
                                Spacer(Modifier.height(12.dp))
                                Text("Texte:", fontWeight = FontWeight.Bold, color = Color.White)
                                Text(panelText.ifBlank { "(aucun texte)" }, color = Color.Gray)
                                Spacer(Modifier.height(12.dp))
                                Text("Banner URL:", fontWeight = FontWeight.Bold, color = Color.White)
                                Text(bannerUrl.ifBlank { "(aucune bannière)" }, color = Color.Gray)
                                Spacer(Modifier.height(12.dp))
                                Text("Catégories disponibles:", fontWeight = FontWeight.Bold, color = Color.White)
                                Text("${categories.size} catégorie(s)", color = Color.Gray)
                                Spacer(Modifier.height(8.dp))
                                categories.forEach { cat ->
                                    val catLabel = cat["label"]?.jsonPrimitive?.contentOrNull ?: "?"
                                    val catEmoji = cat["emoji"]?.jsonPrimitive?.contentOrNull ?: "🎫"
                                    Text("$catEmoji $catLabel", color = Color(0xFF57F287), modifier = Modifier.padding(start = 8.dp, top = 4.dp))
                                }
                            }
                        }
                    }
                    
                    item {
                        SectionCard(
                            title = "ℹ️ Information",
                            subtitle = "Configuration"
                        ) {
                            Text(
                                "Pour modifier le panel, utilisez l'onglet Config ci-dessus.\nLe panel sera automatiquement mis à jour sur Discord.",
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LogsConfigTab(
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val logs = configData?.obj("logs")
    var enabled by remember { mutableStateOf(logs?.bool("enabled") ?: false) }
    var emoji by remember { mutableStateOf(logs?.str("emoji") ?: "📝") }
    var pseudo by remember { mutableStateOf(logs?.bool("pseudo") ?: true) }
    var ignoreBots by remember { mutableStateOf(logs?.obj("filters")?.bool("ignoreBots") ?: true) }

    val categoriesObj = logs?.obj("categories") ?: buildJsonObject { }
    var categories by remember(categoriesObj) {
        mutableStateOf(categoriesObj.mapValues { it.value.jsonPrimitive.booleanOrNull ?: false })
    }
    val channelsObj = logs?.obj("channels") ?: buildJsonObject { }
    var categoryChannels by remember(channelsObj) {
        mutableStateOf(channelsObj.mapValues { it.value.jsonPrimitive.contentOrNull ?: "" })
    }

    val initialIgnoreUsers = remember(logs) { logs?.obj("filters")?.arr("ignoreUsers")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val initialIgnoreChannels = remember(logs) { logs?.obj("filters")?.arr("ignoreChannels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val initialIgnoreRoles = remember(logs) { logs?.obj("filters")?.arr("ignoreRoles")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }

    var ignoreUsers by remember { mutableStateOf(initialIgnoreUsers) }
    var ignoreChannels by remember { mutableStateOf(initialIgnoreChannels) }
    var ignoreRoles by remember { mutableStateOf(initialIgnoreRoles) }

    var newIgnoreUser by remember { mutableStateOf<String?>(null) }
    var newIgnoreChannel by remember { mutableStateOf<String?>(null) }
    var newIgnoreRole by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "📝 Logs", subtitle = "Cats + channels + filtres") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(emoji, { emoji = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Pseudo", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = pseudo, onCheckedChange = { pseudo = it })
                }
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Ignorer les bots", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = ignoreBots, onCheckedChange = { ignoreBots = it })
                }
            }
        }

        item {
            SectionCard(title = "📁 Catégories") {
                categories.keys.sorted().forEach { k ->
                    val checked = categories[k] == true
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(k, color = Color.White)
                        Switch(checked = checked, onCheckedChange = { categories = categories + (k to it) })
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
            }
        }

        item {
            SectionCard(title = "📢 Channels par catégorie") {
                categoryChannels.keys.sorted().forEach { k ->
                    ChannelSelector(
                        channels = channels,
                        selectedChannelId = categoryChannels[k].takeIf { !it.isNullOrBlank() },
                        onChannelSelected = { categoryChannels = categoryChannels + (k to it) },
                        label = "Channel pour $k"
                    )
                    Spacer(Modifier.height(10.dp))
                }
            }
        }

        item {
            SectionCard(title = "🚫 Filtres - Ignorer") {
                Text("👤 Users (${ignoreUsers.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreUsers.forEach { uid ->
                    RemovableIdRow(
                        label = "User",
                        id = uid,
                        resolvedName = members[uid],
                        onRemove = { ignoreUsers = ignoreUsers.filterNot { it == uid } }
                    )
                }
                MemberSelector(
                    members = members.filterKeys { !ignoreUsers.contains(it) },
                    selectedMemberId = newIgnoreUser,
                    onMemberSelected = { newIgnoreUser = it },
                    label = "Ajouter un user à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreUser?.let { ignoreUsers = ignoreUsers + it; newIgnoreUser = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreUser != null
                ) { Text("➕ Ajouter user") }

                Spacer(Modifier.height(12.dp))
                Text("📢 Channels (${ignoreChannels.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreChannels.forEach { chId ->
                    RemovableIdRow(
                        label = "Channel",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { ignoreChannels = ignoreChannels.filterNot { it == chId } }
                    )
                }
                ChannelSelector(
                    channels = channels.filterKeys { !ignoreChannels.contains(it) },
                    selectedChannelId = newIgnoreChannel,
                    onChannelSelected = { newIgnoreChannel = it },
                    label = "Ajouter un channel à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreChannel?.let { ignoreChannels = ignoreChannels + it; newIgnoreChannel = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreChannel != null
                ) { Text("➕ Ajouter channel") }

                Spacer(Modifier.height(12.dp))
                Text("🏷️ Roles (${ignoreRoles.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Role",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { ignoreRoles = ignoreRoles.filterNot { it == rid } }
                    )
                }
                RoleSelector(
                    roles = roles.filterKeys { !ignoreRoles.contains(it) },
                    selectedRoleId = newIgnoreRole,
                    onRoleSelected = { newIgnoreRole = it },
                    label = "Ajouter un rôle à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreRole?.let { ignoreRoles = ignoreRoles + it; newIgnoreRole = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreRole != null
                ) { Text("➕ Ajouter rôle") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val logsBody = buildJsonObject {
                                    put("enabled", enabled)
                                    put("emoji", emoji)
                                    put("pseudo", pseudo)
                                    put("categories", buildJsonObject { categories.forEach { (k, v) -> put(k, v) } })
                                    put("channels", buildJsonObject { categoryChannels.forEach { (k, v) -> put(k, v) } })
                                    put("filters", buildJsonObject {
                                        put("ignoreBots", ignoreBots)
                                        put("ignoreUsers", JsonArray(ignoreUsers.map { JsonPrimitive(it) }))
                                        put("ignoreChannels", JsonArray(ignoreChannels.map { JsonPrimitive(it) }))
                                        put("ignoreRoles", JsonArray(ignoreRoles.map { JsonPrimitive(it) }))
                                    })
                                }

                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/logs",
                                    primaryBody = buildJsonObject { put("logs", logsBody) },
                                    fallbackSectionKey = "logs",
                                    fallbackSectionBody = logsBody
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Logs sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Logs")
                }
            }
        }
    }
}

@Composable
private fun ConfessConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val confess = configData?.obj("confess")
    var mode by remember { mutableStateOf("sfw") }
    var logChannelId by remember { mutableStateOf(confess?.str("logChannelId")) }
    var allowReplies by remember { mutableStateOf(confess?.bool("allowReplies") ?: false) }
    var threadNaming by remember { mutableStateOf(confess?.str("threadNaming") ?: "") }
    val initialNames = remember(confess) { confess?.arr("nsfwNames")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var nsfwNames by remember { mutableStateOf(initialNames) }
    var newName by remember { mutableStateOf("") }

    val sfwChannelsInit = remember(confess) { confess?.obj("sfw")?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val nsfwChannelsInit = remember(confess) { confess?.obj("nsfw")?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var sfwChannels by remember { mutableStateOf(sfwChannelsInit) }
    var nsfwChannels by remember { mutableStateOf(nsfwChannelsInit) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    val activeList = if (mode == "sfw") sfwChannels else nsfwChannels

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "💬 Confess", subtitle = "SFW/NSFW + logs + options") {
                TabRow(selectedTabIndex = if (mode == "sfw") 0 else 1) {
                    Tab(selected = mode == "sfw", onClick = { mode = "sfw" }, text = { Text("🟢 SFW") })
                    Tab(selected = mode == "nsfw", onClick = { mode = "nsfw" }, text = { Text("🔴 NSFW") })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, logChannelId, { logChannelId = it }, label = "Channel des logs")
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Autoriser les réponses", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = allowReplies, onCheckedChange = { allowReplies = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(threadNaming, { threadNaming = it }, label = { Text("Thread naming") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "📋 Channels ${mode.uppercase()} (${activeList.size})") {
                activeList.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = {
                            if (mode == "sfw") sfwChannels = sfwChannels.filterNot { it == chId }
                            else nsfwChannels = nsfwChannels.filterNot { it == chId }
                        }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !activeList.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        newChannelId?.let { id ->
                            if (mode == "sfw") sfwChannels = sfwChannels + id else nsfwChannels = nsfwChannels + id
                            newChannelId = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            SectionCard(title = "🏷️ NSFW Names (${nsfwNames.size})", subtitle = "Utilisé pour le naming NSFW") {
                nsfwNames.forEach { nm ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(nm, color = Color.White)
                        IconButton(onClick = { nsfwNames = nsfwNames.filterNot { it == nm } }) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
                        }
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(newName, { newName = it }, label = { Text("Nouveau nom") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { nsfwNames = nsfwNames + newName.trim(); newName = "" },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newName.trim().isNotBlank()
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("sfw", buildJsonObject { put("channels", JsonArray(sfwChannels.map { JsonPrimitive(it) })) })
                                    put("nsfw", buildJsonObject { put("channels", JsonArray(nsfwChannels.map { JsonPrimitive(it) })) })
                                    logChannelId?.let { put("logChannelId", it) }
                                    put("allowReplies", allowReplies)
                                    put("threadNaming", threadNaming)
                                    put("nsfwNames", JsonArray(nsfwNames.map { JsonPrimitive(it) }))
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/confess",
                                    primaryBody = buildJsonObject { put("settings", body) },
                                    fallbackSectionKey = "confess",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Confess sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Confess")
                }
            }
        }
    }
}

@Composable
private fun WelcomeConfigTab(
    api: ApiClient,
    json: Json,
    channels: Map<String, String>,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }
    var sendEmbedInDM by remember { mutableStateOf(false) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/welcome")
                    val data = json.parseToJsonElement(resp).jsonObject
                    val obj = data["welcome"]?.jsonObject ?: data // Support both formats
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        channelId = obj["channelId"]?.jsonPrimitive?.contentOrNull
                        message = obj["message"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedEnabled = obj["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        embedTitle = obj["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedDescription = obj["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedColor = obj["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedFooter = obj["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                        sendEmbedInDM = obj["sendEmbedInDM"]?.jsonPrimitive?.booleanOrNull ?: false
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👋 Welcome", subtitle = "Messages + embed") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, channelId, { channelId = it }, label = "Channel welcome")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(message, { message = it }, label = { Text("Message") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Embed", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = embedEnabled, onCheckedChange = { embedEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(embedTitle, { embedTitle = it }, label = { Text("Embed title") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedDescription, { embedDescription = it }, label = { Text("Embed description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedColor, { embedColor = it }, label = { Text("Embed color") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedFooter, { embedFooter = it }, label = { Text("Embed footer") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Envoyer l'embed en DM", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = sendEmbedInDM, onCheckedChange = { sendEmbedInDM = it })
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val welcome = buildJsonObject {
                                        put("enabled", enabled)
                                        put("channelId", channelId ?: "")
                                        put("message", message)
                                        put("embedEnabled", embedEnabled)
                                        put("embedTitle", embedTitle)
                                        put("embedDescription", embedDescription)
                                        put("embedColor", embedColor)
                                        put("embedFooter", embedFooter)
                                        put("sendEmbedInDM", sendEmbedInDM)
                                    }
                                    api.postJson("/api/welcome", json.encodeToString(JsonObject.serializer(), buildJsonObject { put("welcome", welcome) }))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Welcome sauvegardé") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }
    }
}

@Composable
private fun GoodbyeConfigTab(
    api: ApiClient,
    json: Json,
    channels: Map<String, String>,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/goodbye")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        channelId = obj["channelId"]?.jsonPrimitive?.contentOrNull
                        message = obj["message"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedEnabled = obj["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        embedTitle = obj["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedDescription = obj["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedColor = obj["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedFooter = obj["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "😢 Goodbye", subtitle = "Messages + embed") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, channelId, { channelId = it }, label = "Channel goodbye")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(message, { message = it }, label = { Text("Message") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Embed", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = embedEnabled, onCheckedChange = { embedEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(embedTitle, { embedTitle = it }, label = { Text("Embed title") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedDescription, { embedDescription = it }, label = { Text("Embed description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedColor, { embedColor = it }, label = { Text("Embed color") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedFooter, { embedFooter = it }, label = { Text("Embed footer") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val goodbye = buildJsonObject {
                                        put("enabled", enabled)
                                        put("channelId", channelId ?: "")
                                        put("message", message)
                                        put("embedEnabled", embedEnabled)
                                        put("embedTitle", embedTitle)
                                        put("embedDescription", embedDescription)
                                        put("embedColor", embedColor)
                                        put("embedFooter", embedFooter)
                                    }
                                    api.postJson("/api/goodbye", json.encodeToString(JsonObject.serializer(), buildJsonObject { put("goodbye", goodbye) }))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Goodbye sauvegardé") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }
    }
}

@Composable
private fun StaffConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val initial = remember(configData) {
        configData?.arr("staffRoleIds")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
    }
    var staffRoles by remember { mutableStateOf(initial) }
    var newRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👥 Staff roles", subtitle = "${staffRoles.size} rôle(s)") {
                staffRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { staffRoles = staffRoles.filterNot { it == rid } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(
                    roles = roles.filterKeys { !staffRoles.contains(it) },
                    selectedRoleId = newRoleId,
                    onRoleSelected = { newRoleId = it },
                    label = "Ajouter un rôle staff"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { newRoleId?.let { staffRoles = staffRoles + it; newRoleId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newRoleId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("staffRoleIds", JsonArray(staffRoles.map { JsonPrimitive(it) })) }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/staff",
                                    primaryBody = body,
                                    fallbackSectionKey = "staffRoleIds",
                                    fallbackSectionBody = JsonObject(body)
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Staff sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Staff")
                }
            }
        }
    }
}

@Composable
private fun AutoKickConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val autokick = configData?.obj("autokick")
    var enabled by remember { mutableStateOf(autokick?.bool("enabled") ?: false) }
    var roleId by remember { mutableStateOf(autokick?.str("roleId")) }
    var delayMs by remember { mutableStateOf((autokick?.int("delayMs") ?: 172800000).toString()) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👢 AutoKick", subtitle = "Role + délai") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(roles, roleId, { roleId = it }, label = "Rôle AutoKick")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = delayMs,
                    onValueChange = { delayMs = it },
                    label = { Text("Délai (ms)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("autokick", buildJsonObject {
                                        put("enabled", enabled)
                                        put("roleId", roleId ?: "")
                                        put("delayMs", delayMs.toLongOrNull() ?: 172800000)
                                    })
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/autokick",
                                    primaryBody = body,
                                    fallbackSectionKey = "autokick",
                                    fallbackSectionBody = body["autokick"]!!.jsonObject
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ AutoKick sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder AutoKick")
                }
            }
        }
    }
}

@Composable
private fun InactivityConfigTab(
    members: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var delayDays by remember { mutableStateOf("30") }
    var inactiveRoleId by remember { mutableStateOf<String?>(null) }
    var excludedRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var trackingCount by remember { mutableIntStateOf(0) }
    var selectedMember by remember { mutableStateOf<String?>(null) }
    var newExcludedRole by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/inactivity")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val tracking = obj["tracking"]?.jsonObject?.size ?: 0
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        delayDays = (obj["delayDays"]?.jsonPrimitive?.intOrNull ?: 30).toString()
                        inactiveRoleId = obj["inactiveRoleId"]?.jsonPrimitive?.contentOrNull
                        excludedRoleIds = obj["excludedRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                        trackingCount = tracking
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "⏰ Inactivité", subtitle = "Config + outils") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = delayDays,
                    onValueChange = { delayDays = it },
                    label = { Text("Délai (jours)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                RoleSelector(roles, inactiveRoleId, { inactiveRoleId = it }, label = "Rôle Inactif")
                Spacer(Modifier.height(10.dp))
                Text("Exclusions (${excludedRoleIds.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                excludedRoleIds.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle exclu",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { excludedRoleIds = excludedRoleIds.filterNot { it == rid } }
                    )
                }
                RoleSelector(
                    roles = roles.filterKeys { !excludedRoleIds.contains(it) },
                    selectedRoleId = newExcludedRole,
                    onRoleSelected = { newExcludedRole = it },
                    label = "Ajouter un rôle exclu"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newExcludedRole?.let { excludedRoleIds = excludedRoleIds + it; newExcludedRole = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newExcludedRole != null
                ) { Text("➕ Ajouter rôle exclu") }
                Spacer(Modifier.height(8.dp))
                Text("Tracking: $trackingCount membres", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject {
                                        put("enabled", enabled)
                                        put("delayDays", delayDays.toIntOrNull() ?: 30)
                                        put("excludedRoleIds", JsonArray(excludedRoleIds.map { JsonPrimitive(it) }))
                                        put("inactiveRoleId", inactiveRoleId?.let { JsonPrimitive(it) } ?: JsonNull)
                                    }
                                    api.postJson("/api/inactivity", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Inactivité sauvegardée") }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }

        item {
            SectionCard(title = "🔧 Outils", subtitle = "Reset / tracking") {
                MemberSelector(members, selectedMember, { selectedMember = it }, label = "Sélectionner un membre")
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        val uid = selectedMember ?: return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    api.postJson("/api/inactivity/reset/$uid", "{}")
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Reset inactivité: ${members[uid] ?: uid}") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = selectedMember != null
                ) { Text("🔄 Reset inactivité membre") }

                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    api.postJson("/api/inactivity/add-all-members", "{}")
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Ajout auto members au tracking") }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("➕ Ajouter tous les membres au tracking") }
            }
        }
    }
}

@Composable
private fun AutoThreadConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val at = configData?.obj("autothread")
    val initialChannels = remember(at) { at?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var channelIds by remember { mutableStateOf(initialChannels) }
    var namingMode by remember { mutableStateOf(at?.obj("naming")?.str("mode") ?: "nsfw") }
    var customPattern by remember { mutableStateOf(at?.obj("naming")?.str("customPattern") ?: "") }
    var policy by remember { mutableStateOf(at?.str("policy") ?: "new_messages") }
    var archivePolicy by remember { mutableStateOf(at?.str("archivePolicy") ?: "1w") }
    val initialNames = remember(at) { at?.arr("nsfwNames")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var nsfwNames by remember { mutableStateOf(initialNames) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var newName by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🧵 AutoThread") {
                Text("Channels (${channelIds.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { channelIds = channelIds.filterNot { it == chId } }
                    )
                }
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newChannelId?.let { channelIds = channelIds + it; newChannelId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }

                Spacer(Modifier.height(12.dp))
                OutlinedTextField(namingMode, { namingMode = it }, label = { Text("Naming mode") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(customPattern, { customPattern = it }, label = { Text("Custom pattern") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(policy, { policy = it }, label = { Text("Policy") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(archivePolicy, { archivePolicy = it }, label = { Text("Archive policy") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "🏷️ NSFW Names (${nsfwNames.size})") {
                nsfwNames.forEach { nm ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(nm, color = Color.White)
                        IconButton(onClick = { nsfwNames = nsfwNames.filterNot { it == nm } }) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
                        }
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(newName, { newName = it }, label = { Text("Nouveau nom") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { nsfwNames = nsfwNames + newName.trim(); newName = "" },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newName.trim().isNotBlank()
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("channels", JsonArray(channelIds.map { JsonPrimitive(it) }))
                                    put("naming", buildJsonObject {
                                        put("mode", namingMode)
                                        put("customPattern", customPattern)
                                    })
                                    put("policy", policy)
                                    put("archivePolicy", archivePolicy)
                                    put("nsfwNames", JsonArray(nsfwNames.map { JsonPrimitive(it) }))
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/autothread",
                                    primaryBody = buildJsonObject { put("autothread", body) },
                                    fallbackSectionKey = "autothread",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ AutoThread sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder AutoThread")
                }
            }
        }
    }
}

@Composable
private fun DisboardConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val dis = configData?.obj("disboard")
    var remindersEnabled by remember { mutableStateOf(dis?.bool("remindersEnabled") ?: false) }
    var remindChannelId by remember { mutableStateOf(dis?.str("remindChannelId")) }
    val lastBumpAt = dis?.str("lastBumpAt") ?: dis?.get("lastBumpAt")?.jsonPrimitive?.longOrNull?.toString()
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "📢 Disboard", subtitle = "Rappels + channel") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer les rappels", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = remindersEnabled, onCheckedChange = { remindersEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, remindChannelId, { remindChannelId = it }, label = "Channel de rappel")
                Spacer(Modifier.height(10.dp))
                Text("Dernier bump: ${lastBumpAt ?: "N/A"}", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("remindersEnabled", remindersEnabled)
                                    put("remindChannelId", remindChannelId ?: "")
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/disboard",
                                    primaryBody = buildJsonObject { put("disboard", body) },
                                    fallbackSectionKey = "disboard",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Disboard sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Disboard")
                }
            }
        }
    }
}

@Composable
private fun GeoConfigTab(
    configData: JsonObject?,
    members: Map<String, String>
) {
    val geo = configData?.obj("geo")
    val locs = geo?.obj("locations") ?: buildJsonObject { }
    
    data class Location(val userId: String, val city: String, val lat: Double, val lon: Double, val updatedAt: String)
    
    val locations = remember(locs) {
        locs.mapNotNull { (uid, el) ->
            val o = el.jsonObject
            val city = o["city"]?.jsonPrimitive?.contentOrNull ?: ""
            val lat = o["lat"]?.jsonPrimitive?.doubleOrNull ?: return@mapNotNull null
            val lon = o["lon"]?.jsonPrimitive?.doubleOrNull ?: return@mapNotNull null
            val updatedAt = o["updatedAt"]?.jsonPrimitive?.contentOrNull ?: ""
            Location(uid, city, lat, lon, updatedAt)
        }
    }
    
    var selectedLocation by remember { mutableStateOf<Location?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(Modifier.fillMaxSize()) {
        // Header
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "🌍 Géolocalisation",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    "${locations.size} membre(s) localisé(s)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }
        }
        
        // Tabs
        TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.List, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Membres")
                    }
                }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Place, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Carte")
                    }
                }
            )
        }

        when (selectedTab) {
            0 -> {
                // List view
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item { Spacer(Modifier.height(8.dp)) }
                    
                    itemsIndexed(locations.sortedBy { members[it.userId] ?: it.userId }) { _, location ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedLocation = location },
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedLocation == location) Color(0xFF2E2E2E) else Color(0xFF1E1E1E)
                    )
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    members[location.userId] ?: "Membre inconnu",
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    "ID: ${location.userId.takeLast(8)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                tint = Color(0xFF5865F2),
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        
                        Spacer(Modifier.height(8.dp))
                        
                        Text(
                            location.city.ifBlank { "Ville inconnue" },
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF5865F2),
                            style = MaterialTheme.typography.bodyLarge
                        )
                        
                        Spacer(Modifier.height(8.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Column {
                                Text(
                                    "📍 Latitude",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                                Text(
                                    location.lat.toString(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.White,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                )
                            }
                            Column {
                                Text(
                                    "📍 Longitude",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                                Text(
                                    location.lon.toString(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.White,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                )
                            }
                        }
                        
                        if (location.updatedAt.isNotBlank()) {
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Mis à jour: ${location.updatedAt}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }
            
            if (locations.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Default.Place,
                                    contentDescription = null,
                                    tint = Color.Gray.copy(alpha = 0.5f),
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(Modifier.height(16.dp))
                                Text(
                                    "Aucune localisation enregistrée",
                                    color = Color.Gray.copy(alpha = 0.7f),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
                    }
                }
            }
            1 -> {
                // Map view with OSMDroid
                if (locations.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                tint = Color.Gray.copy(alpha = 0.5f),
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "Aucune localisation à afficher",
                                color = Color.Gray,
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodyLarge
                            )
                        }
                    }
                } else {
                    Card(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        androidx.compose.ui.viewinterop.AndroidView(
                            factory = { context ->
                                // Configure OSMDroid
                                org.osmdroid.config.Configuration.getInstance().apply {
                                    userAgentValue = context.packageName
                                }
                                
                                org.osmdroid.views.MapView(context).apply {
                                    // Configure tile source
                                    setTileSource(org.osmdroid.tileprovider.tilesource.TileSourceFactory.MAPNIK)
                                    
                                    // Enable multi-touch
                                    setMultiTouchControls(true)
                                    
                                    // Enable built-in zoom controls
                                    setBuiltInZoomControls(true)
                                    
                                    // Set zoom level
                                    controller.setZoom(5.5)
                                    minZoomLevel = 3.0
                                    maxZoomLevel = 18.0
                                    
                                    // Calculate center of all locations
                                    val avgLat = locations.map { it.lat }.average()
                                    val avgLon = locations.map { it.lon }.average()
                                    controller.setCenter(org.osmdroid.util.GeoPoint(avgLat, avgLon))
                                    
                                    // Add markers for each location
                                    locations.forEach { location ->
                                        val marker = org.osmdroid.views.overlay.Marker(this).apply {
                                            position = org.osmdroid.util.GeoPoint(location.lat, location.lon)
                                            title = members[location.userId] ?: "Membre inconnu"
                                            snippet = "${location.city.ifBlank { "Ville inconnue" }}\nLat: ${location.lat}, Lon: ${location.lon}"
                                            setAnchor(org.osmdroid.views.overlay.Marker.ANCHOR_CENTER, org.osmdroid.views.overlay.Marker.ANCHOR_BOTTOM)
                                            
                                            // Info window that shows on tap
                                            setOnMarkerClickListener { marker, mapView ->
                                                marker.showInfoWindow()
                                                true
                                            }
                                        }
                                        overlays.add(marker)
                                    }
                                    
                                    // Refresh map
                                    invalidate()
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RawConfigTab(configData: JsonObject?, json: Json) {
    val pretty = remember(configData) {
        try {
            if (configData == null) "null"
            else Json { prettyPrint = true }.encodeToString(JsonObject.serializer(), configData)
        } catch (_: Exception) {
            configData?.toString() ?: "null"
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🧾 Config brute (/api/configs)", subtitle = "Lecture seule") {
                Text(pretty, color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

