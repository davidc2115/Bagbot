package com.bagbot.manager.ui.screens.config

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.bagbot.manager.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActionsGifsScreen(
    api: ApiClient,
    json: Json,
    onBack: () -> Unit
) {
    var actionsData by remember { mutableStateOf<Map<String, JsonObject>>(emptyMap()) }
    var selectedAction by remember { mutableStateOf<String?>(null) }
    var selectedZone by remember { mutableStateOf<String>("") }
    var currentTab by remember { mutableStateOf(0) } // 0=Zones, 1=GIFs Success, 2=GIFs Fail, 3=Messages
    var isLoading by remember { mutableStateOf(true) }
    
    // Form fields
    var newZone by remember { mutableStateOf("") }
    var newSuccessGifs by remember { mutableStateOf("") }
    var newFailGifs by remember { mutableStateOf("") }
    var newSuccessMessage by remember { mutableStateOf("") }
    var newFailMessage by remember { mutableStateOf("") }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/economy/actions/gifs")
                val data = json.parseToJsonElement(response).jsonObject
                withContext(Dispatchers.Main) {
                    actionsData = data.mapValues { it.value.jsonObject }
                }
            } catch (e: Exception) {
                // Handle error
            } finally {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }
    
    suspend fun saveAction() {
        selectedAction?.let { action ->
            withContext(Dispatchers.IO) {
                try {
                    val actionData = actionsData[action] ?: buildJsonObject {}
                    api.putJson("/api/economy/actions/gifs/$action", actionData.toString())
                } catch (e: Exception) {
                    // Handle error
                }
            }
        }
    }
    
    fun getZones(): List<String> {
        return selectedAction?.let { action ->
            actionsData[action]?.get("zones")?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()
        } ?: emptyList()
    }
    
    fun getSuccessGifs(): List<String> {
        val key = if (selectedZone.isEmpty()) "success" else "success_$selectedZone"
        return selectedAction?.let { action ->
            actionsData[action]?.get(key)?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()
        } ?: emptyList()
    }
    
    fun getFailGifs(): List<String> {
        val key = if (selectedZone.isEmpty()) "fail" else "fail_$selectedZone"
        return selectedAction?.let { action ->
            actionsData[action]?.get(key)?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()
        } ?: emptyList()
    }
    
    fun getSuccessMessages(): List<String> {
        val key = if (selectedZone.isEmpty()) "messages_success" else "messages_success_$selectedZone"
        return selectedAction?.let { action ->
            actionsData[action]?.get(key)?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()
        } ?: emptyList()
    }
    
    fun getFailMessages(): List<String> {
        val key = if (selectedZone.isEmpty()) "messages_fail" else "messages_fail_$selectedZone"
        return selectedAction?.let { action ->
            actionsData[action]?.get(key)?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()
        } ?: emptyList()
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
                Text("🎬 Actions & GIFs", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        if (isLoading) {
            item {
                Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (actionsData.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Movie, null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                        Spacer(Modifier.height(16.dp))
                        Text("Aucune action configurée", color = Color.Gray)
                    }
                }
            }
        } else {
            // Action selector
            item {
                var expanded by remember { mutableStateOf(false) }
                
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedAction ?: "-- Sélectionner une action --",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Action") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        actionsData.keys.sorted().forEach { action ->
                            DropdownMenuItem(
                                text = { Text(action) },
                                onClick = {
                                    selectedAction = action
                                    selectedZone = ""
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }
            
            // When action is selected
            if (selectedAction != null) {
                // Zone selector
                item {
                    var expanded by remember { mutableStateOf(false) }
                    val zones = getZones()
                    
                    Column {
                        Text("Zone cible", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(8.dp))
                        
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it }
                        ) {
                            OutlinedTextField(
                                value = if (selectedZone.isEmpty()) "Général (toutes zones)" else selectedZone,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Général (toutes zones)") },
                                    onClick = {
                                        selectedZone = ""
                                        expanded = false
                                    }
                                )
                                zones.forEach { zone ->
                                    DropdownMenuItem(
                                        text = { Text(zone) },
                                        onClick = {
                                            selectedZone = zone
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
                
                // Tabs
                item {
                    ScrollableTabRow(
                        selectedTabIndex = currentTab,
                        containerColor = Color(0xFF1E1E1E),
                        edgePadding = 0.dp
                    ) {
                        Tab(selected = currentTab == 0, onClick = { currentTab = 0 }, text = { Text("📍 Zones") })
                        Tab(selected = currentTab == 1, onClick = { currentTab = 1 }, text = { Text("✅ GIFs Success") })
                        Tab(selected = currentTab == 2, onClick = { currentTab = 2 }, text = { Text("❌ GIFs Fail") })
                        Tab(selected = currentTab == 3, onClick = { currentTab = 3 }, text = { Text("💬 Messages") })
                    }
                }
                
                // Tab content
                when (currentTab) {
                    0 -> {
                        // Zones management
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("Ajouter une zone", style = MaterialTheme.typography.titleMedium)
                                    Spacer(Modifier.height(8.dp))
                                    
                                    OutlinedTextField(
                                        value = newZone,
                                        onValueChange = { newZone = it },
                                        label = { Text("Zone (ex: seins, fesses, cou...)") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    
                                    Button(
                                        onClick = {
                                            if (newZone.isNotBlank()) {
                                                val action = selectedAction ?: return@Button
                                                val currentData = actionsData[action] ?: buildJsonObject {}
                                                val zones = currentData["zones"]?.jsonArray?.toMutableList() ?: mutableListOf()
                                                zones.add(JsonPrimitive(newZone.trim()))
                                                
                                                actionsData = actionsData + (action to buildJsonObject {
                                                    currentData.forEach { (k, v) -> put(k, v) }
                                                    putJsonArray("zones") { zones.forEach { add(it) } }
                                                })
                                                newZone = ""
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        enabled = newZone.isNotBlank()
                                    ) {
                                        Icon(Icons.Default.Add, null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Ajouter")
                                    }
                                }
                            }
                        }
                        
                        // Display zones
                        val zones = getZones()
                        if (zones.isNotEmpty()) {
                            items(zones) { zone ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(zone, modifier = Modifier.weight(1f))
                                        IconButton(onClick = {
                                            val action = selectedAction ?: return@IconButton
                                            val currentData = actionsData[action] ?: buildJsonObject {}
                                            val zones = currentData["zones"]?.jsonArray?.toMutableList() ?: mutableListOf()
                                            zones.removeAll { it.jsonPrimitive.content == zone }
                                            
                                            actionsData = actionsData + (action to buildJsonObject {
                                                currentData.forEach { (k, v) -> if (k != "zones") put(k, v) }
                                                putJsonArray("zones") { zones.forEach { add(it) } }
                                            })
                                        }) {
                                            Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    1, 2 -> {
                        // GIFs Success/Fail
                        val isSuccess = currentTab == 1
                        val gifs = if (isSuccess) getSuccessGifs() else getFailGifs()
                        
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(
                                        if (isSuccess) "Ajouter GIFs de succès" else "Ajouter GIFs d'échec",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    
                                    OutlinedTextField(
                                        value = if (isSuccess) newSuccessGifs else newFailGifs,
                                        onValueChange = { if (isSuccess) newSuccessGifs = it else newFailGifs = it },
                                        label = { Text("URLs (un par ligne)") },
                                        modifier = Modifier.fillMaxWidth().height(120.dp),
                                        maxLines = 5
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    
                                    Button(
                                        onClick = {
                                            val urls = (if (isSuccess) newSuccessGifs else newFailGifs)
                                                .split("\n")
                                                .map { it.trim() }
                                                .filter { it.isNotBlank() }
                                            
                                            if (urls.isNotEmpty()) {
                                                val action = selectedAction ?: return@Button
                                                val key = if (selectedZone.isEmpty()) {
                                                    if (isSuccess) "success" else "fail"
                                                } else {
                                                    if (isSuccess) "success_$selectedZone" else "fail_$selectedZone"
                                                }
                                                
                                                val currentData = actionsData[action] ?: buildJsonObject {}
                                                val currentGifs = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                                urls.forEach { currentGifs.add(JsonPrimitive(it)) }
                                                
                                                actionsData = actionsData + (action to buildJsonObject {
                                                    currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                    putJsonArray(key) { currentGifs.forEach { add(it) } }
                                                })
                                                
                                                if (isSuccess) newSuccessGifs = "" else newFailGifs = ""
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Add, null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Ajouter")
                                    }
                                }
                            }
                        }
                        
                        if (gifs.isNotEmpty()) {
                            items(gifs) { gif ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                                ) {
                                    Column(Modifier.padding(12.dp)) {
                                        AsyncImage(
                                            model = gif,
                                            contentDescription = null,
                                            modifier = Modifier.fillMaxWidth().height(150.dp)
                                        )
                                        Spacer(Modifier.height(8.dp))
                                        Text(
                                            gif,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.Gray,
                                            maxLines = 2
                                        )
                                        Spacer(Modifier.height(8.dp))
                                        Button(
                                            onClick = {
                                                val action = selectedAction ?: return@Button
                                                val key = if (selectedZone.isEmpty()) {
                                                    if (isSuccess) "success" else "fail"
                                                } else {
                                                    if (isSuccess) "success_$selectedZone" else "fail_$selectedZone"
                                                }
                                                
                                                val currentData = actionsData[action] ?: buildJsonObject {}
                                                val currentGifs = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                                currentGifs.removeAll { it.jsonPrimitive.content == gif }
                                                
                                                actionsData = actionsData + (action to buildJsonObject {
                                                    currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                    putJsonArray(key) { currentGifs.forEach { add(it) } }
                                                })
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Icon(Icons.Default.Delete, null)
                                            Spacer(Modifier.width(8.dp))
                                            Text("Supprimer")
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    3 -> {
                        // Messages
                        val successMessages = getSuccessMessages()
                        val failMessages = getFailMessages()
                        
                        // Success messages
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("💬 Messages de succès", style = MaterialTheme.typography.titleMedium, color = Color(0xFF57F287))
                                    Spacer(Modifier.height(8.dp))
                                    
                                    OutlinedTextField(
                                        value = newSuccessMessage,
                                        onValueChange = { newSuccessMessage = it },
                                        label = { Text("Message") },
                                        modifier = Modifier.fillMaxWidth(),
                                        maxLines = 3
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    
                                    Button(
                                        onClick = {
                                            if (newSuccessMessage.isNotBlank()) {
                                                val action = selectedAction ?: return@Button
                                                val key = if (selectedZone.isEmpty()) "messages_success" else "messages_success_$selectedZone"
                                                
                                                val currentData = actionsData[action] ?: buildJsonObject {}
                                                val messages = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                                messages.add(JsonPrimitive(newSuccessMessage.trim()))
                                                
                                                actionsData = actionsData + (action to buildJsonObject {
                                                    currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                    putJsonArray(key) { messages.forEach { add(it) } }
                                                })
                                                newSuccessMessage = ""
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Add, null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Ajouter")
                                    }
                                }
                            }
                        }
                        
                        if (successMessages.isNotEmpty()) {
                            items(successMessages) { message ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1a3a1a))
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(message, modifier = Modifier.weight(1f), color = Color(0xFF57F287))
                                        IconButton(onClick = {
                                            val action = selectedAction ?: return@IconButton
                                            val key = if (selectedZone.isEmpty()) "messages_success" else "messages_success_$selectedZone"
                                            val currentData = actionsData[action] ?: buildJsonObject {}
                                            val messages = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                            messages.removeAll { it.jsonPrimitive.content == message }
                                            
                                            actionsData = actionsData + (action to buildJsonObject {
                                                currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                putJsonArray(key) { messages.forEach { add(it) } }
                                            })
                                        }) {
                                            Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Fail messages
                        item {
                            Spacer(Modifier.height(16.dp))
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("💬 Messages d'échec", style = MaterialTheme.typography.titleMedium, color = Color(0xFFED4245))
                                    Spacer(Modifier.height(8.dp))
                                    
                                    OutlinedTextField(
                                        value = newFailMessage,
                                        onValueChange = { newFailMessage = it },
                                        label = { Text("Message") },
                                        modifier = Modifier.fillMaxWidth(),
                                        maxLines = 3
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    
                                    Button(
                                        onClick = {
                                            if (newFailMessage.isNotBlank()) {
                                                val action = selectedAction ?: return@Button
                                                val key = if (selectedZone.isEmpty()) "messages_fail" else "messages_fail_$selectedZone"
                                                
                                                val currentData = actionsData[action] ?: buildJsonObject {}
                                                val messages = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                                messages.add(JsonPrimitive(newFailMessage.trim()))
                                                
                                                actionsData = actionsData + (action to buildJsonObject {
                                                    currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                    putJsonArray(key) { messages.forEach { add(it) } }
                                                })
                                                newFailMessage = ""
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Add, null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Ajouter")
                                    }
                                }
                            }
                        }
                        
                        if (failMessages.isNotEmpty()) {
                            items(failMessages) { message ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF3a1a1a))
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(message, modifier = Modifier.weight(1f), color = Color(0xFFED4245))
                                        IconButton(onClick = {
                                            val action = selectedAction ?: return@IconButton
                                            val key = if (selectedZone.isEmpty()) "messages_fail" else "messages_fail_$selectedZone"
                                            val currentData = actionsData[action] ?: buildJsonObject {}
                                            val messages = currentData[key]?.jsonArray?.toMutableList() ?: mutableListOf()
                                            messages.removeAll { it.jsonPrimitive.content == message }
                                            
                                            actionsData = actionsData + (action to buildJsonObject {
                                                currentData.forEach { (k, v) -> if (k != key) put(k, v) }
                                                putJsonArray(key) { messages.forEach { add(it) } }
                                            })
                                        }) {
                                            Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Save button
                item {
                    var isSaving by remember { mutableStateOf(false) }
                    
                    Button(
                        onClick = {
                            isSaving = true
                            // Saving will be handled when this composable recomposes
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5865F2)),
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
                            Text("Sauvegarder", fontWeight = FontWeight.Bold)
                        }
                    }
                    
                    LaunchedEffect(isSaving) {
                        if (isSaving) {
                            saveAction()
                            isSaving = false
                        }
                    }
                }
            }
        }
    }
}
