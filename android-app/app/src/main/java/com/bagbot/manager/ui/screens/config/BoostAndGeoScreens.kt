package com.bagbot.manager.ui.screens.config

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
// BOOST - Configuration des bonus serveur
// ============================================================================
@Composable
fun BoostConfigScreen(
    api: ApiClient,
    roles: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var enabled by remember { mutableStateOf(false) }
    var textXpMult by remember { mutableStateOf(2.0) }
    var voiceXpMult by remember { mutableStateOf(2.0) }
    var actionCooldownMult by remember { mutableStateOf(0.5) }
    var shopPriceMult by remember { mutableStateOf(0.5) }
    var boostRoles by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedRoleToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val boostData = allConfigs["boost"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (boostData != null) {
                        enabled = boostData["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        textXpMult = boostData["textXpMult"]?.jsonPrimitive?.doubleOrNull ?: 2.0
                        voiceXpMult = boostData["voiceXpMult"]?.jsonPrimitive?.doubleOrNull ?: 2.0
                        actionCooldownMult = boostData["actionCooldownMult"]?.jsonPrimitive?.doubleOrNull ?: 0.5
                        shopPriceMult = boostData["shopPriceMult"]?.jsonPrimitive?.doubleOrNull ?: 0.5
                        boostRoles = boostData["roles"]?.jsonArray?.mapNotNull {
                            it.jsonPrimitive.contentOrNull
                        } ?: emptyList()
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
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("🚀 Booster", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Rocket,
                color = Color(0xFFEB459E),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("enabled", enabled)
                                put("textXpMult", textXpMult)
                                put("voiceXpMult", voiceXpMult)
                                put("actionCooldownMult", actionCooldownMult)
                                put("shopPriceMult", shopPriceMult)
                                putJsonArray("roles") {
                                    boostRoles.forEach { add(it) }
                                }
                            }
                            api.putJson("/api/configs/boost", updates.toString())
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
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Multiplicateurs", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                Text("XP Texte: ${String.format("%.1f", textXpMult)}x", style = MaterialTheme.typography.bodyMedium)
                Slider(
                    value = textXpMult.toFloat(),
                    onValueChange = { textXpMult = it.toDouble() },
                    valueRange = 1f..5f,
                    steps = 39
                )
                
                Spacer(Modifier.height(8.dp))
                
                Text("XP Vocal: ${String.format("%.1f", voiceXpMult)}x", style = MaterialTheme.typography.bodyMedium)
                Slider(
                    value = voiceXpMult.toFloat(),
                    onValueChange = { voiceXpMult = it.toDouble() },
                    valueRange = 1f..5f,
                    steps = 39
                )
                
                Spacer(Modifier.height(8.dp))
                
                Text("Cooldown Actions: ${String.format("%.1f", actionCooldownMult)}x", style = MaterialTheme.typography.bodyMedium)
                Slider(
                    value = actionCooldownMult.toFloat(),
                    onValueChange = { actionCooldownMult = it.toDouble() },
                    valueRange = 0.1f..1f,
                    steps = 90
                )
                
                Spacer(Modifier.height(8.dp))
                
                Text("Prix Boutique: ${String.format("%.1f", shopPriceMult)}x", style = MaterialTheme.typography.bodyMedium)
                Slider(
                    value = shopPriceMult.toFloat(),
                    onValueChange = { shopPriceMult = it.toDouble() },
                    valueRange = 0.1f..1f,
                    steps = 90
                )
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("Rôles Booster (${boostRoles.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                boostRoles.forEach { roleId ->
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
                                boostRoles = boostRoles.filter { it != roleId }
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
                    label = "Ajouter un rôle booster"
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedRoleToAdd?.let {
                            if (!boostRoles.contains(it)) {
                                boostRoles = boostRoles + it
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
// GEO - Affichage de la géolocalisation
// ============================================================================
@Composable
fun GeoFullScreen(
    api: ApiClient,
    json: Json,
    members: Map<String, String>,
    onBack: () -> Unit
) {
    var geoLocations by remember { mutableStateOf<Map<String, JsonObject>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val geoData = allConfigs["geo"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (geoData != null) {
                        geoLocations = geoData["locations"]?.jsonObject?.mapValues { 
                            it.value.jsonObject 
                        } ?: emptyMap()
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
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Retour")
                }
                Spacer(Modifier.width(8.dp))
                Text("🌍 Géolocalisation", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        "Membres localisés: ${geoLocations.size}",
                        style = MaterialTheme.typography.titleLarge,
                        color = Color(0xFF32CD32)
                    )
                }
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (geoLocations.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.LocationOff,
                            null,
                            modifier = Modifier.size(64.dp),
                            tint = Color.Gray
                        )
                        Spacer(Modifier.height(16.dp))
                        Text("Aucune localisation enregistrée", color = Color.Gray)
                    }
                }
            }
        } else {
            geoLocations.forEach { (userId, location) ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(
                                members[userId] ?: "Utilisateur inconnu",
                                style = MaterialTheme.typography.titleMedium,
                                color = Color.White
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            val city = location["city"]?.jsonPrimitive?.contentOrNull ?: "Ville inconnue"
                            val lat = location["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                            val lon = location["lon"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                            
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.LocationOn, null, tint = Color(0xFF32CD32))
                                Spacer(Modifier.width(8.dp))
                                Text(city, color = Color(0xFF32CD32))
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Lat: ${String.format("%.4f", lat)}, Lon: ${String.format("%.4f", lon)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                            
                            val updatedAt = location["updatedAt"]?.jsonPrimitive?.longOrNull
                            if (updatedAt != null) {
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Mis à jour: ${java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(java.util.Date(updatedAt))}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
