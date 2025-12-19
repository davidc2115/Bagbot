package com.bagbot.manager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

// ============================================================================
// WELCOME - Messages de bienvenue
// ============================================================================
@Composable
fun WelcomeConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }
    var sendEmbedInDM by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/welcome")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    channelId = data["channelId"]?.jsonPrimitive?.contentOrNull ?: ""
                    message = data["message"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedEnabled = data["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    embedTitle = data["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedDescription = data["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedColor = data["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedFooter = data["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                    sendEmbedInDM = data["sendEmbedInDM"]?.jsonPrimitive?.booleanOrNull ?: false
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("👋 Messages de bienvenue", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Settings,
                color = Color(0xFF4CAF50),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("channelId", channelId)
                                put("message", message)
                                put("embedEnabled", embedEnabled)
                                put("embedTitle", embedTitle)
                                put("embedDescription", embedDescription)
                                put("embedColor", embedColor)
                                put("embedFooter", embedFooter)
                                put("sendEmbedInDM", sendEmbedInDM)
                            }
                            api.putJson("/api/configs/welcome", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                Spacer(Modifier.height(16.dp))
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = channelId,
                    onChannelSelected = { channelId = it },
                    label = "Salon de bienvenue"
                )
                Spacer(Modifier.height(16.dp))
                ConfigTextField(
                    label = "Message",
                    value = message,
                    onValueChange = { message = it },
                    placeholder = "Bienvenue {user} !",
                    multiline = true
                )
                Spacer(Modifier.height(16.dp))
                ConfigSwitch(
                    label = "Activer l'embed",
                    checked = embedEnabled,
                    onCheckedChange = { embedEnabled = it }
                )
                
                if (embedEnabled) {
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Titre embed",
                        value = embedTitle,
                        onValueChange = { embedTitle = it }
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Description",
                        value = embedDescription,
                        onValueChange = { embedDescription = it },
                        multiline = true
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Couleur (hex)",
                        value = embedColor,
                        onValueChange = { embedColor = it },
                        placeholder = "#4CAF50"
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Footer",
                        value = embedFooter,
                        onValueChange = { embedFooter = it }
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigSwitch(
                        label = "Envoyer en DM",
                        checked = sendEmbedInDM,
                        onCheckedChange = { sendEmbedInDM = it }
                    )
                }
            }
        }
    }
}

// ============================================================================
// GOODBYE - Messages d'au revoir
// ============================================================================
@Composable
fun GoodbyeConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/goodbye")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    channelId = data["channelId"]?.jsonPrimitive?.contentOrNull ?: ""
                    message = data["message"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedEnabled = data["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    embedTitle = data["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedDescription = data["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedColor = data["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                    embedFooter = data["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("😢 Messages d'au revoir", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Settings,
                color = Color(0xFF8B4513),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("channelId", channelId)
                                put("message", message)
                                put("embedEnabled", embedEnabled)
                                put("embedTitle", embedTitle)
                                put("embedDescription", embedDescription)
                                put("embedColor", embedColor)
                                put("embedFooter", embedFooter)
                            }
                            api.putJson("/api/configs/goodbye", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                Spacer(Modifier.height(16.dp))
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = channelId,
                    onChannelSelected = { channelId = it },
                    label = "Salon d'au revoir"
                )
                Spacer(Modifier.height(16.dp))
                ConfigTextField(
                    label = "Message",
                    value = message,
                    onValueChange = { message = it },
                    placeholder = "Au revoir {user} !",
                    multiline = true
                )
                Spacer(Modifier.height(16.dp))
                ConfigSwitch(
                    label = "Activer l'embed",
                    checked = embedEnabled,
                    onCheckedChange = { embedEnabled = it }
                )
                
                if (embedEnabled) {
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Titre embed",
                        value = embedTitle,
                        onValueChange = { embedTitle = it }
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Description",
                        value = embedDescription,
                        onValueChange = { embedDescription = it },
                        multiline = true
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Couleur (hex)",
                        value = embedColor,
                        onValueChange = { embedColor = it },
                        placeholder = "#8B4513"
                    )
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Footer",
                        value = embedFooter,
                        onValueChange = { embedFooter = it }
                    )
                }
            }
        }
    }
}

// ============================================================================
// TICKETS - Système de tickets
// ============================================================================
@Composable
fun TicketsConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    roles: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var panelChannelId by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf("") }
    var staffPingRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedRoleToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/tickets")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    panelChannelId = data["panelChannelId"]?.jsonPrimitive?.contentOrNull ?: ""
                    categoryId = data["categoryId"]?.jsonPrimitive?.contentOrNull ?: ""
                    staffPingRoleIds = data["staffPingRoleIds"]?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("🎫 Système de tickets", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.ConfirmationNumber,
                color = Color(0xFFE67E22),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("panelChannelId", panelChannelId)
                                put("categoryId", categoryId)
                                putJsonArray("staffPingRoleIds") {
                                    staffPingRoleIds.forEach { add(it) }
                                }
                            }
                            api.putJson("/api/configs/tickets", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                Spacer(Modifier.height(16.dp))
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = panelChannelId,
                    onChannelSelected = { panelChannelId = it },
                    label = "Canal du panel"
                )
                Spacer(Modifier.height(16.dp))
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = categoryId,
                    onChannelSelected = { categoryId = it },
                    label = "Catégorie des tickets"
                )
                Spacer(Modifier.height(16.dp))
                
                Text("Rôles staff à ping", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                
                staffPingRoleIds.forEach { roleId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(roles[roleId] ?: roleId, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                staffPingRoleIds = staffPingRoleIds.filter { it != roleId }
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                RoleSelector(
                    roles = roles,
                    selectedRoleId = selectedRoleToAdd,
                    onRoleSelected = { selectedRoleToAdd = it },
                    label = "Ajouter un rôle"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedRoleToAdd?.let {
                            if (!staffPingRoleIds.contains(it)) {
                                staffPingRoleIds = staffPingRoleIds + it
                            }
                            selectedRoleToAdd = null
                        }
                    },
                    enabled = selectedRoleToAdd != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le rôle")
                }
            }
        }
    }
}

// ============================================================================
// LOGS - Système de logs
// ============================================================================
@Composable
fun LogsConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var categories by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var channelsConfig by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/logs")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    categories = data["categories"]?.jsonObject?.mapValues { 
                        it.value.jsonPrimitive.booleanOrNull ?: false 
                    } ?: emptyMap()
                    channelsConfig = data["channels"]?.jsonObject?.mapValues { 
                        it.value.jsonPrimitive.contentOrNull ?: "" 
                    } ?: emptyMap()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("📝 Système de Logs", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Settings,
                color = Color(0xFF95A5A6),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                putJsonObject("categories") {
                                    categories.forEach { (k, v) -> put(k, v) }
                                }
                                putJsonObject("channels") {
                                    channelsConfig.forEach { (k, v) -> put(k, v) }
                                }
                            }
                            api.putJson("/api/configs/logs", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                
                Spacer(Modifier.height(16.dp))
                Text("Catégories de logs", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                categories.keys.forEach { category ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            ConfigSwitch(
                                label = category.capitalize(),
                                checked = categories[category] ?: false,
                                onCheckedChange = { 
                                    categories = categories + (category to it)
                                }
                            )
                            Spacer(Modifier.height(8.dp))
                            ChannelSelector(
                                channels = channels,
                                selectedChannelId = channelsConfig[category] ?: "",
                                onChannelSelected = { 
                                    channelsConfig = channelsConfig + (category to it)
                                },
                                label = "Salon de log"
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

// ============================================================================
// STAFF - Gestion des rôles staff
// ============================================================================
@Composable
fun StaffConfigScreen(
    api: ApiClient,
    roles: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var staffRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedRoleToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/staff")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    staffRoleIds = data["staffRoleIds"]?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("👥 Rôles Staff", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Group,
                color = Color(0xFFFFD700),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                putJsonArray("staffRoleIds") {
                                    staffRoleIds.forEach { add(it) }
                                }
                            }
                            api.putJson("/api/configs/staff", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                Text("Rôles staff (${staffRoleIds.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                staffRoleIds.forEach { roleId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(roles[roleId] ?: roleId, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                staffRoleIds = staffRoleIds.filter { it != roleId }
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                RoleSelector(
                    roles = roles,
                    selectedRoleId = selectedRoleToAdd,
                    onRoleSelected = { selectedRoleToAdd = it },
                    label = "Ajouter un rôle"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedRoleToAdd?.let {
                            if (!staffRoleIds.contains(it)) {
                                staffRoleIds = staffRoleIds + it
                            }
                            selectedRoleToAdd = null
                        }
                    },
                    enabled = selectedRoleToAdd != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le rôle")
                }
            }
        }
    }
}

// ============================================================================
// CONFESSIONS - Système de confessions
// ============================================================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfessConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var sfwChannels by remember { mutableStateOf<List<String>>(emptyList()) }
    var nsfwChannels by remember { mutableStateOf<List<String>>(emptyList()) }
    var logChannelId by remember { mutableStateOf("") }
    var allowReplies by remember { mutableStateOf(false) }
    var threadNaming by remember { mutableStateOf("sfw") }
    var counter by remember { mutableStateOf(0) }
    var nsfwNames by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedChannelToAdd by remember { mutableStateOf<String?>(null) }
    var newNsfwName by remember { mutableStateOf("") }
    var currentMode by remember { mutableStateOf("sfw") }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/confess")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    sfwChannels = data["sfw"]?.jsonObject?.get("channels")?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                    nsfwChannels = data["nsfw"]?.jsonObject?.get("channels")?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                    logChannelId = data["logChannelId"]?.jsonPrimitive?.contentOrNull ?: ""
                    allowReplies = data["allowReplies"]?.jsonPrimitive?.booleanOrNull ?: false
                    threadNaming = data["threadNaming"]?.jsonPrimitive?.contentOrNull ?: "sfw"
                    counter = data["counter"]?.jsonPrimitive?.intOrNull ?: 0
                    nsfwNames = data["nsfwNames"]?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("💬 Confessions", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { currentMode = "sfw" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (currentMode == "sfw") Color(0xFF4CAF50) else Color(0xFF2A2A2A)
                    )
                ) {
                    Text("🟢 SFW")
                }
                Button(
                    onClick = { currentMode = "nsfw" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (currentMode == "nsfw") Color(0xFFE53935) else Color(0xFF2A2A2A)
                    )
                ) {
                    Text("🔴 NSFW")
                }
            }
        }
        
        item {
            val channelsList = if (currentMode == "sfw") sfwChannels else nsfwChannels
            
            ConfigSection(
                title = "Channels ${currentMode.uppercase()}",
                icon = Icons.Default.Forum,
                color = if (currentMode == "sfw") Color(0xFF4CAF50) else Color(0xFFE53935),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                putJsonObject("sfw") {
                                    putJsonArray("channels") {
                                        sfwChannels.forEach { add(it) }
                                    }
                                }
                                putJsonObject("nsfw") {
                                    putJsonArray("channels") {
                                        nsfwChannels.forEach { add(it) }
                                    }
                                }
                                put("logChannelId", logChannelId)
                                put("allowReplies", allowReplies)
                                put("threadNaming", threadNaming)
                                put("counter", counter)
                                putJsonArray("nsfwNames") {
                                    nsfwNames.forEach { add(it) }
                                }
                            }
                            api.putJson("/api/configs/confess", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                Text("Channels configurés: ${channelsList.size}", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                
                channelsList.forEach { channelId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(channels[channelId] ?: channelId, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                if (currentMode == "sfw") {
                                    sfwChannels = sfwChannels.filter { it != channelId }
                                } else {
                                    nsfwChannels = nsfwChannels.filter { it != channelId }
                                }
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = selectedChannelToAdd,
                    onChannelSelected = { selectedChannelToAdd = it },
                    label = "Ajouter un channel"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedChannelToAdd?.let { chId ->
                            if (currentMode == "sfw") {
                                if (!sfwChannels.contains(chId)) {
                                    sfwChannels = sfwChannels + chId
                                }
                            } else {
                                if (!nsfwChannels.contains(chId)) {
                                    nsfwChannels = nsfwChannels + chId
                                }
                            }
                            selectedChannelToAdd = null
                        }
                    },
                    enabled = selectedChannelToAdd != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le channel")
                }
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Configuration générale", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = logChannelId,
                    onChannelSelected = { logChannelId = it },
                    label = "Channel de logs"
                )
                Spacer(Modifier.height(16.dp))
                
                ConfigSwitch(
                    label = "Réponses autorisées",
                    checked = allowReplies,
                    onCheckedChange = { allowReplies = it }
                )
                Spacer(Modifier.height(16.dp))
                
                Text("Mode de nommage des threads", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it }
                ) {
                    OutlinedTextField(
                        value = when(threadNaming) {
                            "sfw" -> "SFW (noms normaux)"
                            "nsfw" -> "NSFW (noms sensuels)"
                            "counter" -> "Compteur (#confession-1, #confession-2...)"
                            else -> threadNaming
                        },
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("SFW (noms normaux)") },
                            onClick = { threadNaming = "sfw"; expanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("NSFW (noms sensuels)") },
                            onClick = { threadNaming = "nsfw"; expanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("Compteur") },
                            onClick = { threadNaming = "counter"; expanded = false }
                        )
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                Text("Confessions totales: $counter", style = MaterialTheme.typography.bodyLarge)
                
                if (threadNaming == "nsfw") {
                    Spacer(Modifier.height(16.dp))
                    Divider()
                    Spacer(Modifier.height(16.dp))
                    
                    Text("Noms NSFW (${nsfwNames.size})", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    
                    nsfwNames.forEach { name ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(name, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    nsfwNames = nsfwNames.filter { it != name }
                                }) {
                                    Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                    
                    ConfigTextField(
                        label = "Ajouter un nom NSFW",
                        value = newNsfwName,
                        onValueChange = { newNsfwName = it },
                        placeholder = "Ex: Velours, Mystique..."
                    )
                    Spacer(Modifier.height(8.dp))
                    
                    Button(
                        onClick = {
                            if (newNsfwName.isNotBlank()) {
                                nsfwNames = nsfwNames + newNsfwName
                                newNsfwName = ""
                            }
                        },
                        enabled = newNsfwName.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ajouter le nom")
                    }
                }
            }
        }
    }
}

// ============================================================================
// AUTOKICK - Système d'auto-kick
// ============================================================================
@Composable
fun AutoKickConfigScreen(
    api: ApiClient,
    roles: Map<String, String>,
    members: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var roleId by remember { mutableStateOf("") }
    var delayMs by remember { mutableStateOf(3600000L) }
    var pendingJoiners by remember { mutableStateOf<Map<String, Long>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/autokick")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    roleId = data["roleId"]?.jsonPrimitive?.contentOrNull ?: ""
                    delayMs = data["delayMs"]?.jsonPrimitive?.longOrNull ?: 3600000L
                    pendingJoiners = data["pendingJoiners"]?.jsonObject?.mapValues { 
                        it.value.jsonPrimitive.longOrNull ?: 0L 
                    } ?: emptyMap()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("👢 AutoKick", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.PersonRemove,
                color = Color(0xFFDC143C),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("roleId", roleId)
                                put("delayMs", delayMs)
                            }
                            api.putJson("/api/configs/autokick", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                Spacer(Modifier.height(16.dp))
                
                RoleSelector(
                    roles = roles,
                    selectedRoleId = roleId,
                    onRoleSelected = { roleId = it },
                    label = "Rôle à vérifier"
                )
                Spacer(Modifier.height(16.dp))
                
                ConfigNumberField(
                    label = "Délai avant kick (en heures)",
                    value = (delayMs / 3600000).toInt(),
                    onValueChange = { delayMs = it.toLong() * 3600000 },
                    min = 1,
                    max = 720
                )
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Membres en attente (${pendingJoiners.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                if (pendingJoiners.isNotEmpty()) {
                    pendingJoiners.forEach { (userId, timestamp) ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Text(
                                    members[userId] ?: "Utilisateur inconnu",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                Text(
                                    "Depuis: ${java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(java.util.Date(timestamp))}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                } else {
                    Text(
                        "Aucun membre en attente",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}

// ============================================================================
// INACTIVITY - Système de kick pour inactivité
// ============================================================================
@Composable
fun InactivityConfigScreen(
    api: ApiClient,
    roles: Map<String, String>,
    members: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var delayDays by remember { mutableStateOf(30) }
    var inactiveRoleId by remember { mutableStateOf<String?>(null) }
    var excludedRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var inactivityTracking by remember { mutableStateOf<Map<String, JsonObject>>(emptyMap()) }
    var selectedRoleToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/inactivity")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    enabled = data["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                    delayDays = data["delayDays"]?.jsonPrimitive?.intOrNull ?: 30
                    inactiveRoleId = data["inactiveRoleId"]?.jsonPrimitive?.contentOrNull
                    excludedRoleIds = data["excludedRoleIds"]?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                    inactivityTracking = data["tracking"]?.jsonObject?.mapValues { 
                        it.value.jsonObject 
                    } ?: emptyMap()
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("⏰ Kick Inactivité", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Timer,
                color = Color(0xFFFF69B4),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("delayDays", delayDays)
                                inactiveRoleId?.let { put("inactiveRoleId", it) }
                                putJsonArray("excludedRoleIds") {
                                    excludedRoleIds.forEach { add(it) }
                                }
                            }
                            api.putJson("/api/configs/inactivity", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Système activé",
                    checked = enabled,
                    onCheckedChange = { enabled = it }
                )
                Spacer(Modifier.height(16.dp))
                
                ConfigNumberField(
                    label = "Délai d'inactivité (en jours)",
                    value = delayDays,
                    onValueChange = { delayDays = it },
                    min = 1,
                    max = 365
                )
                Spacer(Modifier.height(16.dp))
                
                RoleSelector(
                    roles = roles,
                    selectedRoleId = inactiveRoleId,
                    onRoleSelected = { inactiveRoleId = it },
                    label = "Rôle 'Inactif' (optionnel)"
                )
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Rôles exempts (${excludedRoleIds.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                excludedRoleIds.forEach { roleId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(roles[roleId] ?: roleId, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                excludedRoleIds = excludedRoleIds.filter { it != roleId }
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                RoleSelector(
                    roles = roles,
                    selectedRoleId = selectedRoleToAdd,
                    onRoleSelected = { selectedRoleToAdd = it },
                    label = "Ajouter un rôle exempt"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedRoleToAdd?.let {
                            if (!excludedRoleIds.contains(it)) {
                                excludedRoleIds = excludedRoleIds + it
                            }
                            selectedRoleToAdd = null
                        }
                    },
                    enabled = selectedRoleToAdd != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le rôle")
                }
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Membres trackés (${inactivityTracking.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                if (inactivityTracking.isNotEmpty()) {
                    inactivityTracking.forEach { (userId, data) ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Text(
                                    members[userId] ?: "Utilisateur inconnu",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                val lastActivity = data["lastActivity"]?.jsonPrimitive?.longOrNull
                                if (lastActivity != null) {
                                    Text(
                                        "Dernière activité: ${java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(java.util.Date(lastActivity))}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                } else {
                    Text(
                        "Aucun membre tracké",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}

// ============================================================================
// AUTOTHREAD - Création automatique de threads
// ============================================================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AutoThreadConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var channelsList by remember { mutableStateOf<List<String>>(emptyList()) }
    var namingMode by remember { mutableStateOf("default") }
    var customPattern by remember { mutableStateOf("") }
    var archivePolicy by remember { mutableStateOf("max") }
    var counter by remember { mutableStateOf(0) }
    var selectedChannelToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs/autothread")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    channelsList = data["channels"]?.jsonArray?.mapNotNull {
                        it.jsonPrimitive.contentOrNull
                    } ?: emptyList()
                    namingMode = data["naming"]?.jsonObject?.get("mode")?.jsonPrimitive?.contentOrNull ?: "default"
                    customPattern = data["naming"]?.jsonObject?.get("customPattern")?.jsonPrimitive?.contentOrNull ?: ""
                    archivePolicy = data["archive"]?.jsonObject?.get("policy")?.jsonPrimitive?.contentOrNull ?: "max"
                    counter = data["counter"]?.jsonPrimitive?.intOrNull ?: 0
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("🧵 AutoThread", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Forum,
                color = Color(0xFF20B2AA),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                putJsonArray("channels") {
                                    channelsList.forEach { add(it) }
                                }
                                putJsonObject("naming") {
                                    put("mode", namingMode)
                                    put("customPattern", customPattern)
                                }
                                putJsonObject("archive") {
                                    put("policy", archivePolicy)
                                }
                                put("counter", counter)
                            }
                            api.putJson("/api/configs/autothread", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                Text("Channels surveillés (${channelsList.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                channelsList.forEach { channelId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(channels[channelId] ?: channelId, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                channelsList = channelsList.filter { it != channelId }
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = selectedChannelToAdd,
                    onChannelSelected = { selectedChannelToAdd = it },
                    label = "Ajouter un channel"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedChannelToAdd?.let {
                            if (!channelsList.contains(it)) {
                                channelsList = channelsList + it
                            }
                            selectedChannelToAdd = null
                        }
                    },
                    enabled = selectedChannelToAdd != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le channel")
                }
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Mode de nommage", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it }
                ) {
                    OutlinedTextField(
                        value = when(namingMode) {
                            "default" -> "Défaut (nom du message)"
                            "nsfw" -> "NSFW (noms sensuels)"
                            "counter" -> "Compteur (#thread-1, #thread-2...)"
                            "custom" -> "Personnalisé"
                            else -> namingMode
                        },
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Défaut") },
                            onClick = { namingMode = "default"; expanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("NSFW") },
                            onClick = { namingMode = "nsfw"; expanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("Compteur") },
                            onClick = { namingMode = "counter"; expanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("Personnalisé") },
                            onClick = { namingMode = "custom"; expanded = false }
                        )
                    }
                }
                
                if (namingMode == "custom") {
                    Spacer(Modifier.height(16.dp))
                    ConfigTextField(
                        label = "Pattern personnalisé",
                        value = customPattern,
                        onValueChange = { customPattern = it },
                        placeholder = "{counter} - {author}"
                    )
                }
                
                Spacer(Modifier.height(16.dp))
                
                Text("Politique d'archivage", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                var expandedArchive by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expandedArchive,
                    onExpandedChange = { expandedArchive = it }
                ) {
                    OutlinedTextField(
                        value = when(archivePolicy) {
                            "max" -> "Maximum (1 semaine)"
                            "day" -> "1 jour"
                            "three_days" -> "3 jours"
                            "week" -> "1 semaine"
                            else -> archivePolicy
                        },
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedArchive) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = expandedArchive,
                        onDismissRequest = { expandedArchive = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Maximum (1 semaine)") },
                            onClick = { archivePolicy = "max"; expandedArchive = false }
                        )
                        DropdownMenuItem(
                            text = { Text("1 jour") },
                            onClick = { archivePolicy = "day"; expandedArchive = false }
                        )
                        DropdownMenuItem(
                            text = { Text("3 jours") },
                            onClick = { archivePolicy = "three_days"; expandedArchive = false }
                        )
                        DropdownMenuItem(
                            text = { Text("1 semaine") },
                            onClick = { archivePolicy = "week"; expandedArchive = false }
                        )
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                Text("Threads créés: $counter", style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}
