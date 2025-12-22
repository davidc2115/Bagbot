@file:OptIn(ExperimentalMaterial3Api::class)

package com.bagbot.manager

import android.net.Uri
import android.util.Log
import android.media.MediaPlayer
import android.content.Context
import android.provider.MediaStore
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import com.bagbot.manager.ui.theme.BagBotTheme
import com.bagbot.manager.ui.screens.SplashScreen
import com.bagbot.manager.ui.screens.ConfigDashboardScreen
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.safeString
import com.bagbot.manager.safeInt
import com.bagbot.manager.safeBoolean
import com.bagbot.manager.safeStringOrEmpty
import com.bagbot.manager.safeIntOrZero
import com.bagbot.manager.safeBooleanOrFalse
import com.bagbot.manager.safeStringList
import com.bagbot.manager.safeObjectList
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
        listOf("tickets", "confess", "counting", "disboard", "autothread", "motCache")
    ),
    ConfigGroup(
        "customization",
        "🎨 Personnalisation",
        Icons.Default.Palette,
        Color(0xFFFF9800),
        listOf("footerLogoUrl", "geo")
    )
)



// ============================================
// CHAT STAFF v2.1.6 - À ajouter avant la fin du fichier
// ============================================

// ============================================
// NOUVELLES SECTIONS v2.1.7
// ============================================

// ---------------- ÉCONOMIE COMPLÈTE ----------------
data class UserBalance(val userId: String, val amount: Int)

@Composable
fun EconomyFullScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>
) {
    var balances by remember { mutableStateOf<List<UserBalance>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var showEditDialog by remember { mutableStateOf(false) }
    var editingUser by remember { mutableStateOf<String?>(null) }
    
    fun loadBalances() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/economy/balances")
                    val data = json.parseToJsonElement(response).jsonObject
                    withContext(Dispatchers.Main) {
                        balances = data["balances"]?.jsonArray?.map {
                            val obj = it.jsonObject
                            UserBalance(
                                userId = obj["userId"].safeStringOrEmpty(),
                                amount = obj["amount"].safeIntOrZero()
                            )
                        }?.sortedByDescending { it.amount } ?: emptyList()
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
    
    LaunchedEffect(Unit) { loadBalances() }
    
    val filteredBalances = balances.filter {
        val memberName = members[it.userId] ?: it.userId
        memberName.contains(searchQuery, ignoreCase = true) || it.userId.contains(searchQuery)
    }
    
    Column(Modifier.fillMaxSize()) {
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFFFA726))) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AttachMoney, null, tint = Color.White, modifier = Modifier.size(32.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("💰 Économie", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("${balances.size} utilisateurs", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { loadBalances() }) {
                        Icon(Icons.Default.Refresh, "Actualiser", tint = Color.White)
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Rechercher un utilisateur...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                )
            }
        }
        
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(filteredBalances) { index, balance ->
                    val memberName = members[balance.userId] ?: balance.userId
                    Card(
                        Modifier.fillMaxWidth().clickable { editingUser = balance.userId; showEditDialog = true },
                        colors = CardDefaults.cardColors(containerColor = when {
                            index == 0 -> Color(0xFFFFD700)
                            index == 1 -> Color(0xFFC0C0C0)
                            index == 2 -> Color(0xFFCD7F32)
                            else -> Color(0xFF2A2A2A)
                        })
                    ) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("#${index + 1}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (index < 3) Color.Black else Color.White)
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(memberName, fontWeight = FontWeight.Bold, color = if (index < 3) Color.Black else Color.White)
                                    Text(balance.userId.take(8) + "...", style = MaterialTheme.typography.bodySmall, color = if (index < 3) Color.Black.copy(alpha = 0.6f) else Color.Gray)
                                }
                            }
                            Text("${balance.amount} 💰", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = if (index < 3) Color.Black else Color(0xFFFFA726))
                        }
                    }
                }
            }
        }
    }
}

// ---------------- NIVEAUX COMPLET ----------------
data class UserLevel(val userId: String, val xp: Int, val level: Int, val messages: Int)

@Composable
fun LevelsFullScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>
) {
    var leaderboard by remember { mutableStateOf<List<UserLevel>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    
    fun loadLeaderboard() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/levels/leaderboard")
                    val data = json.parseToJsonElement(response).jsonObject
                    withContext(Dispatchers.Main) {
                        leaderboard = data["leaderboard"]?.jsonArray?.map {
                            val obj = it.jsonObject
                            UserLevel(
                                userId = obj["userId"].safeStringOrEmpty(),
                                xp = obj["xp"].safeIntOrZero(),
                                level = obj["level"]?.jsonPrimitive?.int ?: 0,
                                messages = obj["messages"]?.jsonPrimitive?.int ?: 0
                            )
                        } ?: emptyList()
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
    
    LaunchedEffect(Unit) { loadLeaderboard() }
    
    val filteredLeaderboard = leaderboard.filter {
        val memberName = members[it.userId] ?: it.userId
        memberName.contains(searchQuery, ignoreCase = true) || it.userId.contains(searchQuery)
    }
    
    Column(Modifier.fillMaxSize()) {
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF9C27B0))) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.TrendingUp, null, tint = Color.White, modifier = Modifier.size(32.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("📈 Classement XP", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("${leaderboard.size} utilisateurs", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { loadLeaderboard() }) {
                        Icon(Icons.Default.Refresh, "Actualiser", tint = Color.White)
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Rechercher un utilisateur...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                )
            }
        }
        
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(filteredLeaderboard) { index, user ->
                    val memberName = members[user.userId] ?: user.userId
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = when {
                            index == 0 -> Color(0xFFFFD700)
                            index == 1 -> Color(0xFFC0C0C0)
                            index == 2 -> Color(0xFFCD7F32)
                            else -> Color(0xFF2A2A2A)
                        })
                    ) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("#${index + 1}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (index < 3) Color.Black else Color.White)
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(memberName, fontWeight = FontWeight.Bold, color = if (index < 3) Color.Black else Color.White)
                                    Text("${user.messages} messages", style = MaterialTheme.typography.bodySmall, color = if (index < 3) Color.Black.copy(alpha = 0.6f) else Color.Gray)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Niveau ${user.level}", fontWeight = FontWeight.Bold, color = if (index < 3) Color.Black else Color(0xFF9C27B0))
                                Text("${user.xp} XP", style = MaterialTheme.typography.bodySmall, color = if (index < 3) Color.Black.copy(alpha = 0.6f) else Color.Gray)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------- FUN SCREEN (GIFs + Prompts) ----------------
@Composable
fun FunFullScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var selectedTab by remember { mutableStateOf(0) }
    var truthPrompts by remember { mutableStateOf<List<String>>(emptyList()) }
    var darePrompts by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var newPrompt by remember { mutableStateOf("") }
    var selectedMode by remember { mutableStateOf("truth") }
    
    fun loadPrompts() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/truthdare/prompts")
                    val data = json.parseToJsonElement(response).jsonObject
                    val prompts = data["prompts"]?.jsonObject
                    withContext(Dispatchers.Main) {
                        truthPrompts = prompts?.get("truth")?.jsonArray.safeStringList()
                        darePrompts = prompts?.get("dare")?.jsonArray.safeStringList()
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
    
    fun addPrompt() {
        if (newPrompt.isBlank()) return
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val body = buildJsonObject {
                        put("mode", selectedMode)
                        put("text", newPrompt)
                    }
                    api.postJson("/api/truthdare/prompt", body.toString())
                    withContext(Dispatchers.Main) {
                        newPrompt = ""
                        loadPrompts()
                        snackbar.showSnackbar("✅ Prompt ajouté")
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) { loadPrompts() }
    
    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("🎲 Prompts AouV") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("🎬 GIFs") })
        }
        
        when (selectedTab) {
            0 -> {
                Column(Modifier.fillMaxSize()) {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFE91E63))) {
                        Column(Modifier.padding(16.dp)) {
                            Text("🎲 Action ou Vérité", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            Row(Modifier.fillMaxWidth()) {
                                FilterChip(selected = selectedMode == "truth", onClick = { selectedMode = "truth" }, label = { Text("💭 Vérités (${truthPrompts.size})") })
                                Spacer(Modifier.width(8.dp))
                                FilterChip(selected = selectedMode == "dare", onClick = { selectedMode = "dare" }, label = { Text("🎯 Actions (${darePrompts.size})") })
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = newPrompt,
                                    onValueChange = { newPrompt = it },
                                    modifier = Modifier.weight(1f),
                                    placeholder = { Text("Nouveau prompt...") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                                )
                                Spacer(Modifier.width(8.dp))
                                IconButton(onClick = { addPrompt() }, enabled = newPrompt.isNotBlank()) {
                                    Icon(Icons.Default.Add, "Ajouter", tint = if (newPrompt.isNotBlank()) Color.White else Color.Gray)
                                }
                            }
                        }
                    }
                    LazyColumn(Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(if (selectedMode == "truth") truthPrompts else darePrompts) { prompt ->
                            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(prompt, modifier = Modifier.weight(1f), color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Image, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                        Spacer(Modifier.height(16.dp))
                        Text("🎬 GIFs", style = MaterialTheme.typography.titleLarge, color = Color.Gray)
                        Text("Fonctionnalité en développement", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
            }
        }
    }
}



data class StaffMessage(
    val id: String,
    val userId: String,
    val username: String,
    val message: String,
    val timestamp: String,
    val type: String = "text", // "text", "attachment", "command"
    val attachmentUrl: String? = null,
    val attachmentType: String? = null, // "image", "video", "file"
    val room: String = "global"
)

// Fonction pour créer le canal de notification
fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channelId = "staff_chat_channel"
        val channelName = "Chat Staff"
        val channelDescription = "Notifications pour les messages du chat staff"
        val importance = NotificationManager.IMPORTANCE_HIGH
        
        val channel = NotificationChannel(channelId, channelName, importance).apply {
            description = channelDescription
        }
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }
}

// Fonction pour envoyer une notification
fun sendStaffChatNotification(context: Context, senderName: String, message: String) {
    try {
        val notificationId = System.currentTimeMillis().toInt()
        val channelId = "staff_chat_channel"
        
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("💬 Chat Staff - $senderName")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
        
        val notificationManager = NotificationManagerCompat.from(context)
        try {
            notificationManager.notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission notification refusée: ${e.message}")
        }
    } catch (e: Exception) {
        Log.e(TAG, "Erreur notification: ${e.message}")
    }
}

@Composable
fun StaffChatScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>,
    userInfo: JsonObject?
) {
    val context = LocalContext.current
    var messages by remember { mutableStateOf<List<StaffMessage>>(emptyList()) }
    var previousMessageCount by remember { mutableStateOf(0) }
    var newMessage by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isSending by remember { mutableStateOf(false) }
    var selectedRoom by remember { mutableStateOf("global") }
    var showRoomSelector by remember { mutableStateOf(false) }
    var onlineAdmins by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    
    // Créer le canal de notification au premier rendu
    LaunchedEffect(Unit) {
        createNotificationChannel(context)
    }
    
    fun loadMessages() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/staff/chat/messages?room=$selectedRoom")
                    val data = json.parseToJsonElement(response).jsonObject
                    withContext(Dispatchers.Main) {
                        val newMessages = data["messages"]?.jsonArray?.map {
                            val msg = it.jsonObject
                            StaffMessage(
                                id = msg["id"].safeStringOrEmpty(),
                                userId = msg["userId"].safeStringOrEmpty(),
                                username = msg["username"].safeString() ?: "Inconnu",
                                message = msg["message"].safeStringOrEmpty(),
                                timestamp = msg["timestamp"].safeStringOrEmpty(),
                                type = msg["type"].safeString() ?: "text",
                                attachmentUrl = msg["attachmentUrl"].safeString(),
                                attachmentType = msg["attachmentType"].safeString(),
                                room = msg["room"].safeString() ?: "global"
                            )
                        } ?: emptyList()
                        
                        // Vérifier s'il y a de nouveaux messages
                        if (newMessages.size > previousMessageCount && previousMessageCount > 0) {
                            // Nouveau message détecté, envoyer une notification
                            val latestMessage = newMessages.firstOrNull()
                            if (latestMessage != null) {
                                val currentUserId = userInfo?.get("id").safeStringOrEmpty()
                                // Ne pas notifier pour ses propres messages
                                if (latestMessage.userId != currentUserId) {
                                    val senderName = members[latestMessage.userId] ?: latestMessage.username
                                    sendStaffChatNotification(context, senderName, latestMessage.message)
                                }
                            }
                        }
                        
                        previousMessageCount = newMessages.size
                        messages = newMessages
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Load messages error: ${e.message}")
                } finally {
                    withContext(Dispatchers.Main) {
                        isLoading = false
                    }
                }
            }
        }
    }
    
    fun loadOnlineAdmins() {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/staff/online")
                    val data = json.parseToJsonElement(response).jsonObject
                    withContext(Dispatchers.Main) {
                        onlineAdmins = data["admins"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Load admins error: ${e.message}")
                }
            }
        }
    }
    
    fun sendMessage(commandType: String = "text", commandData: String? = null) {
        if (newMessage.isBlank() && commandType == "text") return
        scope.launch {
            isSending = true
            withContext(Dispatchers.IO) {
                try {
                    val userId = userInfo?.get("id").safeString() ?: "unknown"
                    val username = userInfo?.get("username").safeString() ?: "Inconnu"
                    val body = buildJsonObject {
                        put("userId", userId)
                        put("username", username)
                        put("message", if (commandType == "text") newMessage else "[Commande: $commandData]")
                        put("room", selectedRoom)
                        put("commandType", commandType)
                        if (commandData != null) put("commandData", commandData)
                    }
                    api.postJson("/api/staff/chat/send", body.toString())
                    withContext(Dispatchers.Main) {
                        newMessage = ""
                        loadMessages()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Send error: ${e.message}")
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        isSending = false
                    }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadMessages()
        loadOnlineAdmins()
        while (true) {
            kotlinx.coroutines.delay(5000)
            loadMessages()
            loadOnlineAdmins()
        }
    }
    
    LaunchedEffect(selectedRoom) {
        loadMessages()
    }
    
    Column(Modifier.fillMaxSize()) {
        Card(
            Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF5865F2))
        ) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Chat, null, tint = Color.White)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        if (selectedRoom == "global") "💬 Chat Staff (Global)" else "💬 Chat Privé",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text("${messages.size} messages", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.7f))
                }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { showRoomSelector = !showRoomSelector }) {
                    Icon(Icons.Default.People, "Changer de room", tint = Color.White)
                }
                IconButton(onClick = { loadMessages() }) {
                    Icon(Icons.Default.Refresh, "Actualiser", tint = Color.White)
                }
            }
        }
        
        // Sélecteur de room
        if (showRoomSelector) {
            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                Column(Modifier.padding(16.dp)) {
                    Text("📂 Salons de chat", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    
                    // Global room
                    Button(
                        onClick = { selectedRoom = "global"; showRoomSelector = false },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selectedRoom == "global") Color(0xFF5865F2) else Color(0xFF1E1E1E)
                        )
                    ) {
                        Icon(Icons.Default.Public, null, tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Global - Tous les admins")
                    }
                    
                    Spacer(Modifier.height(8.dp))
                    Text("💬 Chats privés", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                    
                    // Liste des admins en ligne
                    onlineAdmins.forEach { admin ->
                        val adminId = admin["userId"].safeStringOrEmpty()
                        val adminName = members[adminId] ?: admin["username"].safeString() ?: "Inconnu"
                        val currentUserId = userInfo?.get("id").safeStringOrEmpty()
                        
                        if (adminId != currentUserId) {
                            val roomId = if (currentUserId < adminId) "user-$currentUserId-$adminId" else "user-$adminId-$currentUserId"
                            
                            Button(
                                onClick = { selectedRoom = roomId; showRoomSelector = false },
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (selectedRoom == roomId) Color(0xFF5865F2) else Color(0xFF1E1E1E)
                                )
                            ) {
                                Icon(Icons.Default.Person, null, tint = Color.White)
                                Spacer(Modifier.width(8.dp))
                                Text(adminName)
                            }
                        }
                    }
                }
            }
        }
        
        LazyColumn(Modifier.weight(1f).padding(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (messages.isEmpty()) {
                item {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                        Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.ChatBubbleOutline, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                            Spacer(Modifier.height(16.dp))
                            Text("Aucun message staff", style = MaterialTheme.typography.titleMedium, color = Color.Gray)
                        }
                    }
                }
            } else {
                items(messages) { msg ->
                    val memberName = members[msg.userId] ?: msg.username
                    val isCurrentUser = userInfo?.get("id").safeString() == msg.userId
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = if (isCurrentUser) Color(0xFF5865F2).copy(alpha = 0.2f) else Color(0xFF2A2A2A))) {
                        Column(Modifier.padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Person, null, tint = if (isCurrentUser) Color(0xFF5865F2) else Color(0xFFED4245), modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(memberName, fontWeight = FontWeight.Bold, color = if (isCurrentUser) Color(0xFF5865F2) else Color.White)
                                }
                                Text(msg.timestamp.take(16).replace("T", " "), style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            }
                            Spacer(Modifier.height(8.dp))
                            
                            // Afficher le contenu selon le type
                            when (msg.type) {
                                "attachment" -> {
                                    when (msg.attachmentType) {
                                        "image" -> {
                                            Text("🖼️ Image: ${msg.message}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("(Prévisualisation non disponible dans cette version)", style = MaterialTheme.typography.bodySmall, color = Color.Gray.copy(alpha = 0.6f))
                                        }
                                        "video" -> {
                                            Text("🎥 Vidéo: ${msg.message}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                        }
                                        else -> {
                                            Text("📎 Fichier: ${msg.message}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                        }
                                    }
                                }
                                "command" -> {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.PlayArrow, null, tint = Color(0xFF57F287), modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(msg.message, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF57F287), fontWeight = FontWeight.Bold)
                                    }
                                }
                                else -> {
                                    Text(msg.message, style = MaterialTheme.typography.bodyMedium, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
            Column(Modifier.padding(12.dp)) {
                // Boutons d'actions rapides
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { 
                            scope.launch {
                                snackbar.showSnackbar("📎 Upload de fichiers pas encore implémenté dans cette version")
                            }
                        },
                        enabled = !isSending,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF57F287))
                    ) {
                        Icon(Icons.Default.AttachFile, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Fichier", fontSize = 12.sp, color = Color.Black)
                    }
                }
                
                Spacer(Modifier.height(8.dp))
                
                // Détection des mentions (@)
                val mentionSuggestions = remember(newMessage, onlineAdmins) {
                    val lastWord = newMessage.split(" ").lastOrNull() ?: ""
                    if (lastWord.startsWith("@") && lastWord.length > 1) {
                        val query = lastWord.substring(1).lowercase()
                        onlineAdmins.filter { admin ->
                            val adminId = admin["userId"].safeStringOrEmpty()
                            val adminName = (members[adminId] ?: admin["username"].safeString() ?: "").lowercase()
                            val currentUserId = userInfo?.get("id").safeStringOrEmpty()
                            adminId != currentUserId && adminName.contains(query)
                        }
                    } else {
                        emptyList()
                    }
                }
                
                // Liste de suggestions de mentions (comme Discord)
                if (mentionSuggestions.isNotEmpty()) {
                    Card(
                        Modifier.fillMaxWidth().heightIn(max = 200.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        LazyColumn {
                            items(mentionSuggestions) { admin ->
                                val adminId = admin["userId"].safeStringOrEmpty()
                                val adminName = members[adminId] ?: admin["username"].safeString() ?: "Inconnu"
                                
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            // Remplacer la mention partielle par la mention complète
                                            val words = newMessage.split(" ").toMutableList()
                                            words[words.lastIndex] = "@$adminName"
                                            newMessage = words.joinToString(" ") + " "
                                        }
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Person, null, tint = Color(0xFF5865F2), modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(adminName, color = Color.White)
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                // Champ de texte
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                    OutlinedTextField(
                        value = newMessage,
                        onValueChange = { newMessage = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Écrivez un message... (@ pour mentionner)") },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.LightGray),
                        maxLines = 4
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = { sendMessage() }, enabled = newMessage.isNotBlank() && !isSending) {
                        if (isSending) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                        } else {
                            Icon(Icons.Default.Send, "Envoyer", tint = if (newMessage.isNotBlank()) Color(0xFF5865F2) else Color.Gray)
                        }
                    }
                }
            }
        }
    }
}

// Amélioration StaffChatScreen v2.1.7 - Admin uniquement

// Remplacer le StaffMainScreen existant par celui-ci:

@Composable
fun StaffMainScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>,
    userInfo: JsonObject?,
    isFounder: Boolean,
    isAdmin: Boolean  // Vérification admin pour chat
) {
    var selectedStaffTab by remember { mutableStateOf(0) }
    
    // Vérifier si l'utilisateur est admin (pas juste founder)
    if (!isAdmin && !isFounder) {
        // Afficher message si pas admin
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                Icon(
                    Icons.Default.Lock,
                    null,
                    modifier = Modifier.size(64.dp),
                    tint = Color(0xFFED4245)
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    "🔒 Accès Restreint",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Le chat staff est réservé aux administrateurs.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Contactez un admin pour obtenir l'accès.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }
    
    // Si admin simple (non-fondateur): afficher UNIQUEMENT le Chat Staff
    if (isAdmin && !isFounder) {
        Column(Modifier.fillMaxSize()) {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF5865F2))
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Chat, null, tint = Color.White, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "💬 Chat Staff",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
            StaffChatScreen(api, json, scope, snackbar, members, userInfo)
        }
    } else if (isFounder) {
        // Si fondateur: afficher tous les onglets
        Column(Modifier.fillMaxSize()) {
            TabRow(selectedTabIndex = selectedStaffTab, containerColor = Color(0xFF1E1E1E)) {
                Tab(selected = selectedStaffTab == 0, onClick = { selectedStaffTab = 0 }, text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Chat, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Chat Staff")
                    }
                })
                Tab(selected = selectedStaffTab == 1, onClick = { selectedStaffTab = 1 }, text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AdminPanelSettings, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Admin")
                    }
                })
                Tab(selected = selectedStaffTab == 2, onClick = { selectedStaffTab = 2 }, text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Description, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Logs")
                    }
                })
            }
            when (selectedStaffTab) {
                0 -> StaffChatScreen(api, json, scope, snackbar, members, userInfo)
                1 -> AdminScreenWithAccess(members, api, json, scope, snackbar)
                2 -> LogsScreen(api, json, scope, snackbar)
            }
        }
    }
}




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
    var isAdmin by remember { mutableStateOf(false) }
    var isAuthorized by remember { mutableStateOf(false) }
    
    // Créer userInfo JsonObject pour StaffChat
    val userInfo = remember(userId, userName) {
        if (userId.isNotEmpty()) {
            buildJsonObject {
                put("id", userId)
                put("username", userName)
            }
        } else null
    }
    
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

    // Vérifier si une migration d'URL a eu lieu
    LaunchedEffect(Unit) {
        if (store.wasUrlMigrated()) {
            snackbar.showSnackbar("🔄 URL mise à jour vers le port 33003 - Veuillez vous reconnecter")
            store.clearMigrationFlag()
            // Forcer la déconnexion si encore connecté
            if (!token.isNullOrBlank()) {
                token = null
                store.clearToken()
            }
        }
    }

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
                    Log.d(TAG, "Response /api/me: ${meJson.take(200)}")
                    val me = json.parseToJsonElement(meJson).jsonObject
                    withContext(Dispatchers.Main) {
                        userId = me["userId"]?.jsonPrimitive?.contentOrNull ?: ""
                        userName = me["username"]?.jsonPrimitive?.contentOrNull ?: ""
                        // Utiliser isFounder et isAdmin du backend (qui vérifie les permissions Discord)
                        isFounder = me["isFounder"]?.jsonPrimitive?.booleanOrNull ?: false
                        isAdmin = me["isAdmin"]?.jsonPrimitive?.booleanOrNull ?: false
                    }
                    Log.d(TAG, "User loaded: $userName ($userId) - Founder: $isFounder, Admin: $isAdmin")
                } catch (e: Exception) {
                    Log.e(TAG, "Error /api/me: ${e.message}")
                    withContext(Dispatchers.Main) {
                        // Si erreur 401, on force la déconnexion
                        if (e.message?.contains("401") == true || e.message?.contains("No token") == true) {
                            token = null
                            userName = ""
                            userId = ""
                            isFounder = false
                            members = emptyMap()
                            channels = emptyMap()
                            roles = emptyMap()
                            configData = null
                            snackbar.showSnackbar("⚠️ Session expirée - Reconnectez-vous")
                        } else {
                            errorMessage = "Erreur authentification: ${e.message}"
                        }
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
                        // L'API retourne { "members": {...}, "roles": {...} }
                        membersData["members"]?.jsonObject?.let { membersObj ->
                            members = membersObj.mapValues { it.value.safeStringOrEmpty() }
                        }
                        
                        membersData["roles"]?.jsonObject?.let { rolesObj ->
                            memberRoles = rolesObj.mapValues { (_, v) ->
                                v.jsonArray.safeStringList()
                            }
                        }
                    }
                    Log.d(TAG, "Loaded ${members.size} members with ${memberRoles.size} role mappings")
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
                        channels = channelsObj.mapValues { it.value.safeStringOrEmpty() }
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
                        roles = rolesObj.mapValues { it.value.safeStringOrEmpty() }
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
                
                // 7. Vérification des droits admin via /api/me
                withContext(Dispatchers.Main) {
                    // On utilise directement les infos de /api/me qui vérifie les permissions Discord
                    Log.d(TAG, "User $userName - isFounder: $isFounder, isAdmin: $isAdmin (from /api/me)")
                    
                    if (isAdmin) {
                        Log.d(TAG, "✅ User has admin access (Administrator permission)")
                    } else {
                        Log.d(TAG, "⚠️ User does NOT have admin access")
                    }
                }
                
                // 8. Vérification autorisation d'accès
                loadingMessage = "Vérification des accès..."
                Log.d(TAG, "Checking /api/admin/allowed-users")
                try {
                    val allowedJson = api.getJson("/api/admin/allowed-users")
                    val allowedData = json.parseToJsonElement(allowedJson).jsonObject
                    val allowedUsers = allowedData["allowedUsers"]?.jsonArray.safeStringList()
                    
                    withContext(Dispatchers.Main) {
                        isAuthorized = userId in allowedUsers || isFounder
                        Log.d(TAG, "User authorized: $isAuthorized")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error checking authorization: ${e.message}")
                    withContext(Dispatchers.Main) {
                        // Si erreur, autoriser le fondateur par défaut
                        isAuthorized = isFounder
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
                            // Accès Admin : Fondateur OU Admin (avec rôle staff)
                            if (isFounder || isAdmin) {
                                NavigationBarItem(
                                    selected = tab == 3,
                                    onClick = { tab = 3 },
                                    icon = { Icon(Icons.Default.Security, "Admin") },
                                    label = { Text("Admin") }
                                )
                            }
                            NavigationBarItem(
                                selected = tab == 4,
                                onClick = { tab = 4 },
                                icon = { Icon(Icons.Default.MusicNote, "Musique") },
                                label = { Text("Musique") }
                            )
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
                            Column(Modifier.fillMaxSize()) {
                                BotControlScreen(
                                    api = api,
                                    json = json,
                                    scope = scope,
                                    snackbar = snackbar,
                                    botOnline = botOnline,
                                    botStats = botStats,
                                    members = members,
                                    channels = channels,
                                    roles = roles,
                                    isFounder = isFounder,
                                    isAdmin = isAdmin
                                )
                            }
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
                            ConfigDashboardScreen(
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
                        tab == 4 -> {
                            MusicScreen(
                                api = api,
                                json = json,
                                scope = scope,
                                snackbar = snackbar,
                                baseUrl = baseUrl
                            )
                        }
                        // Accès Admin : Fondateur OU Admin (avec rôle staff)
                        tab == 3 && (isFounder || isAdmin) -> {
                            StaffMainScreen(
                                api = api,
                                json = json,
                                scope = scope,
                                snackbar = snackbar,
                                members = members,
                                userInfo = userInfo,
                                isFounder = isFounder,
                                isAdmin = isAdmin
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
    // Hardcoder l'URL de l'API bot (33003)
    val defaultUrl = "http://88.174.155.230:33003"
    LaunchedEffect(Unit) {
        if (baseUrl.isEmpty()) {
            onBaseUrlChange(defaultUrl)
        }
    }
    
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

// BotControlScreen - Affichage du statut uniquement
@Composable
fun BotControlScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    botOnline: Boolean,
    botStats: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    isFounder: Boolean,
    isAdmin: Boolean = false
) {
    // Charger les membres connectés
    var connectedUsers by remember { mutableStateOf<List<Triple<String, String, String>>>(emptyList()) } // userId, username, role
    var isLoadingConnected by remember { mutableStateOf(false) }
    var staffRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    val founderId = "943487722738311219"
    
    fun loadConnectedUsers() {
        scope.launch {
            isLoadingConnected = true
            withContext(Dispatchers.IO) {
                try {
                    // Charger d'abord la config pour les rôles staff
                    try {
                        val configResp = api.getJson("/api/configs")
                        val config = json.parseToJsonElement(configResp).jsonObject
                        val staffRoles = config["staffRoleIds"]?.jsonArray.safeStringList()
                        staffRoleIds = staffRoles
                    } catch (e: Exception) {
                        Log.e("BotControl", "Erreur chargement staffRoleIds: ${e.message}")
                    }
                    
                    // Charger les sessions
                    val resp = api.getJson("/api/admin/sessions")
                    Log.d("BotControl", "Sessions response: ${resp.take(300)}")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val sessionsArray = obj["sessions"]?.jsonArray
                    Log.d("BotControl", "Sessions count: ${sessionsArray?.size ?: 0}")
                    
                    val sessions = sessionsArray?.mapNotNull {
                        val session = it.jsonObject
                        val userId = session["userId"]?.jsonPrimitive?.contentOrNull
                        val username = session["username"]?.jsonPrimitive?.contentOrNull ?: members[userId] ?: "Inconnu"
                        
                        // Calculer le rôle côté client
                        val userRoles = session["roles"]?.jsonArray.safeStringList()
                        
                        Log.d("BotControl", "User $username ($userId) has ${userRoles.size} roles, staffRoles: ${staffRoleIds.size}")
                        
                        val role = when {
                            userId == founderId -> "👑 Fondateur"
                            userRoles.any { it in staffRoleIds } -> "⚡ Admin"
                            else -> "👤 Membre"
                        }
                        
                        Log.d("BotControl", "User $username assigned role: $role")
                        
                        if (userId != null) Triple(userId, username, role) else null
                    } ?: emptyList()
                    
                    Log.d("BotControl", "Final sessions list: ${sessions.size} members")
                    
                    withContext(Dispatchers.Main) {
                        connectedUsers = sessions
                    }
                } catch (e: Exception) {
                    Log.e("BotControl", "Erreur chargement sessions: ${e.message}")
                    withContext(Dispatchers.Main) {
                        connectedUsers = emptyList()
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoadingConnected = false }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadConnectedUsers()
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
        
        // Membres connectés
        item {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.People,
                                null,
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "👥 Membres Connectés",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        IconButton(onClick = { loadConnectedUsers() }) {
                            Icon(
                                Icons.Default.Refresh,
                                "Rafraîchir",
                                tint = Color(0xFF9C27B0)
                            )
                        }
                    }
                    
                    Spacer(Modifier.height(16.dp))
                    
                    if (isLoadingConnected) {
                        Box(
                            Modifier.fillMaxWidth().height(100.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Color(0xFF9C27B0))
                        }
                    } else if (connectedUsers.isEmpty()) {
                        Text(
                            "Aucun membre connecté",
                            color = Color.Gray,
                            modifier = Modifier.padding(vertical = 16.dp)
                        )
                    } else {
                        connectedUsers.forEach { (userId, username, role) ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    when {
                                        role.contains("Fondateur") -> Icons.Default.Star
                                        role.contains("Admin") -> Icons.Default.AdminPanelSettings
                                        else -> Icons.Default.AccountCircle
                                    },
                                    null,
                                    tint = when {
                                        role.contains("Fondateur") -> Color(0xFFFFD700)
                                        role.contains("Admin") -> Color(0xFFFF1744)
                                        else -> Color(0xFF4CAF50)
                                    },
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(
                                        username,
                                        color = Color.White,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        role,
                                        color = when {
                                            role.contains("Fondateur") -> Color(0xFFFFD700)
                                            role.contains("Admin") -> Color(0xFFFF1744)
                                            else -> Color.Gray
                                        },
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                }
                            }
                            if (connectedUsers.last() != Triple(userId, username, role)) {
                                Divider(color = Color(0xFF2E2E2E), modifier = Modifier.padding(vertical = 4.dp))
                            }
                        }
                    }
                }
            }
        }
        
        if (isFounder) {
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2196F3))
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Icon(
                            Icons.Default.Info,
                            null,
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "ℹ️ Logs et Redémarrage",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Les logs et options de redémarrage PM2 sont disponibles dans la section Admin > onglet Logs",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFBBDEFB)
                        )
                    }
                }
            }
        }
    }
}

// LogsScreen - Affichage des logs Bot et Dashboard
@Composable
fun LogsScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var selectedService by remember { mutableStateOf(0) } // 0=bot, 1=dashboard
    var botLogs by remember { mutableStateOf("") }
    var dashboardLogs by remember { mutableStateOf("") }
    var isLoadingLogs by remember { mutableStateOf(false) }
    var isRestarting by remember { mutableStateOf(false) }
    
    fun loadLogs(service: String) {
        scope.launch {
            isLoadingLogs = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/admin/logs/$service")
                    val data = json.parseToJsonElement(response).jsonObject
                    val logs = data["logs"]?.jsonPrimitive?.contentOrNull ?: "Aucun log disponible"
                    
                    withContext(Dispatchers.Main) {
                        if (service == "bot") {
                            botLogs = logs
                        } else {
                            dashboardLogs = logs
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur logs: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        isLoadingLogs = false
                    }
                }
            }
        }
    }
    
    fun restartService(service: String) {
        scope.launch {
            isRestarting = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.postJson("/api/admin/restart/$service", "{}")
                    val data = json.parseToJsonElement(response).jsonObject
                    val success = data["success"]?.jsonPrimitive?.booleanOrNull ?: false
                    
                    withContext(Dispatchers.Main) {
                        if (success) {
                            snackbar.showSnackbar("✅ Service $service redémarré")
                            // Recharger les logs après redémarrage
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                loadLogs(service)
                            }, 3000)
                        } else {
                            snackbar.showSnackbar("❌ Échec du redémarrage")
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        isRestarting = false
                    }
                }
            }
        }
    }
    
    Column(Modifier.fillMaxSize()) {
        // Tabs pour sélectionner Bot ou Dashboard
        TabRow(
            selectedTabIndex = selectedService,
            containerColor = Color(0xFF2196F3)
        ) {
            Tab(
                selected = selectedService == 0,
                onClick = { 
                    selectedService = 0
                    if (botLogs.isEmpty()) loadLogs("bot")
                },
                text = { Text("🤖 Bot", color = Color.White) }
            )
            Tab(
                selected = selectedService == 1,
                onClick = { 
                    selectedService = 1
                    if (dashboardLogs.isEmpty()) loadLogs("dashboard")
                },
                text = { Text("📊 Dashboard", color = Color.White) }
            )
        }
        
        if (isLoadingLogs) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF2196F3))
            }
        } else {
            val currentService = if (selectedService == 0) "bot" else "dashboard"
            val logsToShow = if (selectedService == 0) botLogs else dashboardLogs
            
            LazyColumn(
                Modifier.fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Card des logs
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "📝 Logs Récents (100 lignes)",
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                IconButton(
                                    onClick = { loadLogs(currentService) }
                                ) {
                                    Icon(Icons.Default.Refresh, "Recharger", tint = Color(0xFF2196F3))
                                }
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Text(
                                logsToShow.ifBlank { "Aucun log disponible\nCliquez sur Rafraîchir pour charger" },
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                ),
                                color = Color.LightGray,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
                
                // Card de redémarrage
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text(
                                "🔄 Redémarrer le service",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Redémarre le processus PM2 sur la Freebox",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                            Spacer(Modifier.height(16.dp))
                            
                            Button(
                                onClick = { restartService(currentService) },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (selectedService == 0) Color(0xFF4CAF50) else Color(0xFF2196F3)
                                ),
                                enabled = !isRestarting
                            ) {
                                if (isRestarting) {
                                    CircularProgressIndicator(
                                        color = Color.White,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text("Redémarrage...")
                                } else {
                                    Icon(Icons.Default.RestartAlt, null)
                                    Spacer(Modifier.width(8.dp))
                                    Text("🔄 Redémarrer ${if (selectedService == 0) "le Bot" else "le Dashboard"}")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// MusicScreen - Gestion de la musique
@Composable
fun MusicScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    baseUrl: String
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) }
    var uploads by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var currentlyPlaying by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }
    val mediaPlayer = remember { MediaPlayer() }
    
    fun loadUploads() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/music/uploads")
                    val data = json.parseToJsonElement(response).jsonObject
                    val files = data["files"]?.jsonArray.safeStringList()
                    withContext(Dispatchers.Main) {
                        uploads = files
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
    
    // File picker pour upload
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                isUploading = true
                withContext(Dispatchers.IO) {
                    try {
                        val uploaded = uploadAudioFile(context, api, uri)
                        withContext(Dispatchers.Main) {
                            if (uploaded) {
                                snackbar.showSnackbar("✅ Fichier uploadé !")
                                loadUploads()
                            } else {
                                snackbar.showSnackbar("❌ Échec upload")
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("MusicUpload", "Error uploading", e)
                        withContext(Dispatchers.Main) {
                            snackbar.showSnackbar("❌ Erreur: ${e.message}")
                        }
                    } finally {
                        withContext(Dispatchers.Main) { isUploading = false }
                    }
                }
            }
        }
    }
    
    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer.release()
        }
    }
    
    fun playAudio(filename: String, baseUrl: String) {
        scope.launch {
            try {
                if (currentlyPlaying == filename) {
                    // Stop si déjà en lecture
                    withContext(Dispatchers.Main) {
                        if (mediaPlayer.isPlaying) {
                            mediaPlayer.stop()
                        }
                        mediaPlayer.reset()
                        currentlyPlaying = null
                        snackbar.showSnackbar("⏹ Arrêté")
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        if (mediaPlayer.isPlaying) {
                            mediaPlayer.stop()
                        }
                        mediaPlayer.reset()
                        snackbar.showSnackbar("⏳ Téléchargement...")
                    }
                    
                    // Télécharger le fichier en cache au lieu de streamer directement
                    val url = "$baseUrl/api/music/stream/${java.net.URLEncoder.encode(filename, "UTF-8")}"
                    android.util.Log.d("MusicPlayer", "Downloading: $url")
                    
                    withContext(Dispatchers.IO) {
                        try {
                            val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                            connection.requestMethod = "GET"
                            connection.connectTimeout = 10000
                            connection.readTimeout = 30000
                            connection.connect()
                            
                            if (connection.responseCode == 200) {
                                // Créer fichier temporaire dans le cache externe (Android 10+ compatible)
                                val cacheDir = context.externalCacheDir ?: context.cacheDir
                                val tempFile = java.io.File.createTempFile("music_", ".mp3", cacheDir)
                                tempFile.deleteOnExit()
                                
                                android.util.Log.d("MusicPlayer", "Downloading to: ${tempFile.absolutePath}")
                                
                                // Télécharger
                                connection.inputStream.use { input ->
                                    tempFile.outputStream().use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                
                                android.util.Log.d("MusicPlayer", "Downloaded successfully: ${tempFile.length()} bytes")
                                
                                withContext(Dispatchers.Main) {
                                    snackbar.showSnackbar("⏳ Préparation...")
                                    
                                    try {
                                        mediaPlayer.setDataSource(tempFile.absolutePath)
                                        
                                        mediaPlayer.setOnPreparedListener {
                                            android.util.Log.d("MusicPlayer", "Media prepared, starting")
                                            it.start()
                                            currentlyPlaying = filename
                                            scope.launch {
                                                snackbar.showSnackbar("▶ Lecture: ${filename.take(25)}...")
                                            }
                                        }
                                        
                                        mediaPlayer.setOnErrorListener { mp, what, extra ->
                                            android.util.Log.e("MusicPlayer", "Error: what=$what, extra=$extra")
                                            scope.launch {
                                                snackbar.showSnackbar("❌ Erreur: code $what/$extra")
                                            }
                                            currentlyPlaying = null
                                            tempFile.delete()
                                            true
                                        }
                                        
                                        mediaPlayer.setOnCompletionListener {
                                            android.util.Log.d("MusicPlayer", "Playback completed")
                                            currentlyPlaying = null
                                            tempFile.delete()
                                        }
                                        
                                        mediaPlayer.prepareAsync()
                                        
                                    } catch (e: Exception) {
                                        android.util.Log.e("MusicPlayer", "Error setting data source", e)
                                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                        currentlyPlaying = null
                                        tempFile.delete()
                                    }
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    snackbar.showSnackbar("❌ HTTP ${connection.responseCode}")
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("MusicPlayer", "Download failed", e)
                            withContext(Dispatchers.Main) {
                                snackbar.showSnackbar("❌ Téléchargement: ${e.message}")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MusicPlayer", "Error in playAudio", e)
                withContext(Dispatchers.Main) {
                    snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    currentlyPlaying = null
                }
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadUploads()
    }
    
    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("🎵 Uploads") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("📋 Playlists") }
            )
        }
        
        when (selectedTab) {
            0 -> {
                // Onglet Uploads
                if (isLoading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF9C27B0))
                    }
                } else {
                    LazyColumn(
                        Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF9C27B0))
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                "🎵 Musiques Uploadées",
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Text(
                                                "${uploads.size} fichier(s)",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = Color(0xFFE1BEE7)
                                            )
                                        }
                                        Icon(
                                            Icons.Default.MusicNote,
                                            null,
                                            tint = Color.White,
                                            modifier = Modifier.size(48.dp)
                                        )
                                    }
                                    
                                    Spacer(Modifier.height(12.dp))
                                    Divider(color = Color.White.copy(alpha = 0.3f))
                                    Spacer(Modifier.height(12.dp))
                                    
                                    Button(
                                        onClick = {
                                            if (!isUploading) {
                                                filePickerLauncher.launch("audio/*")
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().height(48.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                                        enabled = !isUploading
                                    ) {
                                        if (isUploading) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(24.dp),
                                                color = Color(0xFF9C27B0)
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Text("Upload en cours...", color = Color.Black)
                                        } else {
                                            Icon(Icons.Default.Upload, null, tint = Color(0xFF9C27B0))
                                            Spacer(Modifier.width(8.dp))
                                            Text("📁 Importer un fichier audio", color = Color.Black, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (uploads.isEmpty()) {
                            item {
                                Card(
                                    Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                                ) {
                                    Column(
                                        Modifier.padding(32.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(
                                            Icons.Default.MusicNote,
                                            null,
                                            modifier = Modifier.size(64.dp),
                                            tint = Color.Gray
                                        )
                                        Spacer(Modifier.height(16.dp))
                                        Text(
                                            "Aucune musique",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Color.White
                                        )
                                        Text(
                                            "Uploadez des fichiers audio depuis le dashboard web",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        } else {
                            uploads.forEach { filename ->
                                item {
                                    Card(
                                        Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                                    ) {
                                        Row(
                                            Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Icon(
                                                    Icons.Default.AudioFile,
                                                    null,
                                                    tint = Color(0xFF9C27B0),
                                                    modifier = Modifier.size(24.dp)
                                                )
                                                Spacer(Modifier.width(12.dp))
                                                Text(
                                                    filename,
                                                    color = Color.White,
                                                    style = MaterialTheme.typography.bodyMedium
                                                )
                                            }
                                            IconButton(onClick = { playAudio(filename, baseUrl) }) {
                                                Icon(
                                                    if (currentlyPlaying == filename) Icons.Default.Stop else Icons.Default.PlayArrow,
                                                    null,
                                                    tint = if (currentlyPlaying == filename) Color.Red else Color(0xFF9C27B0),
                                                    modifier = Modifier.size(28.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        item {
                            Button(
                                onClick = { loadUploads() },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0))
                            ) {
                                Icon(Icons.Default.Refresh, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Rafraîchir")
                            }
                        }
                    }
                }
            }
            1 -> {
                // Onglet Playlists
                PlaylistsTab(api, json, scope, snackbar, uploads)
            }
        }
    }
}

// Fonction pour uploader un fichier audio
suspend fun uploadAudioFile(context: Context, api: ApiClient, uri: Uri): Boolean {
    return withContext(Dispatchers.IO) {
        try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(uri) ?: return@withContext false
            
            // Lire le nom du fichier
            val cursor = contentResolver.query(uri, null, null, null, null)
            val fileName = cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) it.getString(nameIndex) else "audio.mp3"
                } else "audio.mp3"
            } ?: "audio.mp3"
            
            android.util.Log.d("MusicUpload", "Uploading file: $fileName")
            
            // Lire les bytes
            val bytes = inputStream.readBytes()
            inputStream.close()
            
            android.util.Log.d("MusicUpload", "File size: ${bytes.size} bytes")
            
            // Envoyer via multipart
            val response = api.uploadFile("/api/music/upload", fileName, bytes, "audio")
            android.util.Log.d("MusicUpload", "Upload response: $response")
            
            true
        } catch (e: Exception) {
            android.util.Log.e("MusicUpload", "Upload failed", e)
            false
        }
    }
}

@Composable
fun PlaylistsTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    availableSongs: List<String>
) {
    var playlists by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var newPlaylistName by remember { mutableStateOf("") }
    var selectedPlaylistForAdd by remember { mutableStateOf<String?>(null) }
    var showAddSongDialog by remember { mutableStateOf(false) }
    var selectedSong by remember { mutableStateOf<String?>(null) }
    var expandedPlaylist by remember { mutableStateOf<String?>(null) }
    
    fun loadPlaylists() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    android.util.Log.d("Playlists", "Loading playlists...")
                    val response = api.getJson("/api/music/playlists")
                    android.util.Log.d("Playlists", "Response: ${response.take(200)}")
                    val data = json.parseToJsonElement(response).jsonObject
                    val plist = data["playlists"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    android.util.Log.d("Playlists", "Parsed ${plist.size} playlists")
                    withContext(Dispatchers.Main) {
                        playlists = plist
                    }
                } catch (e: Exception) {
                    android.util.Log.e("Playlists", "Error loading playlists", e)
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur playlists: ${e.message}")
                    }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadPlaylists()
    }
    
    if (showCreateDialog) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Nouvelle Playlist") },
            text = {
                OutlinedTextField(
                    value = newPlaylistName,
                    onValueChange = { newPlaylistName = it },
                    label = { Text("Nom de la playlist") },
                    singleLine = true
                )
            },
            confirmButton = {
                Button(onClick = {
                    if (newPlaylistName.isNotBlank()) {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject { put("name", newPlaylistName) }
                                    api.postJson("/api/music/playlists", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) {
                                        snackbar.showSnackbar("✅ Playlist créée")
                                        newPlaylistName = ""
                                        showCreateDialog = false
                                        loadPlaylists()
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        snackbar.showSnackbar("❌ ${e.message}")
                                    }
                                }
                            }
                        }
                    }
                }) {
                    Text("Créer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
    
    // Dialog ajouter une chanson
    if (showAddSongDialog && selectedPlaylistForAdd != null) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { 
                showAddSongDialog = false
                selectedSong = null
            },
            title = { Text("Ajouter une chanson") },
            text = {
                Column {
                    Text("Sélectionnez une chanson à ajouter à la playlist")
                    Spacer(Modifier.height(16.dp))
                    
                    if (availableSongs.isEmpty()) {
                        Text("Aucune musique disponible", color = Color.Gray)
                    } else {
                        LazyColumn(Modifier.heightIn(max = 300.dp)) {
                            items(availableSongs.size) { index ->
                                val song = availableSongs[index]
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedSong = song }
                                        .background(if (selectedSong == song) Color(0xFF9C27B0).copy(alpha = 0.3f) else Color.Transparent)
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.MusicNote,
                                        null,
                                        tint = if (selectedSong == song) Color(0xFF9C27B0) else Color.Gray,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        song,
                                        color = if (selectedSong == song) Color.White else Color.Gray,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                if (index < availableSongs.size - 1) {
                                    Divider(color = Color(0xFF2E2E2E))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        selectedSong?.let { song ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    try {
                                        val body = buildJsonObject {
                                            put("filename", song)
                                            put("title", song)
                                        }
                                        api.postJson(
                                            "/api/music/playlists/$selectedPlaylistForAdd/songs",
                                            json.encodeToString(JsonObject.serializer(), body)
                                        )
                                        withContext(Dispatchers.Main) {
                                            snackbar.showSnackbar("✅ Chanson ajoutée")
                                            showAddSongDialog = false
                                            selectedSong = null
                                            loadPlaylists()
                                        }
                                    } catch (e: Exception) {
                                        withContext(Dispatchers.Main) {
                                            snackbar.showSnackbar("❌ ${e.message}")
                                        }
                                    }
                                }
                            }
                        }
                    },
                    enabled = selectedSong != null
                ) {
                    Text("Ajouter")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showAddSongDialog = false
                    selectedSong = null
                }) {
                    Text("Annuler")
                }
            }
        )
    }
    
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Button(
                onClick = { showCreateDialog = true },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0))
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(Modifier.width(8.dp))
                Text("Nouvelle Playlist")
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF9C27B0))
                }
            }
        } else if (playlists.isEmpty()) {
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                ) {
                    Column(
                        Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.PlaylistPlay,
                            null,
                            modifier = Modifier.size(64.dp),
                            tint = Color.Gray
                        )
                        Spacer(Modifier.height(16.dp))
                        Text(
                            "Aucune playlist",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.White
                        )
                        Text(
                            "Créez votre première playlist",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }
            }
        } else {
            playlists.forEach { playlist ->
                item {
                    val playlistId = playlist["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val playlistName = playlist["name"]?.jsonPrimitive?.contentOrNull ?: "Sans nom"
                    
                    // Support both old format (array of strings) and new format (array of objects)
                    val songsArray = playlist["songs"]?.jsonArray ?: emptyList()
                    val songs = songsArray.mapNotNull { element ->
                        when {
                            element is kotlinx.serialization.json.JsonPrimitive -> element.contentOrNull
                            element is kotlinx.serialization.json.JsonObject -> {
                                element["filename"]?.jsonPrimitive?.contentOrNull 
                                    ?: element["title"]?.jsonPrimitive?.contentOrNull
                            }
                            else -> null
                        }
                    }
                    
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Column(Modifier.fillMaxWidth()) {
                                // Header de la playlist
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Icon(
                                            Icons.Default.PlaylistPlay,
                                            null,
                                            tint = Color(0xFF9C27B0),
                                            modifier = Modifier.size(32.dp)
                                        )
                                        Spacer(Modifier.width(12.dp))
                                        Column {
                                            Text(
                                                playlistName,
                                                color = Color.White,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                "${songs.size} chanson(s)",
                                                color = Color.Gray,
                                                style = MaterialTheme.typography.bodySmall
                                            )
                                        }
                                    }
                                    Row {
                                        IconButton(onClick = { 
                                            expandedPlaylist = if (expandedPlaylist == playlistId) null else playlistId
                                        }) {
                                            Icon(
                                                if (expandedPlaylist == playlistId) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                                null,
                                                tint = Color(0xFF9C27B0)
                                            )
                                        }
                                        IconButton(onClick = {
                                            selectedPlaylistForAdd = playlistId
                                            showAddSongDialog = true
                                        }) {
                                            Icon(Icons.Default.Add, null, tint = Color(0xFF4CAF50))
                                        }
                                        IconButton(onClick = {
                                            scope.launch {
                                                withContext(Dispatchers.IO) {
                                                    try {
                                                        api.deleteJson("/api/music/playlists/$playlistId")
                                                        withContext(Dispatchers.Main) {
                                                            snackbar.showSnackbar("✅ Playlist supprimée")
                                                            loadPlaylists()
                                                        }
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) {
                                                            snackbar.showSnackbar("❌ ${e.message}")
                                                        }
                                                    }
                                                }
                                            }
                                        }) {
                                            Icon(Icons.Default.Delete, null, tint = Color.Red)
                                        }
                                    }
                                }
                                
                                // Liste des chansons (si expanded)
                                if (expandedPlaylist == playlistId && songs.isNotEmpty()) {
                                    Spacer(Modifier.height(12.dp))
                                    Divider(color = Color(0xFF2E2E2E))
                                    Spacer(Modifier.height(8.dp))
                                    
                                    songs.forEachIndexed { index, song ->
                                        Row(
                                            Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                Icon(
                                                    Icons.Default.MusicNote,
                                                    null,
                                                    tint = Color.Gray,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(Modifier.width(8.dp))
                                                Text(
                                                    song,
                                                    color = Color.White,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    maxLines = 1
                                                )
                                            }
                                            IconButton(
                                                onClick = {
                                                    scope.launch {
                                                        withContext(Dispatchers.IO) {
                                                            try {
                                                                // Get song ID from playlist songs array
                                                                val songObj = songsArray[index].jsonObject
                                                                val songId = songObj["id"]?.jsonPrimitive?.contentOrNull ?: index.toString()
                                                                api.deleteJson("/api/music/playlists/$playlistId/songs/$songId")
                                                                withContext(Dispatchers.Main) {
                                                                    snackbar.showSnackbar("✅ Chanson retirée")
                                                                    loadPlaylists()
                                                                }
                                                            } catch (e: Exception) {
                                                                withContext(Dispatchers.Main) {
                                                                    snackbar.showSnackbar("❌ ${e.message}")
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                modifier = Modifier.size(32.dp)
                                            ) {
                                                Icon(Icons.Default.Remove, null, tint = Color(0xFFFF5722), modifier = Modifier.size(16.dp))
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
    isAdmin: Boolean = false,
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
                        } else if (isAdmin) {
                            Text("⚡ Administrateur", color = Color(0xFFFF1744))
                            Text("Accès au chat staff et admin", color = Color.Gray)
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
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("URL Dashboard: ", color = Color.Gray)
                        Text(
                            baseUrl,
                            color = if (baseUrl.contains(":33002")) Color(0xFFFF9800) else Color.White,
                            fontWeight = if (baseUrl.contains(":33002")) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                    
                    // Avertissement si URL obsolète
                    if (baseUrl.contains(":33002")) {
                        Spacer(Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFF9800).copy(alpha = 0.2f), shape = MaterialTheme.shapes.small)
                                .padding(12.dp)
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                null,
                                tint = Color(0xFFFF9800),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "⚠️ URL obsolète (port 33002). Utilisez le bouton ci-dessous pour corriger.",
                                color = Color(0xFFFF9800),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                    
                    Spacer(Modifier.height(8.dp))
                    Text("Version: 5.9.13", color = Color.Gray)
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
                    
                    // Bouton pour réinitialiser l'URL
                    Button(
                        onClick = {
                            scope.launch {
                                store.resetToDefaults()
                                snackbar.showSnackbar("✅ URL réinitialisée vers http://88.174.155.230:33003")
                                onDisconnect()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (baseUrl.contains(":33002")) Color(0xFFFF9800) else Color(0xFF2196F3)
                        )
                    ) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (baseUrl.contains(":33002")) "🔄 Corriger l'URL (33003)" else "🔄 Réinitialiser l'URL"
                        )
                    }
                    
                    Spacer(Modifier.height(12.dp))
                    
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

// ============================================
// AFFICHAGE DES VRAIS NOMS (v2.1.5)
// ============================================

@Composable
fun renderKeyInfo(
    sectionKey: String,
    sectionData: JsonElement,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>
) {
    val keyInfos = mutableListOf<Pair<String, String>>()
    
    try {
        when (sectionKey) {
            "tickets" -> {
                val obj = sectionData.jsonObject
                obj["categoryId"]?.jsonPrimitive?.contentOrNull?.let { id ->
                    keyInfos.add("📁 Catégorie" to "${channels[id] ?: "Inconnu"} ($id)")
                }
                obj["panelChannelId"]?.jsonPrimitive?.contentOrNull?.let { id ->
                    keyInfos.add("📋 Canal panel" to "${channels[id] ?: "Inconnu"} ($id)")
                }
                obj["staffPingRoleIds"]?.jsonArray?.let { arr ->
                    val roleNames = arr.safeStringList().map { id ->
                        roles[id] ?: id
                    }.joinToString(", ")
                    keyInfos.add("👮 Rôles staff ping" to roleNames)
                }
            }
            "welcome", "goodbye" -> {
                val obj = sectionData.jsonObject
                obj["channelId"]?.jsonPrimitive?.contentOrNull?.let { id ->
                    keyInfos.add("📢 Canal" to "${channels[id] ?: "Inconnu"} ($id)")
                }
                obj["message"]?.jsonPrimitive?.contentOrNull?.let { msg ->
                    keyInfos.add("💬 Message" to msg.take(100) + if (msg.length > 100) "..." else "")
                }
            }
            "logs" -> {
                val obj = sectionData.jsonObject
                obj["channels"]?.jsonObject?.forEach { (logType, channelIdEl) ->
                    val channelId = channelIdEl.safeString()
                    if (channelId != null) {
                        keyInfos.add("📝 $logType" to "${channels[channelId] ?: "Inconnu"} ($channelId)")
                    }
                }
            }
            "staffRoleIds" -> {
                val arr = sectionData.jsonArray
                val roleNames = arr.safeStringList().map { id ->
                    "${roles[id] ?: "Inconnu"} ($id)"
                }
                roleNames.forEach { name ->
                    keyInfos.add("👮 Rôle staff" to name)
                }
            }
            "quarantineRoleId" -> {
                val roleId = sectionData.safeString()
                if (roleId != null) {
                    keyInfos.add("🔒 Rôle quarantaine" to "${roles[roleId] ?: "Inconnu"} ($roleId)")
                }
            }
            "inactivity" -> {
                val obj = sectionData.jsonObject
                obj["kickAfterDays"]?.jsonPrimitive?.intOrNull?.let { days ->
                    keyInfos.add("⏰ Kick après" to "$days jours")
                }
            }
            "economy" -> {
                val obj = sectionData.jsonObject
                val balanceCount = obj["balances"]?.jsonObject?.size ?: 0
                keyInfos.add("💰 Nombre de comptes" to "$balanceCount utilisateurs")
            }
            "levels" -> {
                val obj = sectionData.jsonObject
                val userCount = obj["users"]?.jsonObject?.size ?: 0
                keyInfos.add("📈 Utilisateurs avec XP" to "$userCount")
            }
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error rendering key info for $sectionKey: ${e.message}")
    }
    
    if (keyInfos.isNotEmpty()) {
        Card(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
        ) {
            Column(Modifier.padding(12.dp)) {
                Text(
                    "📋 Informations clés",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4CAF50)
                )
                Spacer(Modifier.height(8.dp))
                keyInfos.forEach { (label, value) ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray,
                            modifier = Modifier.weight(0.4f)
                        )
                        Text(
                            value,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                            modifier = Modifier.weight(0.6f)
                        )
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
                                // Afficher les infos clés avec les vrais noms
                                renderKeyInfo(sectionKey, sectionData, members, channels, roles)
                                Spacer(Modifier.height(8.dp))

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
        "motCache" -> "🔍 Mot Caché"
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
fun DashboardUrlCard(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var dashboardUrl by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isEditing by remember { mutableStateOf(false) }
    var editedUrl by remember { mutableStateOf("") }
    
    // Charger l'URL actuelle
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/admin/app-config")
                val data = json.parseToJsonElement(response).jsonObject
                val url = data["dashboardUrl"].safeStringOrEmpty()
                withContext(Dispatchers.Main) {
                    dashboardUrl = url
                    editedUrl = url
                }
                Log.d(TAG, "Dashboard URL loaded: $url")
            } catch (e: Exception) {
                Log.e(TAG, "Error loading dashboard URL: ${e.message}")
                withContext(Dispatchers.Main) {
                    snackbar.showSnackbar("❌ Erreur chargement: ${e.message}")
                }
            } finally {
                withContext(Dispatchers.Main) {
                    isLoading = false
                }
            }
        }
    }
    
    fun saveDashboardUrl() {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val body = buildJsonObject { 
                        put("dashboardUrl", editedUrl.trim())
                    }
                    api.postJson("/api/admin/app-config", body.toString())
                    withContext(Dispatchers.Main) {
                        dashboardUrl = editedUrl.trim()
                        isEditing = false
                        snackbar.showSnackbar("✅ URL dashboard sauvegardée")
                    }
                    Log.d(TAG, "Dashboard URL saved: ${editedUrl.trim()}")
                } catch (e: Exception) {
                    Log.e(TAG, "Error saving dashboard URL: ${e.message}")
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur sauvegarde: ${e.message}")
                    }
                }
            }
        }
    }
    
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2196F3))
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Link,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(
                            "🔗 URL Dashboard",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "Configuration globale",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFBBDEFB)
                        )
                    }
                }
                
                IconButton(
                    onClick = { 
                        isEditing = !isEditing
                        if (!isEditing) editedUrl = dashboardUrl
                    }
                ) {
                    Icon(
                        if (isEditing) Icons.Default.Close else Icons.Default.Edit,
                        null,
                        tint = Color.White
                    )
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            if (isEditing) {
                OutlinedTextField(
                    value = editedUrl,
                    onValueChange = { editedUrl = it },
                    label = { Text("URL du Dashboard") },
                    placeholder = { Text("http://88.174.155.230:33003") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color.White,
                        unfocusedBorderColor = Color(0xFFBBDEFB),
                        focusedLabelColor = Color.White,
                        unfocusedLabelColor = Color(0xFFBBDEFB),
                        cursorColor = Color.White
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Uri,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = { saveDashboardUrl() }
                    )
                )
                
                Spacer(Modifier.height(12.dp))
                
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = { 
                            isEditing = false
                            editedUrl = dashboardUrl
                        }
                    ) {
                        Text("Annuler", color = Color.White)
                    }
                    
                    Spacer(Modifier.width(8.dp))
                    
                    Button(
                        onClick = { saveDashboardUrl() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color(0xFF2196F3)
                        ),
                        enabled = editedUrl.trim().isNotEmpty()
                    ) {
                        Text("💾 Sauvegarder")
                    }
                }
            } else {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White
                    )
                } else {
                    Text(
                        dashboardUrl.ifEmpty { "Aucune URL configurée" },
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                    )
                    
                    Spacer(Modifier.height(8.dp))
                    
                    Text(
                        "📱 Cette URL sera automatiquement partagée avec le bot Discord et les autres applications",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFBBDEFB),
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                }
            }
        }
    }
}

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
    
    // DEBUG: Log members
    LaunchedEffect(members) {
        Log.d(TAG, "AdminScreenWithAccess: Received ${members.size} members")
        if (members.isEmpty()) {
            Log.e(TAG, "AdminScreenWithAccess: members is EMPTY!")
        } else {
            Log.d(TAG, "AdminScreenWithAccess: First 3 members: ${members.entries.take(3)}")
        }
    }
    
    // Charger la liste des utilisateurs autorisés
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/admin/allowed-users")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    allowedUsers = data["allowedUsers"]?.jsonArray.safeStringList()
                }
                Log.d(TAG, "Allowed users loaded: ${allowedUsers.size}")
            } catch (e: Exception) {
                Log.e(TAG, "Error loading allowed-users: ${e.message}")
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
        val availableMembers = members.filterKeys { !allowedUsers.contains(it) }
        Log.d(TAG, "Dialog: Available members for selection: ${availableMembers.size}")
        
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Ajouter un utilisateur") },
            text = {
                Column {
                    if (availableMembers.isEmpty()) {
                        Text(
                            "⚠️ Aucun membre disponible.\nTous les membres sont déjà autorisés ou la liste des membres n'a pas pu être chargée.",
                            color = MaterialTheme.colorScheme.error
                        )
                    } else {
                        Text("Sélectionnez un membre à autoriser (${availableMembers.size} disponibles)")
                    }
                    Spacer(Modifier.height(16.dp))
                    MemberSelector(
                        members = availableMembers,
                        selectedMemberId = selectedMember,
                        onMemberSelected = { 
                            selectedMember = it
                            Log.d(TAG, "Member selected: $it (${availableMembers[it]})")
                        },
                        label = if (availableMembers.isEmpty()) "Aucun membre" else "Membre"
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
            DashboardUrlCard(api, json, scope, snackbar)
        }
        
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
                    inactivityExemptRoles = data["exemptRoles"]?.jsonArray.safeStringList()
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
