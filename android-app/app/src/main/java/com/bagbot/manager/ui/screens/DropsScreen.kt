package com.bagbot.manager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.safeBooleanOrFalse
import com.bagbot.manager.safeIntOrZero
import com.bagbot.manager.safeStringOrEmpty
import com.bagbot.manager.ui.components.ChannelSelector
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

@Composable
fun DropsScreen(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val drops = configData?.get("drops") as? JsonObject
    var enabled by remember { mutableStateOf(drops?.get("enabled").safeBooleanOrFalse()) }
    var channelId by remember { mutableStateOf(drops?.get("channelId").safeStringOrEmpty()) }
    var intervalValue by remember { mutableStateOf((drops?.get("intervalValue").safeIntOrZero().takeIf { it > 0 } ?: 1).toString()) }
    var intervalUnit by remember { mutableStateOf((drops?.get("intervalUnit").safeStringOrEmpty().ifBlank { "hours" })) } // hours|days

    val types = drops?.get("types") as? JsonObject
    val xp = types?.get("xp") as? JsonObject
    val money = types?.get("money") as? JsonObject

    var xpEnabled by remember { mutableStateOf(xp?.get("enabled").safeBooleanOrFalse()) }
    var xpMin by remember { mutableStateOf((xp?.get("min").safeIntOrZero().takeIf { it > 0 } ?: 5).toString()) }
    var xpMax by remember { mutableStateOf((xp?.get("max").safeIntOrZero().takeIf { it > 0 } ?: 25).toString()) }

    var moneyEnabled by remember { mutableStateOf(money?.get("enabled").safeBooleanOrFalse()) }
    var moneyMin by remember { mutableStateOf((money?.get("min").safeIntOrZero().takeIf { it > 0 } ?: 10).toString()) }
    var moneyMax by remember { mutableStateOf((money?.get("max").safeIntOrZero().takeIf { it > 0 } ?: 100).toString()) }

    var saving by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "🎁 Drops Automatiques",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                "Configuration des drops XP / Argent automatiques",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray
            )
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
                Column(Modifier.padding(16.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                    ) {
                        Text("Activé", color = Color.White, fontWeight = FontWeight.SemiBold)
                        Switch(checked = enabled, onCheckedChange = { enabled = it })
                    }
                    Spacer(Modifier.height(10.dp))

                    ChannelSelector(
                        channels = channels,
                        selectedChannelId = channelId.takeIf { it.isNotBlank() },
                        onChannelSelected = { channelId = it },
                        label = "Salon des drops"
                    )
                    Spacer(Modifier.height(10.dp))

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = intervalValue,
                            onValueChange = { intervalValue = it },
                            label = { Text("Délai") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                        )

                        Box(Modifier.weight(1f)) {
                            var expanded by remember { mutableStateOf(false) }
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.fillMaxWidth().height(56.dp)
                            ) {
                                Text(if (intervalUnit == "days") "Jours" else "Heures", modifier = Modifier.weight(1f))
                                Icon(Icons.Default.ArrowDropDown, null)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                DropdownMenuItem(text = { Text("Heures") }, onClick = { intervalUnit = "hours"; expanded = false })
                                DropdownMenuItem(text = { Text("Jours") }, onClick = { intervalUnit = "days"; expanded = false })
                            }
                        }
                    }
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
                Column(Modifier.padding(16.dp)) {
                    Text("✨ Drop XP", color = Color.White, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text("Activé", color = Color.White)
                        Switch(checked = xpEnabled, onCheckedChange = { xpEnabled = it })
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(xpMin, { xpMin = it }, label = { Text("Min") }, modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
                        OutlinedTextField(xpMax, { xpMax = it }, label = { Text("Max") }, modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
                    }
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
                Column(Modifier.padding(16.dp)) {
                    Text("💰 Drop Argent", color = Color.White, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text("Activé", color = Color.White)
                        Switch(checked = moneyEnabled, onCheckedChange = { moneyEnabled = it })
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(moneyMin, { moneyMin = it }, label = { Text("Min") }, modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
                        OutlinedTextField(moneyMax, { moneyMax = it }, label = { Text("Max") }, modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number))
                    }
                }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        saving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("enabled", enabled)
                                    put("channelId", channelId)
                                    put("intervalValue", intervalValue.toIntOrNull() ?: 1)
                                    put("intervalUnit", intervalUnit)
                                    putJsonObject("types") {
                                        putJsonObject("xp") {
                                            put("enabled", xpEnabled)
                                            put("min", xpMin.toIntOrNull() ?: 5)
                                            put("max", xpMax.toIntOrNull() ?: (xpMin.toIntOrNull() ?: 5))
                                        }
                                        putJsonObject("money") {
                                            put("enabled", moneyEnabled)
                                            put("min", moneyMin.toIntOrNull() ?: 10)
                                            put("max", moneyMax.toIntOrNull() ?: (moneyMin.toIntOrNull() ?: 10))
                                        }
                                    }
                                }
                                api.putJson("/api/configs/drops", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Drops sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { saving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !saving
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Drops")
                }
            }
        }
    }
}

