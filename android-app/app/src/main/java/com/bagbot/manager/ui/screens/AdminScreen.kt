package com.bagbot.manager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.ui.theme.*
import com.bagbot.manager.safeString
import com.bagbot.manager.safeBoolean
import com.bagbot.manager.safeStringList
import com.bagbot.manager.safeObjectList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

// Helper pour extraire une chaîne d'un JsonElement (primitive ou objet avec id)
private fun JsonElement.stringOrId(): String? {
    return this.safeString()
}

@Composable
fun AdminScreen(
    api: ApiClient,
    members: Map<String, String>,
    onShowSnackbar: suspend (String) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var allowedUsers by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var selectedMember by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val json = remember { Json { ignoreUnknownKeys = true } }
    
    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val response = api.getJson("/api/admin/allowed-users")
            val data = json.parseToJsonElement(response).jsonObject
            allowedUsers = data["allowedUsers"]?.jsonArray?.mapNotNull {
                it.stringOrId()
            } ?: emptyList()
        } catch (e: Exception) {
            onShowSnackbar("Erreur: ${e.message ?: e.toString()}")
        } finally {
            isLoading = false
        }
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        TabRow(selectedTabIndex = selectedTab) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("🔐 Accès") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("👥 Sessions") }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                text = { Text("⚙️ Système") }
            )
        }
        
        when (selectedTab) {
            0 -> AccessManagementTab(
                api = api,
                members = members,
                allowedUsers = allowedUsers,
                isLoading = isLoading,
                selectedMember = selectedMember,
                onSelectedMemberChange = { selectedMember = it },
                onAllowedUsersChange = { allowedUsers = it },
                onIsLoadingChange = { isLoading = it },
                onShowSnackbar = onShowSnackbar,
                json = json,
                scope = scope
            )
            1 -> SessionsTab(api, members, json, scope, onShowSnackbar)
            2 -> SystemTab(api, json, scope, onShowSnackbar)
        }
    }
}

@Composable
fun AccessManagementTab(
    api: ApiClient,
    members: Map<String, String>,
    allowedUsers: List<String>,
    isLoading: Boolean,
    selectedMember: String?,
    onSelectedMemberChange: (String?) -> Unit,
    onAllowedUsersChange: (List<String>) -> Unit,
    onIsLoadingChange: (Boolean) -> Unit,
    onShowSnackbar: suspend (String) -> Unit,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope
) {
    var userToRevoke by remember { mutableStateOf<String?>(null) }
    var showRevokeConfirm by remember { mutableStateOf(false) }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = BagPurple)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Security,
                        contentDescription = null,
                        tint = BagWhite,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(
                            "Gestion des Accès",
                            style = MaterialTheme.typography.headlineSmall,
                            color = BagWhite
                        )
                        Text(
                            "${allowedUsers.size} utilisateur(s) autorisé(s)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BagLightPurple
                        )
                    }
                }
            }
        }
        
        // Add user card
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Ajouter un utilisateur",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Spacer(Modifier.height(8.dp))
                    
                    MemberSelector(
                        members = members.filterKeys { !allowedUsers.contains(it) },
                        selectedMemberId = selectedMember,
                        onMemberSelected = { onSelectedMemberChange(it) },
                        label = "Sélectionner un membre"
                    )
                    
                    Spacer(Modifier.height(8.dp))
                    
                    Button(
                        onClick = {
                            selectedMember?.let { userId ->
                                scope.launch {
                                    onIsLoadingChange(true)
                                    try {
                                        val username = members[userId] ?: "Unknown"
                                        val body = buildJsonObject {
                                            put("userId", userId)
                                            put("username", username)
                                        }
                                        api.postJson("/api/admin/allowed-users", body.toString())
                                        
                                        val response = api.getJson("/api/admin/allowed-users")
                                        val data = json.parseToJsonElement(response).jsonObject
                                        onAllowedUsersChange(data["allowedUsers"]?.jsonArray?.mapNotNull {
                                            it.stringOrId()
                                        } ?: emptyList())
                                        
                                        onSelectedMemberChange(null)
                                        onShowSnackbar("✅ Utilisateur ajouté")
                                    } catch (e: Exception) {
                                        onShowSnackbar("❌ Erreur: ${e.message ?: e.toString()}")
                                    } finally {
                                        onIsLoadingChange(false)
                                    }
                                }
                            }
                        },
                        enabled = selectedMember != null && !isLoading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Autoriser l'accès")
                    }
                }
            }
        }
        
        // Revoke card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = BagError.copy(alpha = 0.1f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = BagError,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "Révocation totale d'accès",
                            style = MaterialTheme.typography.titleMedium,
                            color = BagError
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Retirer DÉFINITIVEMENT l'accès à l'application (même si admin)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Spacer(Modifier.height(12.dp))
                    
                    MemberSelector(
                        members = allowedUsers.associateWith { members[it] ?: "Utilisateur $it" },
                        selectedMemberId = userToRevoke,
                        onMemberSelected = { userToRevoke = it },
                        label = "Sélectionner l'utilisateur à révoquer"
                    )
                    
                    Spacer(Modifier.height(8.dp))
                    
                    Button(
                        onClick = { showRevokeConfirm = true },
                        enabled = userToRevoke != null && !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = BagError)
                    ) {
                        Icon(Icons.Default.Block, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Révoquer définitivement")
                    }
                    
                    if (showRevokeConfirm && userToRevoke != null) {
                        AlertDialog(
                            onDismissRequest = { showRevokeConfirm = false },
                            title = { Text("⚠️ Confirmation") },
                            text = {
                                Column {
                                    Text("Voulez-vous vraiment révoquer DÉFINITIVEMENT l'accès de :")
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        members[userToRevoke] ?: "Utilisateur inconnu",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = BagError
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "Cette action est irréversible et retire tous les droits, même admin.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        scope.launch {
                                            onIsLoadingChange(true)
                                            try {
                                                val uid = userToRevoke ?: return@launch
                                                api.deleteJson("/api/admin/allowed-users/$uid")
                                                
                                                val response = api.getJson("/api/admin/allowed-users")
                                                val data = json.parseToJsonElement(response).jsonObject
                                                onAllowedUsersChange(data["allowedUsers"]?.jsonArray?.mapNotNull {
                                                    it.stringOrId()
                                                } ?: emptyList())
                                                
                                                userToRevoke = null
                                                showRevokeConfirm = false
                                                onShowSnackbar("✅ Accès retiré")
                                            } catch (e: Exception) {
                                                onShowSnackbar("❌ Erreur: ${e.message ?: e.toString()}")
                                            } finally {
                                                onIsLoadingChange(false)
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = BagError)
                                ) {
                                    Text("Révoquer")
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { showRevokeConfirm = false }) {
                                    Text("Annuler")
                                }
                            }
                        )
                    }
                }
            }
        }
        
        // Title for list
        item {
            Text(
                "Utilisateurs autorisés",
                style = MaterialTheme.typography.titleMedium
            )
        }
        
        // Loading or empty state
        if (isLoading) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        } else if (allowedUsers.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "Aucun utilisateur autorisé pour le moment",
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
        
        // List of allowed users
        if (!isLoading && allowedUsers.isNotEmpty()) {
            items(allowedUsers) { userId ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = BagCard
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                members[userId] ?: "Utilisateur inconnu",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                "ID: $userId",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                        
                        IconButton(
                            onClick = {
                                scope.launch {
                                    onIsLoadingChange(true)
                                    try {
                                        api.deleteJson("/api/admin/allowed-users/$userId")
                                        
                                        val response = api.getJson("/api/admin/allowed-users")
                                        val data = json.parseToJsonElement(response).jsonObject
                                        onAllowedUsersChange(data["allowedUsers"]?.jsonArray?.mapNotNull {
                                            it.stringOrId()
                                        } ?: emptyList())
                                        
                                        onShowSnackbar("✅ Utilisateur retiré")
                                    } catch (e: Exception) {
                                        onShowSnackbar("❌ Erreur: ${e.message ?: e.toString()}")
                                    } finally {
                                        onIsLoadingChange(false)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Retirer l'accès",
                                tint = BagError
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SessionsTab(
    api: ApiClient,
    members: Map<String, String>,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    onShowSnackbar: suspend (String) -> Unit
) {
    var sessions by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var staffRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var founderIds by remember { mutableStateOf<List<String>>(emptyList()) }
    
    fun loadSessions() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    // Charger les sessions
                    val resp = api.getJson("/api/admin/sessions")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val sessionsList = obj["sessions"]?.jsonArray.safeObjectList()
                    
                    // Charger la config pour les rôles staff
                    val configResp = api.getJson("/api/configs")
                    val config = json.parseToJsonElement(configResp).jsonObject
                    val staffRoles = config["staffRoleIds"]?.jsonArray.safeStringList()
                    
                    // Charger les fondateurs (hardcoded pour l'instant)
                    val founders = listOf("943487722738311219")
                    
                    withContext(Dispatchers.Main) {
                        sessions = sessionsList
                        staffRoleIds = staffRoles
                        founderIds = founders
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        onShowSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) { loadSessions() }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = BagPurple)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.People,
                            contentDescription = null,
                            tint = BagWhite,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text(
                                "Sessions Actives",
                                style = MaterialTheme.typography.headlineSmall,
                                color = BagWhite
                            )
                            Text(
                                "${sessions.size} utilisateur(s) connecté(s)",
                                style = MaterialTheme.typography.bodyMedium,
                                color = BagLightPurple
                            )
                        }
                    }
                    IconButton(onClick = { loadSessions() }, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recharger", tint = BagWhite)
                    }
                }
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (sessions.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.People,
                                contentDescription = null,
                                tint = Color.Gray.copy(alpha = 0.5f),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "Aucune session active",
                                color = Color.Gray,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
        
        if (!isLoading && sessions.isNotEmpty()) {
            items(sessions) { session ->
                val userId = session["userId"].safeString() ?: ""
                val userRolesList = session["roles"]?.jsonArray?.mapNotNull { 
                    it.safeString()
                } ?: emptyList()
                val lastSeen = session["lastSeen"].safeString() ?: ""
                val isOnline = session["isOnline"].safeBoolean() ?: false
                
                // Déterminer le rôle (même logique que BotControlScreen)
                val role = when {
                    userId in founderIds -> "👑 Fondateur"
                    userRolesList.any { it in staffRoleIds } -> "⚡ Admin"
                    else -> "👤 Membre"
                }
                
                val roleColor = when {
                    userId in founderIds -> Color(0xFFFFD700)
                    userRolesList.any { it in staffRoleIds } -> Color(0xFF5865F2)
                    else -> Color.Gray
                }
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isOnline) BagCard else BagCard.copy(alpha = 0.5f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .background(
                                        if (isOnline) Color(0xFF57F287) 
                                        else Color.Gray,
                                        shape = CircleShape
                                    )
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    members[userId] ?: "Utilisateur inconnu",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    "ID: ${userId.takeLast(8)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    role,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = roleColor,
                                    fontWeight = FontWeight.Bold
                                )
                                if (lastSeen.isNotBlank()) {
                                    Text(
                                        "Vu: $lastSeen",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SystemTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    onShowSnackbar: suspend (String) -> Unit
) {
    var systemStats by remember { mutableStateOf<JsonObject?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var isCleaningLogs by remember { mutableStateOf(false) }
    var isCleaningBackups by remember { mutableStateOf(false) }
    var isCleaningTemp by remember { mutableStateOf(false) }
    var isCleaningAll by remember { mutableStateOf(false) }
    var showCleanupConfirm by remember { mutableStateOf(false) }
    var cleanupAction by remember { mutableStateOf("") }
    
    fun loadSystemStats() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/system/stats")
                    val stats = json.parseToJsonElement(resp).jsonObject
                    withContext(Dispatchers.Main) {
                        systemStats = stats
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        onShowSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }
    
    fun cleanup(type: String) {
        scope.launch {
            when(type) {
                "logs" -> isCleaningLogs = true
                "backups" -> isCleaningBackups = true
                "temp" -> isCleaningTemp = true
                "all" -> isCleaningAll = true
            }
            
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.postJson("/api/system/cleanup/$type", "{}")
                    val result = json.parseToJsonElement(resp).jsonObject
                    
                    withContext(Dispatchers.Main) {
                        if (type == "all") {
                            val totalFreed = result["totalFreedMB"]?.safeString() ?: "0"
                            val totalDeleted = result["totalDeletedCount"]?.toString() ?: "0"
                            onShowSnackbar("✅ Nettoyé: $totalDeleted fichiers ($totalFreed MB)")
                        } else {
                            val freed = result["freedSpaceMB"]?.safeString() ?: "0"
                            val deleted = result["deletedCount"]?.toString() ?: "0"
                            onShowSnackbar("✅ Nettoyé: $deleted fichiers ($freed MB)")
                        }
                        loadSystemStats()
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        onShowSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        when(type) {
                            "logs" -> isCleaningLogs = false
                            "backups" -> isCleaningBackups = false
                            "temp" -> isCleaningTemp = false
                            "all" -> isCleaningAll = false
                        }
                    }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) { loadSystemStats() }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = BagPurple)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = null,
                            tint = BagWhite,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text(
                                "Système & Maintenance",
                                style = MaterialTheme.typography.headlineSmall,
                                color = BagWhite
                            )
                            Text(
                                "Monitoring et nettoyage",
                                style = MaterialTheme.typography.bodyMedium,
                                color = BagLightPurple
                            )
                        }
                    }
                    IconButton(onClick = { loadSystemStats() }, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recharger", tint = BagWhite)
                    }
                }
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (systemStats != null) {
            val memory = systemStats!!["memory"]?.jsonObject
            val cpu = systemStats!!["cpu"]?.jsonObject
            val uptime = systemStats!!["uptime"]?.jsonObject
            val disk = systemStats!!["disk"]?.jsonObject
            val backups = systemStats!!["backups"]?.jsonObject
            val logs = systemStats!!["logs"]?.jsonObject
            val cache = systemStats!!["cache"]?.jsonObject
            val temp = systemStats!!["temp"]?.jsonObject
            
            // RAM Card
            if (memory != null) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Memory, null, tint = BagPurple)
                                Spacer(Modifier.width(8.dp))
                                Text("Mémoire RAM", style = MaterialTheme.typography.titleMedium)
                            }
                            Spacer(Modifier.height(12.dp))
                            
                            val usagePercent = memory["usagePercent"]?.safeString()?.toFloatOrNull() ?: 0f
                            LinearProgressIndicator(
                                progress = usagePercent / 100f,
                                modifier = Modifier.fillMaxWidth().height(8.dp),
                                color = when {
                                    usagePercent > 90 -> BagError
                                    usagePercent > 70 -> Color(0xFFFF9800)
                                    else -> BagSuccess
                                }
                            )
                            
                            Spacer(Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "${memory["usedGB"]?.safeString() ?: "?"} GB utilisés",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    "${memory["usagePercent"]?.safeString() ?: "?"}%",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Total: ${memory["totalGB"]?.safeString() ?: "?"} GB",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }
            
            // CPU & Uptime Card
            if (cpu != null || uptime != null) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Computer, null, tint = BagPurple)
                                Spacer(Modifier.width(8.dp))
                                Text("Processeur & Uptime", style = MaterialTheme.typography.titleMedium)
                            }
                            Spacer(Modifier.height(12.dp))
                            
                            if (cpu != null) {
                                Text(
                                    "CPU: ${cpu["cores"]?.toString() ?: "?"} cœurs",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                            
                            if (uptime != null) {
                                Text(
                                    "Uptime: ${uptime["formatted"]?.safeString() ?: "?"}",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                }
            }
            
            // Disk Card
            if (disk != null) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Storage, null, tint = BagPurple)
                                Spacer(Modifier.width(8.dp))
                                Text("Disque", style = MaterialTheme.typography.titleMedium)
                            }
                            Spacer(Modifier.height(12.dp))
                            
                            val usage = disk["usagePercent"]?.safeString() ?: "?"
                            val usageNum = usage.replace("%", "").toFloatOrNull() ?: 0f
                            
                            LinearProgressIndicator(
                                progress = usageNum / 100f,
                                modifier = Modifier.fillMaxWidth().height(8.dp),
                                color = when {
                                    usageNum > 90 -> BagError
                                    usageNum > 70 -> Color(0xFFFF9800)
                                    else -> BagSuccess
                                }
                            )
                            
                            Spacer(Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "Utilisé: ${disk["used"]?.safeString() ?: "?"}",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    usage,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Total: ${disk["total"]?.safeString() ?: "?"} | Libre: ${disk["free"]?.safeString() ?: "?"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }
            
            // Section Fichiers
            item {
                Text(
                    "Gestion des Fichiers",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
            
            // Backups Card
            if (backups != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = BagCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Backup, null, tint = Color(0xFF2196F3), modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Backups", style = MaterialTheme.typography.titleMedium)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "${backups["count"]?.toString() ?: "0"} fichiers",
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        "${backups["totalSizeMB"]?.safeString() ?: "0"} MB",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                                
                                Button(
                                    onClick = { 
                                        cleanupAction = "backups"
                                        showCleanupConfirm = true 
                                    },
                                    enabled = !isCleaningBackups,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800))
                                ) {
                                    if (isCleaningBackups) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = BagWhite,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Default.CleaningServices, null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Nettoyer", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Garde les 10 plus récents",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
            
            // Logs Card
            if (logs != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = BagCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Description, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Logs", style = MaterialTheme.typography.titleMedium)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "${logs["count"]?.toString() ?: "0"} fichiers",
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        "${logs["totalSizeMB"]?.safeString() ?: "0"} MB",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                                
                                Button(
                                    onClick = { 
                                        cleanupAction = "logs"
                                        showCleanupConfirm = true 
                                    },
                                    enabled = !isCleaningLogs,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800))
                                ) {
                                    if (isCleaningLogs) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = BagWhite,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Default.CleaningServices, null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Nettoyer", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Supprime les logs > 7 jours",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
            
            // Temp Files Card
            if (temp != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = BagCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.FolderDelete, null, tint = Color(0xFF9C27B0), modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Fichiers Temporaires", style = MaterialTheme.typography.titleMedium)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "${temp["count"]?.toString() ?: "0"} fichiers",
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        "${temp["totalSizeMB"]?.safeString() ?: "0"} MB",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                                
                                Button(
                                    onClick = { 
                                        cleanupAction = "temp"
                                        showCleanupConfirm = true 
                                    },
                                    enabled = !isCleaningTemp,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800))
                                ) {
                                    if (isCleaningTemp) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = BagWhite,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Default.CleaningServices, null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Nettoyer", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Supprime les fichiers > 1 jour",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
            
            // Cache Info Card
            if (cache != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = BagCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Cached, null, tint = Color(0xFFFF5722), modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Cache", style = MaterialTheme.typography.titleMedium)
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "${cache["totalSizeMB"]?.safeString() ?: "0"} MB",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Fichiers de configuration actifs",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
            
            // Cleanup All Button
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = BagError.copy(alpha = 0.1f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.DeleteSweep,
                                contentDescription = null,
                                tint = BagError,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Nettoyage Complet",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = BagError
                                )
                                Text(
                                    "Nettoie logs, backups et fichiers temporaires",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        }
                        
                        Spacer(Modifier.height(12.dp))
                        
                        Button(
                            onClick = { 
                                cleanupAction = "all"
                                showCleanupConfirm = true 
                            },
                            enabled = !isCleaningAll,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = BagError)
                        ) {
                            if (isCleaningAll) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = BagWhite,
                                    strokeWidth = 2.dp
                                )
                                Spacer(Modifier.width(8.dp))
                                Text("Nettoyage en cours...")
                            } else {
                                Icon(Icons.Default.DeleteSweep, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Tout Nettoyer")
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Confirmation Dialog
    if (showCleanupConfirm) {
        AlertDialog(
            onDismissRequest = { showCleanupConfirm = false },
            title = { Text("⚠️ Confirmer le nettoyage") },
            text = {
                Text(when(cleanupAction) {
                    "logs" -> "Supprimer les logs de plus de 7 jours ?"
                    "backups" -> "Garder les 10 backups les plus récents et supprimer les autres ?"
                    "temp" -> "Supprimer les fichiers temporaires de plus de 1 jour ?"
                    "all" -> "Nettoyer tous les fichiers (logs, backups, temporaires) ?"
                    else -> "Confirmer cette action ?"
                })
            },
            confirmButton = {
                Button(
                    onClick = {
                        cleanup(cleanupAction)
                        showCleanupConfirm = false
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (cleanupAction == "all") BagError else Color(0xFFFF9800)
                    )
                ) {
                    Text("Nettoyer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCleanupConfirm = false }) {
                    Text("Annuler")
                }
            }
        )
    }
}
