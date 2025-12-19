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

// CONTINUING WITH MORE SECTIONS... (This file will be very large)
// I'll create sections for: Logs, Economy, Levels, Counting, Confess, Staff, Geo, etc.
