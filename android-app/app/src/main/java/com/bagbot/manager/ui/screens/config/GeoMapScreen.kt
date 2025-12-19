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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import android.content.Intent
import android.net.Uri

@Composable
fun GeoMapScreen(
    api: ApiClient,
    json: Json,
    members: Map<String, String>,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var geoData by remember { mutableStateOf<JsonObject?>(null) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    geoData = allConfigs["geo"]?.jsonObject
                    android.util.Log.d("GEO_LOAD", "Loaded geo data: ${geoData != null}")
                }
            } catch (e: Exception) {
                android.util.Log.e("GEO_LOAD", "Error: ${e.message}")
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
            Text("🌍 Géolocalisation", style = MaterialTheme.typography.headlineMedium)
        }
        
        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E1E1E)
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("📍 Liste") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("🗺️ Carte") })
        }
        
        when (selectedTab) {
            0 -> GeoListTab(geoData, members)
            1 -> GeoMapTab(geoData, members)
        }
    }
}

@Composable
fun GeoListTab(geoData: JsonObject?, members: Map<String, String>) {
    val locations = geoData?.get("locations")?.jsonObject ?: JsonObject(emptyMap())
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "Membres localisés: ${locations.size}",
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(Modifier.height(8.dp))
        }
        
        if (locations.isEmpty()) {
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
                        Text("Aucune localisation", color = Color.Gray)
                    }
                }
            }
        } else {
            locations.forEach { (userId, location) ->
                item {
                    val loc = location.jsonObject
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(
                                members[userId] ?: "Inconnu",
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            val city = loc["city"]?.jsonPrimitive?.contentOrNull ?: "Ville inconnue"
                            val lat = loc["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                            val lon = loc["lon"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                            
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
                            
                            val updatedAt = loc["updatedAt"]?.jsonPrimitive?.longOrNull
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

@Composable
fun GeoMapTab(geoData: JsonObject?, members: Map<String, String>) {
    val context = LocalContext.current
    val locations = geoData?.get("locations")?.jsonObject ?: JsonObject(emptyMap())
    
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("🗺️ Carte Interactive", style = MaterialTheme.typography.titleLarge)
        
        if (locations.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.Map, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    Text("Aucune localisation à afficher", color = Color.Gray)
                </Column>
            }
        } else {
            // Bouton pour ouvrir Google Maps avec tous les points
            Button(
                onClick = {
                    val coords = locations.entries.joinToString("|") { (_, location) ->
                        val loc = location.jsonObject
                        val lat = loc["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        val lon = loc["lon"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        "$lat,$lon"
                    }
                    
                    // Calculer le centre (moyenne des positions)
                    var sumLat = 0.0
                    var sumLon = 0.0
                    var count = 0
                    locations.forEach { (_, location) ->
                        val loc = location.jsonObject
                        sumLat += loc["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        sumLon += loc["lon"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        count++
                    }
                    val centerLat = sumLat / count
                    val centerLon = sumLon / count
                    
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$centerLat,$centerLon?q=$centerLat,$centerLon(Membres)&z=5"))
                    context.startActivity(intent)
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF32CD32))
            ) {
                Icon(Icons.Default.Map, null)
                Spacer(Modifier.width(8.dp))
                Text("Ouvrir dans Google Maps")
            }
            
            Spacer(Modifier.height(8.dp))
            
            // Liste des membres avec bouton pour ouvrir individuellement
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                locations.forEach { (userId, location) ->
                    item {
                        val loc = location.jsonObject
                        val city = loc["city"]?.jsonPrimitive?.contentOrNull ?: "Inconnue"
                        val lat = loc["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        val lon = loc["lon"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                        
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(members[userId] ?: "Inconnu", fontWeight = FontWeight.Bold)
                                    Text(city, color = Color(0xFF32CD32), fontSize = MaterialTheme.typography.bodySmall.fontSize)
                                }
                                IconButton(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lon?q=$lat,$lon(${members[userId] ?: "Membre"})"))
                                        context.startActivity(intent)
                                    }
                                ) {
                                    Icon(Icons.Default.LocationOn, "Voir sur carte", tint = Color(0xFF32CD32))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
