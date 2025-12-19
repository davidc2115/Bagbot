package com.bagbot.manager.ui.screens.config

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

// ============================================================================
// ECONOMY - Configuration + Classement
// ============================================================================
@Composable
fun EconomyFullScreen(
    api: ApiClient,
    json: Json,
    scope: CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    Column(Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E1E1E)
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("⚙️ Configuration") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("🏆 Classement") }
            )
        }
        
        when (selectedTab) {
            0 -> EconomyConfigTab(api, json, scope, snackbar)
            1 -> EconomyLeaderboardTab(api, json, members)
        }
    }
}

@Composable
fun EconomyConfigTab(
    api: ApiClient,
    json: Json,
    scope: CoroutineScope,
    snackbar: SnackbarHostState
) {
    var enabled by remember { mutableStateOf(false) }
    var startCoins by remember { mutableStateOf(100) }
    var dailyAmount by remember { mutableStateOf(50) }
    var workMinAmount by remember { mutableStateOf(10) }
    var workMaxAmount by remember { mutableStateOf(50) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val economyData = allConfigs["economy"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (economyData != null) {
                        enabled = economyData["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        // Vérifier si settings existe, sinon utiliser les valeurs directes
                        val settings = economyData["settings"]?.jsonObject
                        if (settings != null) {
                            startCoins = settings["startCoins"]?.jsonPrimitive?.intOrNull ?: 100
                            dailyAmount = settings["dailyAmount"]?.jsonPrimitive?.intOrNull ?: 50
                            workMinAmount = settings["workMinAmount"]?.jsonPrimitive?.intOrNull ?: 10
                            workMaxAmount = settings["workMaxAmount"]?.jsonPrimitive?.intOrNull ?: 50
                        } else {
                            // Fallback si pas de settings, chercher directement dans economy
                            startCoins = economyData["startCoins"]?.jsonPrimitive?.intOrNull ?: 100
                            dailyAmount = economyData["dailyAmount"]?.jsonPrimitive?.intOrNull ?: 50
                            workMinAmount = economyData["workMinAmount"]?.jsonPrimitive?.intOrNull ?: 10
                            workMaxAmount = economyData["workMaxAmount"]?.jsonPrimitive?.intOrNull ?: 50
                        }
                    }
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
            Text("💰 Configuration Économie", style = MaterialTheme.typography.headlineMedium)
        }
        
        item {
            ConfigSection(
                title = "Paramètres",
                icon = Icons.Default.AttachMoney,
                color = Color(0xFF57F287),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                putJsonObject("settings") {
                                    put("startCoins", startCoins)
                                    put("dailyAmount", dailyAmount)
                                    put("workMinAmount", workMinAmount)
                                    put("workMaxAmount", workMaxAmount)
                                }
                            }
                            api.putJson("/api/configs/economy", updates.toString())
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
                    label = "💎 Coins de départ",
                    value = startCoins,
                    onValueChange = { startCoins = it }
                )
                
                ConfigNumberField(
                    label = "📅 Daily (coins/jour)",
                    value = dailyAmount,
                    onValueChange = { dailyAmount = it }
                )
                
                ConfigNumberField(
                    label = "💼 Work Min",
                    value = workMinAmount,
                    onValueChange = { workMinAmount = it }
                )
                
                ConfigNumberField(
                    label = "💼 Work Max",
                    value = workMaxAmount,
                    onValueChange = { workMaxAmount = it }
                )
            }
        }
    }
}

@Composable
fun EconomyLeaderboardTab(
    api: ApiClient,
    json: Json,
    members: Map<String, String>
) {
    var leaderboard by remember { mutableStateOf<List<Pair<String, Int>>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/economy/leaderboard")
                val data = json.parseToJsonElement(response).jsonArray
                withContext(Dispatchers.Main) {
                    leaderboard = data.mapNotNull { entry ->
                        val obj = entry.jsonObject
                        val userId = obj["userId"]?.jsonPrimitive?.contentOrNull
                        val coins = obj["coins"]?.jsonPrimitive?.intOrNull
                        if (userId != null && coins != null) userId to coins else null
                    }
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("🏆 Classement Économie", style = MaterialTheme.typography.headlineMedium)
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (leaderboard.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.MoneyOff, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                        Spacer(Modifier.height(16.dp))
                        Text("Aucune donnée économique", color = Color.Gray)
                    }
                }
            }
        } else {
            itemsIndexed(leaderboard) { index, (userId, coins) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = when (index) {
                            0 -> Color(0xFFFFD700).copy(alpha = 0.2f)
                            1 -> Color(0xFFC0C0C0).copy(alpha = 0.2f)
                            2 -> Color(0xFFCD7F32).copy(alpha = 0.2f)
                            else -> Color(0xFF2A2A2A)
                        }
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Text(
                                "#${index + 1}",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (index) {
                                    0 -> Color(0xFFFFD700)
                                    1 -> Color(0xFFC0C0C0)
                                    2 -> Color(0xFFCD7F32)
                                    else -> Color.White
                                }
                            )
                            Spacer(Modifier.width(16.dp))
                            Text(members[userId] ?: "Inconnu", modifier = Modifier.weight(1f))
                        }
                        Text(
                            "$coins 💎",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF57F287)
                        )
                    }
                }
            }
        }
    }
}

// ============================================================================
// LEVELS - Configuration + Classement
// ============================================================================
@Composable
fun LevelsFullScreen(
    api: ApiClient,
    json: Json,
    scope: CoroutineScope,
    snackbar: SnackbarHostState,
    members: Map<String, String>
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    Column(Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E1E1E)
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("⚙️ Configuration") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("🏆 Classement") }
            )
        }
        
        when (selectedTab) {
            0 -> LevelsConfigTab(api, json, scope, snackbar)
            1 -> LevelsLeaderboardTab(api, json, members)
        }
    }
}

@Composable
fun LevelsConfigTab(
    api: ApiClient,
    json: Json,
    scope: CoroutineScope,
    snackbar: SnackbarHostState
) {
    var enabled by remember { mutableStateOf(false) }
    var textXpMin by remember { mutableStateOf(5) }
    var textXpMax by remember { mutableStateOf(15) }
    var voiceXpPerMin by remember { mutableStateOf(10) }
    var xpMultiplier by remember { mutableStateOf(1.2) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val levelsData = allConfigs["levels"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (levelsData != null) {
                        enabled = levelsData["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        textXpMin = levelsData["textXpMin"]?.jsonPrimitive?.intOrNull ?: 5
                        textXpMax = levelsData["textXpMax"]?.jsonPrimitive?.intOrNull ?: 15
                        voiceXpPerMin = levelsData["voiceXpPerMin"]?.jsonPrimitive?.intOrNull ?: 10
                        xpMultiplier = levelsData["xpMultiplier"]?.jsonPrimitive?.doubleOrNull ?: 1.2
                    }
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
            Text("📈 Configuration Niveaux", style = MaterialTheme.typography.headlineMedium)
        }
        
        item {
            ConfigSection(
                title = "Paramètres XP",
                icon = Icons.Default.TrendingUp,
                color = Color(0xFFFEE75C),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("textXpMin", textXpMin)
                                put("textXpMax", textXpMax)
                                put("voiceXpPerMin", voiceXpPerMin)
                                put("xpMultiplier", xpMultiplier)
                            }
                            api.putJson("/api/configs/levels", updates.toString())
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
                    label = "💬 XP Texte Min",
                    value = textXpMin,
                    onValueChange = { textXpMin = it }
                )
                
                ConfigNumberField(
                    label = "💬 XP Texte Max",
                    value = textXpMax,
                    onValueChange = { textXpMax = it }
                )
                
                ConfigNumberField(
                    label = "🎤 XP Vocal (/min)",
                    value = voiceXpPerMin,
                    onValueChange = { voiceXpPerMin = it }
                )
                
                Spacer(Modifier.height(8.dp))
                Text(
                    "Multiplicateur de niveau: ${String.format("%.2f", xpMultiplier)}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = xpMultiplier.toFloat(),
                    onValueChange = { xpMultiplier = it.toDouble() },
                    valueRange = 1.0f..2.0f,
                    steps = 100
                )
            }
        }
    }
}

@Composable
fun LevelsLeaderboardTab(
    api: ApiClient,
    json: Json,
    members: Map<String, String>
) {
    var leaderboard by remember { mutableStateOf<List<Triple<String, Int, Int>>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/levels/leaderboard")
                val data = json.parseToJsonElement(response).jsonArray
                withContext(Dispatchers.Main) {
                    leaderboard = data.mapNotNull { entry ->
                        val obj = entry.jsonObject
                        val userId = obj["userId"]?.jsonPrimitive?.contentOrNull
                        val level = obj["level"]?.jsonPrimitive?.intOrNull
                        val xp = obj["xp"]?.jsonPrimitive?.intOrNull
                        if (userId != null && level != null && xp != null) {
                            Triple(userId, level, xp)
                        } else null
                    }
                }
            } catch (e: Exception) {
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("🏆 Classement Niveaux", style = MaterialTheme.typography.headlineMedium)
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (leaderboard.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.TrendingDown, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                        Spacer(Modifier.height(16.dp))
                        Text("Aucune donnée de niveau", color = Color.Gray)
                    }
                }
            }
        } else {
            itemsIndexed(leaderboard) { index, (userId, level, xp) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = when (index) {
                            0 -> Color(0xFFFFD700).copy(alpha = 0.2f)
                            1 -> Color(0xFFC0C0C0).copy(alpha = 0.2f)
                            2 -> Color(0xFFCD7F32).copy(alpha = 0.2f)
                            else -> Color(0xFF2A2A2A)
                        }
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Text(
                                "#${index + 1}",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (index) {
                                    0 -> Color(0xFFFFD700)
                                    1 -> Color(0xFFC0C0C0)
                                    2 -> Color(0xFFCD7F32)
                                    else -> Color.White
                                }
                            )
                            Spacer(Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(members[userId] ?: "Inconnu")
                                Text(
                                    "$xp XP",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                        Text(
                            "Niv. $level",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFEE75C)
                        )
                    }
                }
            }
        }
    }
}
