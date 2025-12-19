package com.bagbot.manager.ui.screens.config

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.material3.ExperimentalMaterial3Api
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
// DISBOARD - Système de rappels Disboard
// ============================================================================
@Composable
fun DisboardConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var remindersEnabled by remember { mutableStateOf(false) }
    var remindChannelId by remember { mutableStateOf("") }
    var lastBumpAt by remember { mutableStateOf<Long?>(null) }
    var reminded by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val disboardData = allConfigs["disboard"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (disboardData != null) {
                        remindersEnabled = disboardData["remindersEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        remindChannelId = disboardData["remindChannelId"]?.jsonPrimitive?.contentOrNull ?: ""
                        lastBumpAt = disboardData["lastBumpAt"]?.jsonPrimitive?.longOrNull
                        reminded = disboardData["reminded"]?.jsonPrimitive?.booleanOrNull ?: false
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
                Text("📢 Disboard", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Campaign,
                color = Color(0xFF4169E1),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                put("remindersEnabled", remindersEnabled)
                                put("remindChannelId", remindChannelId)
                            }
                            api.putJson("/api/configs/disboard", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                ConfigSwitch(
                    label = "Rappels automatiques activés",
                    checked = remindersEnabled,
                    onCheckedChange = { remindersEnabled = it }
                )
                Spacer(Modifier.height(16.dp))
                
                ChannelSelector(
                    channels = channels,
                    selectedChannelId = remindChannelId,
                    onChannelSelected = { remindChannelId = it },
                    label = "Channel de rappel"
                )
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("État (Lecture seule)", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(Modifier.padding(16.dp)) {
                        if (lastBumpAt != null) {
                            Text(
                                "Dernier bump: ${java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(java.util.Date(lastBumpAt!!))}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        } else {
                            Text(
                                "Dernier bump: Jamais",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Rappel envoyé: ${if (reminded) "✅ Oui" else "❌ Non"}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}

// ============================================================================
// COUNTING - Système de comptage
// ============================================================================
@Composable
fun CountingConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var countChannels by remember { mutableStateOf<List<String>>(emptyList()) }
    var formulasAllowed by remember { mutableStateOf(false) }
    var currentCount by remember { mutableStateOf(0) }
    var lastUserId by remember { mutableStateOf<String?>(null) }
    var achievedNumbers by remember { mutableStateOf<List<Int>>(emptyList()) }
    var selectedChannelToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val countingData = allConfigs["counting"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (countingData != null) {
                        countChannels = countingData["channels"]?.jsonArray?.mapNotNull {
                            it.jsonPrimitive.contentOrNull
                        } ?: emptyList()
                        formulasAllowed = countingData["formulasAllowed"]?.jsonPrimitive?.booleanOrNull ?: false
                        currentCount = countingData["current"]?.jsonPrimitive?.intOrNull ?: 0
                        lastUserId = countingData["lastUserId"]?.jsonPrimitive?.contentOrNull
                        achievedNumbers = countingData["achievedNumbers"]?.jsonArray?.mapNotNull {
                            it.jsonPrimitive.intOrNull
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
                Text("🔢 Comptage", style = MaterialTheme.typography.headlineMedium)
            }
        }
        
        item {
            ConfigSection(
                title = "Configuration",
                icon = Icons.Default.Calculate,
                color = Color(0xFF00D4FF),
                onSave = {
                    withContext(Dispatchers.IO) {
                        try {
                            val updates = buildJsonObject {
                                putJsonArray("channels") {
                                    countChannels.forEach { add(it) }
                                }
                                put("formulasAllowed", formulasAllowed)
                            }
                            api.putJson("/api/configs/counting", updates.toString())
                            Result.success("✅ Sauvegardé")
                        } catch (e: Exception) {
                            Result.failure(e)
                        }
                    }
                }
            ) {
                Text("Channels de comptage (${countChannels.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                countChannels.forEach { channelId ->
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
                                countChannels = countChannels.filter { it != channelId }
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
                            if (!countChannels.contains(it)) {
                                countChannels = countChannels + it
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
                
                ConfigSwitch(
                    label = "Formules mathématiques autorisées",
                    checked = formulasAllowed,
                    onCheckedChange = { formulasAllowed = it }
                )
                
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(16.dp))
                
                Text("État (Lecture seule)", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(
                            "Nombre actuel: $currentCount",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color(0xFFFFD700)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Nombres atteints: ${achievedNumbers.size}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}

// ============================================================================
// ACTION/VERITE - Système Action ou Vérité
// ============================================================================
@Composable
fun TruthDareConfigScreen(
    api: ApiClient,
    channels: Map<String, String>,
    json: Json,
    onBack: () -> Unit
) {
    var sfwChannels by remember { mutableStateOf<List<String>>(emptyList()) }
    var nsfwChannels by remember { mutableStateOf<List<String>>(emptyList()) }
    var prompts by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var currentMode by remember { mutableStateOf("sfw") }
    var currentType by remember { mutableStateOf("action") }
    var newPrompt by remember { mutableStateOf("") }
    var selectedChannelToAdd by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val response = api.getJson("/api/configs")
                val allConfigs = json.parseToJsonElement(response).jsonObject
                val tdData = allConfigs["truthdare"]?.jsonObject
                withContext(Dispatchers.Main) {
                    if (tdData != null) {
                        sfwChannels = tdData["sfw"]?.jsonObject?.get("channels")?.jsonArray?.mapNotNull {
                            it.jsonPrimitive.contentOrNull
                        } ?: emptyList()
                        nsfwChannels = tdData["nsfw"]?.jsonObject?.get("channels")?.jsonArray?.mapNotNull {
                            it.jsonPrimitive.contentOrNull
                        } ?: emptyList()
                        
                        val promptsMap = mutableMapOf<String, List<String>>()
                        tdData["prompts"]?.jsonObject?.forEach { (key, value) ->
                            promptsMap[key] = value.jsonArray.mapNotNull { it.jsonPrimitive.contentOrNull }
                        }
                        prompts = promptsMap
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
                Text("🎲 Action ou Vérité", style = MaterialTheme.typography.headlineMedium)
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { currentType = "action" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (currentType == "action") Color(0xFF9C27B0) else Color(0xFF2A2A2A)
                    )
                ) {
                    Text("Action")
                }
                Button(
                    onClick = { currentType = "verite" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (currentType == "verite") Color(0xFF2196F3) else Color(0xFF2A2A2A)
                    )
                ) {
                    Text("Vérité")
                }
            }
        }
        
        item {
            val channelsList = if (currentMode == "sfw") sfwChannels else nsfwChannels
            
            ConfigSection(
                title = "Channels ${currentMode.uppercase()}",
                icon = Icons.Default.QuestionMark,
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
                                putJsonObject("prompts") {
                                    prompts.forEach { (key, list) ->
                                        putJsonArray(key) {
                                            list.forEach { add(it) }
                                        }
                                    }
                                }
                            }
                            api.putJson("/api/configs/truthdare", updates.toString())
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
                
                val promptKey = "${currentMode}_${currentType}"
                val currentPrompts = prompts[promptKey] ?: emptyList()
                
                Text("Prompts $currentType (${currentPrompts.size})", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                
                currentPrompts.forEach { prompt ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(prompt, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                prompts = prompts + (promptKey to currentPrompts.filter { it != prompt })
                            }) {
                                Icon(Icons.Default.Delete, "Supprimer", tint = Color.Red)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                
                ConfigTextField(
                    label = "Ajouter un prompt",
                    value = newPrompt,
                    onValueChange = { newPrompt = it },
                    placeholder = "Ex: Fais 10 pompes...",
                    multiline = true
                )
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        if (newPrompt.isNotBlank()) {
                            prompts = prompts + (promptKey to (currentPrompts + newPrompt))
                            newPrompt = ""
                        }
                    },
                    enabled = newPrompt.isNotBlank(),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Ajouter le prompt")
                }
            }
        }
    }
}
