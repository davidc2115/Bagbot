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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
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
// CATÉGORIES DU DASHBOARD v2.5.2 - TOUTES LES 20 CATÉGORIES
// ============================================

data class DashboardCategory(
    val id: String,
    val name: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val color: Color,
    val description: String
)

val dashboardCategories = listOf(
    DashboardCategory("dashboard", "📊 Dashboard", Icons.Default.Dashboard, Color(0xFF5865F2), "Vue d'ensemble du serveur"),
    DashboardCategory("economy", "💰 Économie", Icons.Default.AttachMoney, Color(0xFF57F287), "Gestion des coins et boutique"),
    DashboardCategory("levels", "📈 Niveaux", Icons.Default.TrendingUp, Color(0xFFFEE75C), "Système XP et récompenses"),
    DashboardCategory("booster", "🚀 Booster", Icons.Default.Rocket, Color(0xFFEB459E), "Configuration des boosters"),
    DashboardCategory("counting", "🔢 Comptage", Icons.Default.Pin, Color(0xFF00D4FF), "Jeu de comptage"),
    DashboardCategory("truthdare", "🎲 Action/Vérité", Icons.Default.Casino, Color(0xFF9B59B6), "Prompts SFW/NSFW"),
    DashboardCategory("logs", "📝 Logs", Icons.Default.Description, Color(0xFF95A5A6), "Journaux de modération"),
    DashboardCategory("tickets", "🎫 Tickets", Icons.Default.ConfirmationNumber, Color(0xFFE67E22), "Système de tickets"),
    DashboardCategory("confess", "💬 Confessions", Icons.Default.Chat, Color(0xFFE91E63), "Confessions anonymes"),
    DashboardCategory("welcome", "👋 Welcome", Icons.Default.EmojiPeople, Color(0xFF3498DB), "Messages de bienvenue"),
    DashboardCategory("goodbye", "👋 Goodbye", Icons.Default.ExitToApp, Color(0xFF8B4513), "Messages d'au revoir"),
    DashboardCategory("staff", "👥 Staff", Icons.Default.AdminPanelSettings, Color(0xFFFFD700), "Gestion du staff"),
    DashboardCategory("autokick", "👢 AutoKick", Icons.Default.RemoveCircle, Color(0xFFDC143C), "Kick automatique"),
    DashboardCategory("inactivity", "⏰ Inactivité", Icons.Default.Timer, Color(0xFFFF69B4), "Kick inactivité"),
    DashboardCategory("autothread", "🧵 AutoThread", Icons.Default.Forum, Color(0xFF20B2AA), "Fils automatiques"),
    DashboardCategory("disboard", "📢 Disboard", Icons.Default.Campaign, Color(0xFF4169E1), "Rappels Disboard"),
    DashboardCategory("geo", "🌍 Géolocalisation", Icons.Default.Map, Color(0xFF32CD32), "Carte des membres"),
    DashboardCategory("actions", "🎬 Actions (GIFs)", Icons.Default.Gif, Color(0xFFE91E63), "GIFs de réaction"),
    DashboardCategory("backups", "💾 Backups", Icons.Default.Backup, Color(0xFF607D8B), "Sauvegardes"),
    DashboardCategory("botcontrol", "🎮 Contrôle Bot", Icons.Default.Settings, Color(0xFFFF5722), "Contrôle du bot")
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
    members: Map<String, String>,
    onBack: (() -> Unit)? = null
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
                                userId = obj["userId"]?.jsonPrimitive?.content ?: "",
                                amount = obj["amount"]?.jsonPrimitive?.int ?: 0
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
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, "Retour", tint = Color.White)
                        }
                        Spacer(Modifier.width(4.dp))
                    }
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
                                userId = obj["userId"]?.jsonPrimitive?.content ?: "",
                                xp = obj["xp"]?.jsonPrimitive?.int ?: 0,
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

// ---------------- FUN SCREEN (GIFs + Prompts) avec SFW/NSFW ----------------
data class TruthDarePrompt(
    val id: Int,
    val text: String,
    val type: String // "truth" or "dare"
)

data class TruthDareCategory(
    val mode: String, // "sfw" or "nsfw"
    val prompts: List<TruthDarePrompt>
)

@Composable
fun FunFullScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    onBack: (() -> Unit)? = null
) {
    var selectedTab by remember { mutableStateOf(0) }
    var selectedCategory by remember { mutableStateOf("sfw") } // "sfw" or "nsfw"
    var selectedType by remember { mutableStateOf("truth") } // "truth" or "dare"
    var sfwData by remember { mutableStateOf<TruthDareCategory?>(null) }
    var nsfwData by remember { mutableStateOf<TruthDareCategory?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var newPrompt by remember { mutableStateOf("") }
    var editingPrompt by remember { mutableStateOf<TruthDarePrompt?>(null) }
    var editText by remember { mutableStateOf("") }
    var showEditDialog by remember { mutableStateOf(false) }
    
    fun loadPrompts() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    // Load SFW
                    val sfwResponse = api.getJson("/api/truthdare/sfw")
                    val sfwJson = json.parseToJsonElement(sfwResponse).jsonObject
                    val sfwPrompts = sfwJson["prompts"]?.jsonArray?.map {
                        val p = it.jsonObject
                        TruthDarePrompt(
                            id = p["id"]?.jsonPrimitive?.int ?: 0,
                            text = p["text"]?.jsonPrimitive?.content ?: "",
                            type = p["type"]?.jsonPrimitive?.content ?: "truth"
                        )
                    } ?: emptyList()
                    
                    // Load NSFW
                    val nsfwResponse = api.getJson("/api/truthdare/nsfw")
                    val nsfwJson = json.parseToJsonElement(nsfwResponse).jsonObject
                    val nsfwPrompts = nsfwJson["prompts"]?.jsonArray?.map {
                        val p = it.jsonObject
                        TruthDarePrompt(
                            id = p["id"]?.jsonPrimitive?.int ?: 0,
                            text = p["text"]?.jsonPrimitive?.content ?: "",
                            type = p["type"]?.jsonPrimitive?.content ?: "truth"
                        )
                    } ?: emptyList()
                    
                    withContext(Dispatchers.Main) {
                        sfwData = TruthDareCategory("sfw", sfwPrompts)
                        nsfwData = TruthDareCategory("nsfw", nsfwPrompts)
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
                        put("type", selectedType)
                        put("text", newPrompt)
                    }
                    api.postJson("/api/truthdare/$selectedCategory", body.toString())
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
    
    fun updatePrompt(category: String, id: Int, newText: String) {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val body = buildJsonObject {
                        put("text", newText)
                    }
                    api.patchJson("/api/truthdare/$category/$id", body.toString())
                    withContext(Dispatchers.Main) {
                        showEditDialog = false
                        editingPrompt = null
                        loadPrompts()
                        snackbar.showSnackbar("✅ Prompt modifié")
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                    }
                }
            }
        }
    }
    
    fun deletePrompt(category: String, id: Int) {
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    api.deleteJson("/api/truthdare/$category/$id")
                    withContext(Dispatchers.Main) {
                        loadPrompts()
                        snackbar.showSnackbar("✅ Prompt supprimé")
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
    
    // Dialog pour éditer un prompt
    if (showEditDialog && editingPrompt != null) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Modifier le prompt") },
            text = {
                OutlinedTextField(
                    value = editText,
                    onValueChange = { editText = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Texte du prompt") },
                    minLines = 2
                )
            },
            confirmButton = {
                Button(onClick = { 
                    editingPrompt?.let { updatePrompt(selectedCategory, it.id, editText) }
                }) {
                    Text("Enregistrer")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showEditDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
    
    Column(Modifier.fillMaxSize()) {
        // Header avec bouton retour si fourni
        if (onBack != null) {
            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF9B59B6))) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Retour", tint = Color.White)
                    }
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text(
                            "🎲 Action ou Vérité",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "Gestion des prompts SFW/NSFW",
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
        
        TabRow(selectedTabIndex = selectedTab, containerColor = Color(0xFF1E1E1E)) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("🎲 Ajouter") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("📋 Gestion") })
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("🎬 GIFs") })
        }
        
        when (selectedTab) {
            0 -> {
                // Onglet Ajouter - Interface simplifiée
                Column(Modifier.fillMaxSize()) {
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFE91E63))) {
                        Column(Modifier.padding(16.dp)) {
                            Text("🎲 Ajouter un Prompt", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                            Spacer(Modifier.height(12.dp))
                            
                            // Sélection catégorie
                            Text("Catégorie :", color = Color.White, fontWeight = FontWeight.Bold)
                            Row(Modifier.fillMaxWidth()) {
                                FilterChip(
                                    selected = selectedCategory == "sfw",
                                    onClick = { selectedCategory = "sfw" },
                                    label = { Text("✅ SFW") }
                                )
                                Spacer(Modifier.width(8.dp))
                                FilterChip(
                                    selected = selectedCategory == "nsfw",
                                    onClick = { selectedCategory = "nsfw" },
                                    label = { Text("🔞 NSFW") }
                                )
                            }
                            
                            Spacer(Modifier.height(8.dp))
                            
                            // Sélection type
                            Text("Type :", color = Color.White, fontWeight = FontWeight.Bold)
                            Row(Modifier.fillMaxWidth()) {
                                FilterChip(
                                    selected = selectedType == "truth",
                                    onClick = { selectedType = "truth" },
                                    label = { Text("💭 Vérité") }
                                )
                                Spacer(Modifier.width(8.dp))
                                FilterChip(
                                    selected = selectedType == "dare",
                                    onClick = { selectedType = "dare" },
                                    label = { Text("🎯 Action") }
                                )
                            }
                            
                            Spacer(Modifier.height(12.dp))
                            
                            // Champ de texte
                            OutlinedTextField(
                                value = newPrompt,
                                onValueChange = { newPrompt = it },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Nouveau prompt", color = Color.White) },
                                minLines = 2,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )
                            
                            Spacer(Modifier.height(8.dp))
                            
                            Button(
                                onClick = { addPrompt() },
                                enabled = newPrompt.isNotBlank(),
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                            ) {
                                Icon(Icons.Default.Add, "Ajouter")
                                Spacer(Modifier.width(8.dp))
                                Text("Ajouter le prompt")
                            }
                        }
                    }
                }
            }
            1 -> {
                // Onglet Gestion - Liste des prompts avec édition/suppression
                Column(Modifier.fillMaxSize().padding(16.dp)) {
                    Text("📋 Gestion des Prompts", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    
                    // Sélection de la catégorie
                    Row(Modifier.fillMaxWidth()) {
                        FilterChip(
                            selected = selectedCategory == "sfw",
                            onClick = { selectedCategory = "sfw" },
                            label = { 
                                val count = sfwData?.prompts?.size ?: 0
                                Text("✅ SFW ($count)")
                            }
                        )
                        Spacer(Modifier.width(8.dp))
                        FilterChip(
                            selected = selectedCategory == "nsfw",
                            onClick = { selectedCategory = "nsfw" },
                            label = { 
                                val count = nsfwData?.prompts?.size ?: 0
                                Text("🔞 NSFW ($count)")
                            }
                        )
                    }
                    
                    Spacer(Modifier.height(16.dp))
                    
                    val currentData = if (selectedCategory == "sfw") sfwData else nsfwData
                    val truthPrompts = currentData?.prompts?.filter { it.type == "truth" } ?: emptyList()
                    val darePrompts = currentData?.prompts?.filter { it.type == "dare" } ?: emptyList()
                    
                    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Section Vérités
                        item {
                            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF3F51B5))) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(
                                        "💭 Vérités (${truthPrompts.size})",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                        items(truthPrompts) { prompt ->
                            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Row(
                                    Modifier.fillMaxWidth().padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(prompt.text, modifier = Modifier.weight(1f), color = Color.White)
                                    Row {
                                        IconButton(onClick = {
                                            editingPrompt = prompt
                                            editText = prompt.text
                                            showEditDialog = true
                                        }) {
                                            Icon(Icons.Default.Edit, "Modifier", tint = Color(0xFF2196F3))
                                        }
                                        IconButton(onClick = { deletePrompt(selectedCategory, prompt.id) }) {
                                            Icon(Icons.Default.Delete, "Supprimer", tint = Color(0xFFE53935))
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Section Actions
                        item {
                            Spacer(Modifier.height(8.dp))
                            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFE91E63))) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(
                                        "🎯 Actions (${darePrompts.size})",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                        items(darePrompts) { prompt ->
                            Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                                Row(
                                    Modifier.fillMaxWidth().padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(prompt.text, modifier = Modifier.weight(1f), color = Color.White)
                                    Row {
                                        IconButton(onClick = {
                                            editingPrompt = prompt
                                            editText = prompt.text
                                            showEditDialog = true
                                        }) {
                                            Icon(Icons.Default.Edit, "Modifier", tint = Color(0xFF2196F3))
                                        }
                                        IconButton(onClick = { deletePrompt(selectedCategory, prompt.id) }) {
                                            Icon(Icons.Default.Delete, "Supprimer", tint = Color(0xFFE53935))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
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
    val timestamp: String
)

@Composable
fun StaffChatScreen(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>,
    userInfo: JsonObject?
) {
    var messages by remember { mutableStateOf<List<StaffMessage>>(emptyList()) }
    var newMessage by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isSending by remember { mutableStateOf(false) }
    
    var lastTimestamp by remember { mutableStateOf(0L) }
    
    fun loadMessages() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val response = api.getJson("/api/staff/messages?since=$lastTimestamp")
                    val data = json.parseToJsonElement(response).jsonObject
                    withContext(Dispatchers.Main) {
                        val newMessages = data["messages"]?.jsonArray?.map {
                            val msg = it.jsonObject
                            StaffMessage(
                                id = msg["id"]?.jsonPrimitive?.content ?: "",
                                userId = msg["userId"]?.jsonPrimitive?.content ?: "",
                                username = msg["username"]?.jsonPrimitive?.content ?: "Inconnu",
                                message = msg["message"]?.jsonPrimitive?.content ?: "",
                                timestamp = msg["timestamp"]?.jsonPrimitive?.longOrNull?.toString() ?: ""
                            )
                        } ?: emptyList()
                        
                        // Ajouter les nouveaux messages à la liste existante
                        if (newMessages.isNotEmpty()) {
                            messages = (messages + newMessages).distinctBy { it.id }
                        }
                        
                        // Mettre à jour le timestamp
                        data["currentTimestamp"]?.jsonPrimitive?.longOrNull?.let {
                            lastTimestamp = it
                        }
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
    
    fun sendMessage() {
        if (newMessage.isBlank()) return
        val messageToSend = newMessage
        scope.launch {
            isSending = true
            withContext(Dispatchers.IO) {
                try {
                    val body = buildJsonObject {
                        put("message", messageToSend)
                    }
                    api.postJson("/api/staff/messages", body.toString())
                    withContext(Dispatchers.Main) {
                        newMessage = ""
                        // Charger immédiatement les nouveaux messages
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
        while (true) {
            kotlinx.coroutines.delay(5000)
            loadMessages()
        }
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
                    Text("💬 Chat Staff", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("${messages.size} messages", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.7f))
                }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { loadMessages() }) {
                    Icon(Icons.Default.Refresh, "Actualiser", tint = Color.White)
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
                    val isCurrentUser = userInfo?.get("id")?.jsonPrimitive?.content == msg.userId
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
                            Text(msg.message, style = MaterialTheme.typography.bodyMedium, color = Color.White)
                        }
                    }
                }
            }
        }
        
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newMessage,
                    onValueChange = { newMessage = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Écrivez un message...") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.LightGray),
                    maxLines = 3
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
    
    // Si admin: afficher l'interface normale
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
        }
        when (selectedStaffTab) {
            0 -> StaffChatScreen(api, json, scope, snackbar, members, userInfo)
            1 -> AdminScreenWithAccess(members, api, json, scope, snackbar)
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
                // 1. Informations utilisateur et permissions
                loadingMessage = "Récupération de votre profil..."
                Log.d(TAG, "Fetching /api/me")
                try {
                    val meJson = api.getJson("/api/me")
                    Log.d(TAG, "Response /api/me: ${meJson.take(100)}")
                    val me = json.parseToJsonElement(meJson).jsonObject
                    withContext(Dispatchers.Main) {
                        userId = me["userId"]?.jsonPrimitive?.contentOrNull ?: ""
                        userName = me["username"]?.jsonPrimitive?.contentOrNull ?: ""
                        isFounder = me["isFounder"]?.jsonPrimitive?.booleanOrNull ?: false
                        isAdmin = me["isAdmin"]?.jsonPrimitive?.booleanOrNull ?: false
                    }
                    Log.d(TAG, "User loaded: $userName ($userId) - Admin: $isAdmin, Founder: $isFounder")
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
                            if (isAdmin) {
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
                        tab == 3 && isAdmin -> {
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
    var selectedCategory by remember { mutableStateOf<DashboardCategory?>(null) }
    
    if (selectedCategory != null) {
        // Afficher l'écran détaillé de la catégorie
        CategoryDetailScreen(
            category = selectedCategory!!,
            configData = configData,
            members = members,
            channels = channels,
            roles = roles,
            api = api,
            json = json,
            scope = scope,
            snackbar = snackbar,
            onBack = { selectedCategory = null }
        )
    } else {
        // Afficher la grille de vignettes
        Column(Modifier.fillMaxSize()) {
            // Header
            Card(
                Modifier.fillMaxWidth().padding(16.dp),
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
                    Text("${members.size} membres • ${channels.size} salons • ${roles.size} rôles", color = Color.Gray)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "💡 Sélectionnez une catégorie pour configurer",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFFF1744),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF9C27B0))
                }
            } else {
                // Grille de vignettes 2 colonnes
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(dashboardCategories) { category ->
                        CategoryCard(
                            category = category,
                            onClick = { selectedCategory = category }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryCard(category: DashboardCategory, onClick: () -> Unit) {
    Card(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                Modifier
                    .size(56.dp)
                    .background(category.color.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    category.icon,
                    contentDescription = null,
                    tint = category.color,
                    modifier = Modifier.size(32.dp)
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                category.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 2
            )
            Spacer(Modifier.height(4.dp))
            Text(
                category.description,
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                maxLines = 2
            )
        }
    }
}

@Composable
fun CategoryDetailScreen(
    category: DashboardCategory,
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    onBack: () -> Unit
) {
    // Utiliser ConfigEditorScreen pour afficher le contenu réel de chaque catégorie
    // au lieu d'afficher "en développement"
    when (category.id) {
        "economy" -> {
            // Afficher l'écran d'économie complète avec bouton retour
            EconomyFullScreen(api, json, scope, snackbar, members, onBack)
        }
        "truthdare" -> {
            // Afficher l'écran Action/Vérité avec bouton retour
            FunFullScreen(api, json, scope, snackbar, onBack)
        }
        else -> {
            // Pour les autres catégories, utiliser ConfigEditorScreen
            ConfigEditorScreen(
                sectionKey = category.id,
                configData = configData,
                members = members,
                channels = channels,
                roles = roles,
                api = api,
                json = json,
                scope = scope,
                snackbar = snackbar,
                onBack = onBack,
                onConfigUpdated = {}
            )
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
                    val roleNames = arr.mapNotNull { it.jsonPrimitive.contentOrNull }.map { id ->
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
                    val channelId = channelIdEl.jsonPrimitive.contentOrNull
                    if (channelId != null) {
                        keyInfos.add("📝 $logType" to "${channels[channelId] ?: "Inconnu"} ($channelId)")
                    }
                }
            }
            "staffRoleIds" -> {
                val arr = sectionData.jsonArray
                val roleNames = arr.mapNotNull { it.jsonPrimitive.contentOrNull }.map { id ->
                    "${roles[id] ?: "Inconnu"} ($id)"
                }
                roleNames.forEach { name ->
                    keyInfos.add("👮 Rôle staff" to name)
                }
            }
            "quarantineRoleId" -> {
                val roleId = sectionData.jsonPrimitive.contentOrNull
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
