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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

@Composable
fun EconomyFixedScreen(
    api: ApiClient,
    json: Json,
    members: Map<String, String>,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var economyData by remember { mutableStateOf<JsonObject?>(null) }
    
    // Charger les données depuis l'API
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    economyData = allConfigs["economy"]?.jsonObject
                    android.util.Log.d("ECONOMY_LOAD", "Loaded economy data with ${economyData?.keys?.size ?: 0} keys")
                }
            } catch (e: Exception) {
                android.util.Log.e("ECONOMY_LOAD", "Error loading: ${e.message}")
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
    
    Column(Modifier.fillMaxSize()) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, "Retour")
            }
            Spacer(Modifier.width(8.dp))
            Text("💰 Économie", style = MaterialTheme.typography.headlineMedium)
        }
        
        // Tabs (5 onglets au lieu de 7)
        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E1E1E),
            edgePadding = 0.dp
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("🏆 Classement") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("⚙️ Settings") })
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("🛒 Boutique") })
            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text("⏱️ Cooldowns") })
            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text("☯️ Karma") })
        }
        
        // Content
        when (selectedTab) {
            0 -> EconomyLeaderboard(economyData, members)
            1 -> EconomySettings(economyData, api, json)
            2 -> EconomyShop(economyData, api, json)
            3 -> EconomyCooldowns(economyData, api, json)
            4 -> EconomyKarma(economyData, members)
        }
    }
}

// ============ ONGLET CLASSEMENT ============
@Composable
fun EconomyLeaderboard(economyData: JsonObject?, members: Map<String, String>) {
    val balances = economyData?.get("balances")?.jsonObject ?: JsonObject(emptyMap())
    val sorted = remember(balances) {
        balances.entries.map { (userId, data) ->
            Triple(
                userId,
                data.jsonObject["coins"]?.jsonPrimitive?.intOrNull ?: 0,
                data.jsonObject
            )
        }.sortedByDescending { it.second }
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("🏆 Top Richesse (${sorted.size})", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
        }
        
        itemsIndexed(sorted) { index, (userId, coins, data) ->
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
                            val charme = data["charme"]?.jsonPrimitive?.intOrNull ?: 0
                            val perv = data["perv"]?.jsonPrimitive?.intOrNull ?: 0
                            if (charme > 0 || perv > 0) {
                                Text(
                                    "😇 $charme | 😈 $perv",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                        }
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

// ============ ONGLET SETTINGS ============
@Composable
fun EconomySettings(economyData: JsonObject?, api: ApiClient, json: Json) {
    var enabled by remember { mutableStateOf(economyData?.get("enabled")?.jsonPrimitive?.booleanOrNull ?: false) }
    val settings = economyData?.get("settings")?.jsonObject
    var startCoins by remember { mutableStateOf(settings?.get("startCoins")?.jsonPrimitive?.intOrNull ?: 100) }
    var dailyAmount by remember { mutableStateOf(settings?.get("dailyAmount")?.jsonPrimitive?.intOrNull ?: 50) }
    var workMinAmount by remember { mutableStateOf(settings?.get("workMinAmount")?.jsonPrimitive?.intOrNull ?: 10) }
    var workMaxAmount by remember { mutableStateOf(settings?.get("workMaxAmount")?.jsonPrimitive?.intOrNull ?: 50) }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ConfigSection(
                title = "Paramètres",
                icon = Icons.Default.Settings,
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
                    label = "Système économie activé",
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
                    label = "💼 Work Min (coins)",
                    value = workMinAmount,
                    onValueChange = { workMinAmount = it }
                )
                ConfigNumberField(
                    label = "💼 Work Max (coins)",
                    value = workMaxAmount,
                    onValueChange = { workMaxAmount = it }
                )
            }
        }
    }
}

// ============ ONGLET BOUTIQUE ============
@Composable
fun EconomyShop(economyData: JsonObject?, api: ApiClient, json: Json) {
    val shopItems = economyData?.get("shop")?.jsonObject?.get("items")?.jsonArray ?: JsonArray(emptyList())
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("🛒 Boutique (${shopItems.size} articles)", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
        }
        
        items(shopItems.size) { index ->
            val item = shopItems[index].jsonObject
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        item["name"]?.jsonPrimitive?.contentOrNull ?: "Article",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        item["description"]?.jsonPrimitive?.contentOrNull ?: "",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "Prix: ${item["price"]?.jsonPrimitive?.intOrNull ?: 0} 💎",
                            color = Color(0xFF57F287),
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Stock: ${item["stock"]?.jsonPrimitive?.intOrNull ?: "∞"}",
                            color = Color.Gray,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
        
        if (shopItems.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Aucun article dans la boutique", color = Color.Gray)
                    }
                }
            }
        }
    }
}

// ============ ONGLET COOLDOWNS ============
@Composable
fun EconomyCooldowns(economyData: JsonObject?, api: ApiClient, json: Json) {
    val cooldowns = economyData?.get("settings")?.jsonObject?.get("cooldowns")?.jsonObject ?: JsonObject(emptyMap())
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("⏱️ Cooldowns Actions", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
        }
        
        if (cooldowns.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Aucun cooldown configuré", color = Color.Gray)
                    }
                }
            }
        } else {
            cooldowns.forEach { (action, cooldownMs) ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(action, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(
                                "${cooldownMs.jsonPrimitive.longOrNull?.div(1000) ?: 0}s",
                                color = Color(0xFF57F287),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

// ============ ONGLET KARMA ============
@Composable
fun EconomyKarma(economyData: JsonObject?, members: Map<String, String>) {
    val balances = economyData?.get("balances")?.jsonObject ?: JsonObject(emptyMap())
    val usersWithKarma = remember(balances) {
        balances.entries.mapNotNull { (userId, data) ->
            val obj = data.jsonObject
            val charme = obj["charme"]?.jsonPrimitive?.intOrNull ?: 0
            val perv = obj["perv"]?.jsonPrimitive?.intOrNull ?: 0
            if (charme > 0 || perv > 0) Triple(userId, charme, perv) else null
        }.sortedByDescending { it.second + it.third }
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text("☯️ Karma (${usersWithKarma.size} utilisateurs)", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
        }
        
        if (usersWithKarma.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Aucun utilisateur avec karma", color = Color.Gray)
                    }
                }
            }
        } else {
            items(usersWithKarma) { (userId, charme, perv) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            members[userId] ?: "Inconnu",
                            modifier = Modifier.weight(1f),
                            fontWeight = FontWeight.Medium
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("😇", fontSize = 20.sp)
                                Text(
                                    "$charme",
                                    color = Color(0xFF57F287),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("😈", fontSize = 20.sp)
                                Text(
                                    "$perv",
                                    color = Color(0xFFED4245),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
