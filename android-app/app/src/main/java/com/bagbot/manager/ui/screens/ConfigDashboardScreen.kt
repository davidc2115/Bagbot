@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.bagbot.manager.ui.screens

import android.util.Log
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed as itemsIndexedGrid
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.ChannelSelector
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.ui.components.RoleSelector
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private const val TAG = "BAG_CONFIG"

private enum class DashTab(val label: String) {
    Economy("💰 Économie"),
    Levels("📈 Niveaux"),
    Booster("🚀 Booster"),
    Counting("🔢 Comptage"),
    TruthDare("🎲 A/V"),
    Actions("🎬 Actions"),
    Tickets("🎫 Tickets"),
    Logs("📝 Logs"),
    Confess("💬 Confess"),
    Welcome("👋 Welcome"),
    Goodbye("😢 Goodbye"),
    Staff("👥 Staff"),
    AutoKick("👢 AutoKick"),
    Inactivity("⏰ Inactivité"),
    AutoThread("🧵 AutoThread"),
    Disboard("📢 Disboard"),
    Geo("🌍 Géo"),
    Backups("💾 Backups"),
    Control("🎮 Contrôle"),
    Music("🎵 Musique"),
    Raw("🧾 JSON Brut"),
}

@Composable
fun ConfigDashboardScreen(
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState,
    isLoading: Boolean,
    onReloadConfig: () -> Unit,
) {
    var tabIndex by remember { mutableIntStateOf(0) }
    val tabs = remember { DashTab.entries }

    Column(Modifier.fillMaxSize()) {
        // Header actions
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "⚙️ Configuration (dashboard)",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    "${members.size} membres • ${channels.size} salons • ${roles.size} rôles",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }
            IconButton(onClick = onReloadConfig, enabled = !isLoading) {
                Icon(Icons.Default.Refresh, contentDescription = "Recharger", tint = Color.White)
            }
        }

        ScrollableTabRow(
            selectedTabIndex = tabIndex,
            edgePadding = 12.dp,
            containerColor = Color(0xFF121212),
            contentColor = Color.White
        ) {
            tabs.forEachIndexed { idx, t ->
                Tab(
                    selected = tabIndex == idx,
                    onClick = { tabIndex = idx },
                    text = { Text(t.label, maxLines = 1) }
                )
            }
        }

        if (isLoading && configData == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        when (tabs[tabIndex]) {
            DashTab.Economy -> EconomyConfigTab(configData, api, json, scope, snackbar)
            DashTab.Levels -> LevelsConfigTab(configData, roles, api, json, scope, snackbar)
            DashTab.Booster -> BoosterConfigTab(configData, roles, api, json, scope, snackbar)
            DashTab.Counting -> CountingConfigTab(configData, channels, api, json, scope, snackbar)
            DashTab.TruthDare -> TruthDareConfigTab(channels, api, json, scope, snackbar)
            DashTab.Actions -> ActionsConfigTab(configData, api, json, scope, snackbar)
            DashTab.Tickets -> TicketsConfigTab(configData, channels, roles, api, json, scope, snackbar)
            DashTab.Logs -> LogsConfigTab(configData, members, channels, roles, api, json, scope, snackbar)
            DashTab.Confess -> ConfessConfigTab(configData, channels, api, json, scope, snackbar)
            DashTab.Welcome -> WelcomeConfigTab(api, json, channels, scope, snackbar)
            DashTab.Goodbye -> GoodbyeConfigTab(api, json, channels, scope, snackbar)
            DashTab.Staff -> StaffConfigTab(configData, roles, api, json, scope, snackbar)
            DashTab.AutoKick -> AutoKickConfigTab(configData, roles, api, json, scope, snackbar)
            DashTab.Inactivity -> InactivityConfigTab(members, roles, api, json, scope, snackbar)
            DashTab.AutoThread -> AutoThreadConfigTab(configData, channels, api, json, scope, snackbar)
            DashTab.Disboard -> DisboardConfigTab(configData, channels, api, json, scope, snackbar)
            DashTab.Geo -> GeoConfigTab(configData, members)
            DashTab.Backups -> BackupsTab(api, json, scope, snackbar)
            DashTab.Control -> ControlTab(api, json, scope, snackbar)
            DashTab.Music -> MusicTab(api, json, scope, snackbar)
            DashTab.Raw -> RawConfigTab(configData, json)
        }
    }
}

// ------------------------
// Helpers
// ------------------------

private fun JsonObject.obj(key: String): JsonObject? = this[key]?.jsonObject
private fun JsonObject.arr(key: String): JsonArray? = this[key]?.jsonArray
private fun JsonObject.str(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull
private fun JsonObject.bool(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull
private fun JsonObject.int(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull
private fun JsonObject.double(key: String): Double? = this[key]?.jsonPrimitive?.doubleOrNull

@Composable
private fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White)
            if (!subtitle.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun RemovableIdRow(
    label: String,
    id: String,
    resolvedName: String?,
    onRemove: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, color = Color.White, fontWeight = FontWeight.SemiBold)
            Text(
                resolvedName ?: id,
                color = Color.Gray,
                style = MaterialTheme.typography.bodySmall
            )
        }
        IconButton(onClick = onRemove) {
            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
        }
    }
}

private suspend fun postOrPutSection(
    api: ApiClient,
    json: Json,
    primaryPostPath: String,
    primaryBody: JsonObject,
    fallbackSectionKey: String,
    fallbackSectionBody: JsonObject,
) {
    try {
        api.postJson(primaryPostPath, json.encodeToString(JsonObject.serializer(), primaryBody))
    } catch (e: Exception) {
        Log.w(TAG, "POST failed ($primaryPostPath): ${e.message} -> fallback PUT /api/configs/$fallbackSectionKey")
        api.putJson("/api/configs/$fallbackSectionKey", json.encodeToString(JsonObject.serializer(), fallbackSectionBody))
    }
}

// ------------------------
// Tabs
// ------------------------

@Composable
private fun EconomyConfigTab(
    configData: JsonObject?,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val settings = eco?.obj("settings")
    val currency = eco?.obj("currency")
    val actionsConfig = eco?.obj("actions")?.obj("config")

    var emoji by remember { mutableStateOf(settings?.str("emoji") ?: "💰") }
    var currencyName by remember { mutableStateOf(currency?.str("name") ?: "BAG$") }

    // Cooldowns (settings.cooldowns: object of key -> seconds)
    val initialCooldowns = remember(settings) {
        settings?.obj("cooldowns")?.mapValues { it.value.jsonPrimitive.intOrNull ?: 0 } ?: emptyMap()
    }
    var cooldowns by remember(initialCooldowns) { mutableStateOf(initialCooldowns) }
    var selectedCooldownAction by remember {
        mutableStateOf(cooldowns.keys.sorted().firstOrNull())
    }
    var selectedCooldownValue by remember { mutableStateOf("") }
    var newCooldownKey by remember { mutableStateOf("") }
    var newCooldownValue by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var cooldownPickerOpen by remember { mutableStateOf(false) }

    // Actions config (actCfg)
    val actionNames = remember(actionsConfig, cooldowns) {
        val a = actionsConfig?.keys ?: emptySet()
        val c = cooldowns.keys
        (a + c).toList().distinct().sorted()
    }
    var selectedAction by remember { mutableStateOf(actionNames.firstOrNull()) }
    var actionPickerOpen by remember { mutableStateOf(false) }

    // Champs action (comme dashboard)
    var moneyMin by remember { mutableStateOf("") }
    var moneyMax by remember { mutableStateOf("") }
    var karma by remember { mutableStateOf("none") } // none|charm|perversion
    var karmaDelta by remember { mutableStateOf("") }
    var xpDelta by remember { mutableStateOf("") }
    var successRate by remember { mutableStateOf("") } // 0..1
    var failMoneyMin by remember { mutableStateOf("") }
    var failMoneyMax by remember { mutableStateOf("") }
    var failKarmaDelta by remember { mutableStateOf("") }
    var failXpDelta by remember { mutableStateOf("") }
    var partnerMoneySharePercent by remember { mutableStateOf("") }
    var partnerKarmaSharePercent by remember { mutableStateOf("") }
    var partnerXpSharePercent by remember { mutableStateOf("") }
    var actionCooldownSec by remember { mutableStateOf("") }
    var zonesReadOnly by remember { mutableStateOf("") }

    fun currentActionObj(): JsonObject? =
        selectedAction?.let { actionsConfig?.get(it)?.jsonObject }

    // sync selected cooldown value
    LaunchedEffect(selectedCooldownAction, cooldowns) {
        val key = selectedCooldownAction
        selectedCooldownValue = (key?.let { cooldowns[it] } ?: 0).toString()
    }

    // Sync action fields when selection changes
    LaunchedEffect(selectedAction, actionsConfig) {
        val obj = currentActionObj()
        if (obj == null) {
            moneyMin = "0"
            moneyMax = "0"
            karma = "none"
            karmaDelta = "0"
            xpDelta = "0"
            successRate = "1"
            failMoneyMin = "0"
            failMoneyMax = "0"
            failKarmaDelta = "0"
            failXpDelta = "0"
            partnerMoneySharePercent = "0"
            partnerKarmaSharePercent = "0"
            partnerXpSharePercent = "0"
            actionCooldownSec = "0"
            zonesReadOnly = ""
            return@LaunchedEffect
        }

        moneyMin = (obj["moneyMin"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        moneyMax = (obj["moneyMax"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        karma = obj["karma"]?.jsonPrimitive?.contentOrNull ?: "none"
        karmaDelta = (obj["karmaDelta"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        xpDelta = (obj["xpDelta"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        successRate = (obj["successRate"]?.jsonPrimitive?.doubleOrNull ?: 1.0).toString()

        failMoneyMin = (obj["failMoneyMin"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        failMoneyMax = (obj["failMoneyMax"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        failKarmaDelta = (obj["failKarmaDelta"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        failXpDelta = (obj["failXpDelta"]?.jsonPrimitive?.intOrNull ?: 0).toString()

        partnerMoneySharePercent = ((obj["partnerMoneyShare"]?.jsonPrimitive?.doubleOrNull ?: 0.0) * 100).toString()
        partnerKarmaSharePercent = ((obj["partnerKarmaShare"]?.jsonPrimitive?.doubleOrNull ?: 0.0) * 100).toString()
        partnerXpSharePercent = ((obj["partnerXpShare"]?.jsonPrimitive?.doubleOrNull ?: 0.0) * 100).toString()

        actionCooldownSec = (obj["cooldown"]?.jsonPrimitive?.intOrNull ?: 0).toString()
        zonesReadOnly = obj["zones"]?.jsonArray?.joinToString(", ") { it.jsonPrimitive.contentOrNull ?: "" } ?: ""
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SectionCard(
                title = "💰 Paramètres Économie",
                subtitle = "Emoji + devise + cooldowns (comme le dashboard)"
            ) {
                OutlinedTextField(
                    value = emoji,
                    onValueChange = { emoji = it },
                    label = { Text("Emoji") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = currencyName,
                    onValueChange = { currencyName = it },
                    label = { Text("Devise") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        item {
            SectionCard(
                title = "⏱️ Cooldowns (settings.cooldowns)",
                subtitle = "${cooldowns.size} entrées"
            ) {
                if (actionNames.isEmpty()) {
                    Text("Aucune action disponible", color = Color.Gray)
                } else {
                    Text("Action", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { cooldownPickerOpen = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(selectedCooldownAction ?: "Sélectionner…")
                        }
                        DropdownMenu(
                            expanded = cooldownPickerOpen,
                            onDismissRequest = { cooldownPickerOpen = false },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            actionNames.forEach { a ->
                                DropdownMenuItem(
                                    text = { Text(a) },
                                    onClick = {
                                        selectedCooldownAction = a
                                        cooldownPickerOpen = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = selectedCooldownValue,
                        onValueChange = { selectedCooldownValue = it },
                        label = { Text("Cooldown (sec)") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val k = selectedCooldownAction ?: return@Button
                                val v = selectedCooldownValue.trim().toIntOrNull() ?: 0
                                cooldowns = cooldowns + (k to v)
                            },
                            modifier = Modifier.weight(1f),
                            enabled = selectedCooldownAction != null
                        ) { Text("💾 Appliquer") }

                        OutlinedButton(
                            onClick = {
                                val k = selectedCooldownAction ?: return@OutlinedButton
                                cooldowns = cooldowns - k
                                selectedCooldownAction = cooldowns.keys.sorted().firstOrNull()
                            },
                            modifier = Modifier.weight(1f),
                            enabled = selectedCooldownAction != null
                        ) { Text("🗑️ Supprimer") }
                    }
                }

                Divider(color = Color(0xFF2A2A2A), modifier = Modifier.padding(vertical = 12.dp))

                Text("Ajouter une action manuellement", color = Color.White, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = newCooldownKey,
                    onValueChange = { newCooldownKey = it },
                    label = { Text("Nom action") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = newCooldownValue,
                    onValueChange = { newCooldownValue = it },
                    label = { Text("Cooldown (sec)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val k = newCooldownKey.trim()
                        val v = newCooldownValue.trim().toIntOrNull()
                        if (k.isNotBlank() && v != null) {
                            cooldowns = cooldowns + (k to v)
                            selectedCooldownAction = k
                            newCooldownKey = ""
                            newCooldownValue = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newCooldownKey.isNotBlank() && newCooldownValue.toIntOrNull() != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            SectionCard(
                title = "🎬 Réglages d'action (actCfg)",
                subtitle = "Sélectionnez une action puis modifiez ses paramètres (inclut cooldown)"
            ) {
                if (actionNames.isEmpty()) {
                    Text("Aucune action configurée", color = Color.Gray)
                    return@SectionCard
                }

                Box(Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        onClick = { actionPickerOpen = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(selectedAction ?: "Sélectionner…")
                    }
                    DropdownMenu(
                        expanded = actionPickerOpen,
                        onDismissRequest = { actionPickerOpen = false },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        actionNames.forEach { a ->
                            DropdownMenuItem(
                                text = { Text(a) },
                                onClick = {
                                    selectedAction = a
                                    actionPickerOpen = false
                                }
                            )
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                    Column(Modifier.padding(12.dp)) {
                        Text("✅ Réussite", color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(moneyMin, { moneyMin = it }, label = { Text("Argent Min") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(moneyMax, { moneyMax = it }, label = { Text("Argent Max") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(karma, { karma = it }, label = { Text("Karma (none/charm/perversion)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(karmaDelta, { karmaDelta = it }, label = { Text("Karma Δ") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(xpDelta, { xpDelta = it }, label = { Text("XP") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(successRate, { successRate = it }, label = { Text("Taux Succès (0..1)") }, modifier = Modifier.fillMaxWidth())
                    }
                }

                Spacer(Modifier.height(12.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                    Column(Modifier.padding(12.dp)) {
                        Text("❌ Échec", color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(failMoneyMin, { failMoneyMin = it }, label = { Text("Argent Min (échec)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(failMoneyMax, { failMoneyMax = it }, label = { Text("Argent Max (échec)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(failKarmaDelta, { failKarmaDelta = it }, label = { Text("Karma Δ (échec)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(failXpDelta, { failXpDelta = it }, label = { Text("XP (échec)") }, modifier = Modifier.fillMaxWidth())
                    }
                }

                Spacer(Modifier.height(12.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                    Column(Modifier.padding(12.dp)) {
                        Text("👥 Partenaire (%)", color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(partnerMoneySharePercent, { partnerMoneySharePercent = it }, label = { Text("Argent (%)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(partnerKarmaSharePercent, { partnerKarmaSharePercent = it }, label = { Text("Karma (%)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(partnerXpSharePercent, { partnerXpSharePercent = it }, label = { Text("XP (%)") }, modifier = Modifier.fillMaxWidth())
                    }
                }

                Spacer(Modifier.height(12.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                    Column(Modifier.padding(12.dp)) {
                        Text("⚙️ Autres", color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(actionCooldownSec, { actionCooldownSec = it }, label = { Text("Cooldown (sec)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(zonesReadOnly, { zonesReadOnly = it }, label = { Text("Zones (lecture seule)") }, enabled = false, modifier = Modifier.fillMaxWidth())
                    }
                }

                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        val actionName = selectedAction ?: return@Button
                        scope.launch {
                            isSaving = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val cfgMap = actionsConfig?.toMutableMap() ?: mutableMapOf()
                                    val existing = cfgMap[actionName]?.jsonObject
                                    val updated = (existing?.toMutableMap() ?: mutableMapOf()).apply {
                                        this["moneyMin"] = JsonPrimitive(moneyMin.toIntOrNull() ?: 0)
                                        this["moneyMax"] = JsonPrimitive(moneyMax.toIntOrNull() ?: 0)
                                        this["karma"] = JsonPrimitive(karma.ifBlank { "none" })
                                        this["karmaDelta"] = JsonPrimitive(karmaDelta.toIntOrNull() ?: 0)
                                        this["xpDelta"] = JsonPrimitive(xpDelta.toIntOrNull() ?: 0)
                                        this["successRate"] = JsonPrimitive(successRate.toDoubleOrNull() ?: 1.0)

                                        this["failMoneyMin"] = JsonPrimitive(failMoneyMin.toIntOrNull() ?: 0)
                                        this["failMoneyMax"] = JsonPrimitive(failMoneyMax.toIntOrNull() ?: 0)
                                        this["failKarmaDelta"] = JsonPrimitive(failKarmaDelta.toIntOrNull() ?: 0)
                                        this["failXpDelta"] = JsonPrimitive(failXpDelta.toIntOrNull() ?: 0)

                                        this["partnerMoneyShare"] = JsonPrimitive((partnerMoneySharePercent.toDoubleOrNull() ?: 0.0) / 100.0)
                                        this["partnerKarmaShare"] = JsonPrimitive((partnerKarmaSharePercent.toDoubleOrNull() ?: 0.0) / 100.0)
                                        this["partnerXpShare"] = JsonPrimitive((partnerXpSharePercent.toDoubleOrNull() ?: 0.0) / 100.0)

                                        this["cooldown"] = JsonPrimitive(actionCooldownSec.toIntOrNull() ?: 0)
                                    }
                                    cfgMap[actionName] = JsonObject(updated)

                                    val body = buildJsonObject {
                                        put("config", JsonObject(cfgMap))
                                    }
                                    api.postJson("/api/actions", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) {
                                        snackbar.showSnackbar("✅ Action sauvegardée: $actionName")
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                    }
                                } finally {
                                    withContext(Dispatchers.Main) { isSaving = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = selectedAction != null && !isSaving
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder l'action")
                }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("settings", buildJsonObject {
                                        put("emoji", emoji)
                                        put("cooldowns", buildJsonObject {
                                            cooldowns.forEach { (k, v) -> put(k, v) }
                                        })
                                    })
                                    put("currency", buildJsonObject { put("name", currencyName) })
                                }
                                api.postJson("/api/economy", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) {
                                    snackbar.showSnackbar("✅ Économie sauvegardée")
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    snackbar.showSnackbar("❌ Erreur: ${e.message}")
                                }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Économie")
                }
            }
        }
    }
}

@Composable
private fun LevelsConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val levels = configData?.obj("levels")
    var enabled by remember { mutableStateOf(levels?.bool("enabled") ?: false) }
    var xpMsg by remember { mutableStateOf((levels?.int("xpPerMessage") ?: 10).toString()) }
    var xpVoice by remember { mutableStateOf((levels?.int("xpPerVoiceMinute") ?: 5).toString()) }
    val curve = levels?.obj("levelCurve")
    var curveBase by remember { mutableStateOf((curve?.int("base") ?: 100).toString()) }
    var curveFactor by remember { mutableStateOf((curve?.double("factor") ?: 1.12).toString()) }

    val initialRewards = remember(levels) {
        levels?.obj("rewards")?.mapValues { it.value.jsonPrimitive.contentOrNull ?: "" } ?: emptyMap()
    }
    var rewards by remember(initialRewards) { mutableStateOf(initialRewards) }
    var newRewardLevel by remember { mutableStateOf("") }
    var newRewardRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SectionCard(title = "📈 Niveaux", subtitle = "Config générale + rewards (rôles)") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = xpMsg, onValueChange = { xpMsg = it },
                    label = { Text("XP par message") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = xpVoice, onValueChange = { xpVoice = it },
                    label = { Text("XP par minute vocale") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                Text("Courbe de niveau", color = Color.White, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = curveBase, onValueChange = { curveBase = it },
                    label = { Text("Base") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = curveFactor, onValueChange = { curveFactor = it },
                    label = { Text("Factor") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        item {
            SectionCard(title = "🎁 Rewards (level -> roleId)", subtitle = "${rewards.size} niveaux") {
                rewards.entries.sortedBy { it.key.toIntOrNull() ?: Int.MAX_VALUE }.forEach { (level, roleId) ->
                    RemovableIdRow(
                        label = "Niveau $level",
                        id = roleId,
                        resolvedName = roles[roleId],
                        onRemove = { rewards = rewards - level }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }

                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = newRewardLevel,
                    onValueChange = { newRewardLevel = it },
                    label = { Text("Niveau") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                RoleSelector(
                    roles = roles,
                    selectedRoleId = newRewardRoleId,
                    onRoleSelected = { newRewardRoleId = it },
                    label = "Sélectionner le rôle reward"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val level = newRewardLevel.trim()
                        val roleId = newRewardRoleId
                        if (level.toIntOrNull() != null && roleId != null) {
                            rewards = rewards + (level to roleId)
                            newRewardLevel = ""
                            newRewardRoleId = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newRewardLevel.toIntOrNull() != null && newRewardRoleId != null
                ) { Text("➕ Ajouter / Modifier reward") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("enabled", enabled)
                                    put("xpPerMessage", xpMsg.toIntOrNull() ?: 10)
                                    put("xpPerVoiceMinute", xpVoice.toIntOrNull() ?: 5)
                                    put("levelCurve", buildJsonObject {
                                        put("base", curveBase.toIntOrNull() ?: 100)
                                        put("factor", curveFactor.toDoubleOrNull() ?: 1.12)
                                    })
                                    put("rewards", buildJsonObject {
                                        rewards.forEach { (lvl, roleId) -> put(lvl, roleId) }
                                    })
                                }
                                api.putJson("/api/configs/levels", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Niveaux sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Niveaux")
                }
            }
        }
    }
}

@Composable
private fun BoosterConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val boost = (configData?.obj("boost") ?: eco?.obj("boost")) // tolère les 2 formats

    var enabled by remember { mutableStateOf(boost?.bool("enabled") ?: false) }
    var textXpMult by remember { mutableStateOf((boost?.double("textXpMult") ?: 2.0).toString()) }
    var voiceXpMult by remember { mutableStateOf((boost?.double("voiceXpMult") ?: 2.0).toString()) }
    var actionCooldownMult by remember { mutableStateOf((boost?.double("actionCooldownMult") ?: 0.5).toString()) }
    var shopPriceMult by remember { mutableStateOf((boost?.double("shopPriceMult") ?: 0.5).toString()) }

    val initialRoles = remember(boost) { boost?.arr("roles")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var boosterRoles by remember { mutableStateOf(initialRoles) }
    var newRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🚀 Booster", subtitle = "Multiplicateurs + rôles booster") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(textXpMult, { textXpMult = it }, label = { Text("Text XP Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(voiceXpMult, { voiceXpMult = it }, label = { Text("Voice XP Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(actionCooldownMult, { actionCooldownMult = it }, label = { Text("Action Cooldown Mult") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(shopPriceMult, { shopPriceMult = it }, label = { Text("Shop Price Mult") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "🏷️ Rôles booster (${boosterRoles.size})") {
                boosterRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { boosterRoles = boosterRoles.filterNot { it == rid } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(
                    roles = roles.filterKeys { !boosterRoles.contains(it) },
                    selectedRoleId = newRoleId,
                    onRoleSelected = { newRoleId = it },
                    label = "Ajouter un rôle booster"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { newRoleId?.let { boosterRoles = boosterRoles + it; newRoleId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newRoleId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("boost", buildJsonObject {
                                        put("enabled", enabled)
                                        put("textXpMult", textXpMult.toDoubleOrNull() ?: 2.0)
                                        put("voiceXpMult", voiceXpMult.toDoubleOrNull() ?: 2.0)
                                        put("actionCooldownMult", actionCooldownMult.toDoubleOrNull() ?: 0.5)
                                        put("shopPriceMult", shopPriceMult.toDoubleOrNull() ?: 0.5)
                                        put("roles", JsonArray(boosterRoles.map { JsonPrimitive(it) }))
                                    })
                                }

                                // Le dashboard stocke souvent le boost sous economy.settings/boost; on fait au plus simple: PUT section economy avec boost
                                api.putJson("/api/configs/economy", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Booster sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Booster")
                }
            }
        }
    }
}

@Composable
private fun ActionsConfigTab(
    configData: JsonObject?,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val eco = configData?.obj("economy")
    val actions = eco?.obj("actions")

    val initialGifs = actions?.get("gifs")
    val initialMessages = actions?.get("messages")
    val initialConfig = actions?.get("config")

    val prettyJson = remember { Json { prettyPrint = true } }
    fun pretty(el: JsonElement?): String = try {
        if (el == null) "{}" else prettyJson.encodeToString(JsonElement.serializer(), el)
    } catch (_: Exception) {
        el?.toString() ?: "{}"
    }

    var gifsText by remember { mutableStateOf(pretty(initialGifs)) }
    var messagesText by remember { mutableStateOf(pretty(initialMessages)) }
    var configText by remember { mutableStateOf(pretty(initialConfig)) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(
                title = "🎬 Actions",
                subtitle = "Édition JSON (gifs/messages/config) comme le dashboard web"
            ) {
                Text(
                    "Astuce: colle le JSON complet (objet/array).",
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        item {
            SectionCard(title = "GIFs (economy.actions.gifs)") {
                OutlinedTextField(
                    value = gifsText,
                    onValueChange = { gifsText = it },
                    label = { Text("JSON") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 6
                )
            }
        }
        item {
            SectionCard(title = "Messages (economy.actions.messages)") {
                OutlinedTextField(
                    value = messagesText,
                    onValueChange = { messagesText = it },
                    label = { Text("JSON") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 6
                )
            }
        }
        item {
            SectionCard(title = "Config (economy.actions.config)") {
                OutlinedTextField(
                    value = configText,
                    onValueChange = { configText = it },
                    label = { Text("JSON") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 6
                )
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val gifsEl = json.parseToJsonElement(gifsText)
                                val messagesEl = json.parseToJsonElement(messagesText)
                                val cfgEl = json.parseToJsonElement(configText)
                                val body = buildJsonObject {
                                    put("gifs", gifsEl)
                                    put("messages", messagesEl)
                                    put("config", cfgEl)
                                }
                                api.postJson("/api/actions", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Actions sauvegardées") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur JSON/API: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Actions")
                }
            }
        }
    }
}

@Composable
private fun BackupsTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var backups by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var isRestoring by remember { mutableStateOf(false) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/backups")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val list = obj["backups"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    withContext(Dispatchers.Main) { backups = list }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "💾 Backups", subtitle = "Liste / création / restauration") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { load() }, enabled = !isLoading, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Rafraîchir")
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                isLoading = true
                                withContext(Dispatchers.IO) {
                                    try {
                                        api.postJson("/backup", "{}")
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Backup créé") }
                                        load()
                                    } catch (e: Exception) {
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                    } finally {
                                        withContext(Dispatchers.Main) { isLoading = false }
                                    }
                                }
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("➕ Créer")
                    }
                }
            }
        }

        item {
            if (isLoading) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }

        itemsIndexed(backups) { idx, b ->
            val filename = b["filename"]?.jsonPrimitive?.contentOrNull ?: ""
            val date = b["date"]?.jsonPrimitive?.contentOrNull ?: ""
            val size = b["size"]?.jsonPrimitive?.contentOrNull ?: ""

            SectionCard(title = "${idx + 1}. $filename", subtitle = "$date • $size") {
                Button(
                    onClick = {
                        if (filename.isBlank()) return@Button
                        scope.launch {
                            isRestoring = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject { put("filename", filename) }
                                    api.postJson("/restore", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Backup restauré") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isRestoring = false }
                                }
                            }
                        }
                    },
                    enabled = !isRestoring
                ) {
                    Text(if (isRestoring) "Restauration..." else "Restaurer")
                }
            }
        }
    }
}

@Composable
private fun ControlTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isBusy by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🎮 Contrôle Bot", subtitle = "Restart / Deploy (comme le dashboard)") {
                Text(
                    "Ces actions déclenchent des commandes côté serveur (PM2).",
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isBusy = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("action", "restart") }
                                api.postJson("/bot/control", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Restart demandé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isBusy = false }
                            }
                        }
                    }
                },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text("🔄 Redémarrer le bot") }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isBusy = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("action", "deploy") }
                                api.postJson("/bot/control", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Deploy demandé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isBusy = false }
                            }
                        }
                    }
                },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text("🚀 Déployer les commandes") }
        }
    }
}

@Composable
private fun MusicTab(
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var playlists by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var uploads by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var totalSize by remember { mutableStateOf(0L) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/music")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val pls = obj["playlists"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ups = obj["uploads"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ts = obj["totalSize"]?.jsonPrimitive?.longOrNull ?: 0L
                    withContext(Dispatchers.Main) {
                        playlists = pls
                        uploads = ups
                        totalSize = ts
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🎵 Musique", subtitle = "Playlists & uploads (read-only)") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Total size: $totalSize bytes", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                    IconButton(onClick = { load() }, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Rafraîchir", tint = Color.White)
                    }
                }
            }
        }
        item {
            SectionCard(title = "📚 Playlists (${playlists.size})") {
                playlists.forEach { p ->
                    val name = p["name"]?.jsonPrimitive?.contentOrNull ?: "?"
                    val trackCount = p["trackCount"]?.jsonPrimitive?.intOrNull ?: 0
                    Text("• $name ($trackCount tracks)", color = Color.White)
                }
            }
        }
        item {
            SectionCard(title = "📁 Uploads (${uploads.size})") {
                uploads.take(25).forEach { u ->
                    val fn = u["filename"]?.jsonPrimitive?.contentOrNull ?: "?"
                    val size = u["size"]?.jsonPrimitive?.longOrNull ?: 0L
                    Text("• $fn ($size)", color = Color.White)
                }
                if (uploads.size > 25) {
                    Text("… +${uploads.size - 25} autres", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun CountingConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val counting = configData?.obj("counting")
    var allowFormulas by remember { mutableStateOf(counting?.bool("allowFormulas") ?: false) }
    val initialChannels = remember(counting) {
        counting?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
    }
    var channelIds by remember(initialChannels) { mutableStateOf(initialChannels) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🔢 Comptage", subtitle = "Allow formulas + channels") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Autoriser les formules", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = allowFormulas, onCheckedChange = { allowFormulas = it })
                }
            }
        }

        item {
            SectionCard(title = "📋 Channels", subtitle = "${channelIds.size} configuré(s)") {
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { channelIds = channelIds.filterNot { it == chId } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }

                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        newChannelId?.let { id ->
                            if (!channelIds.contains(id)) channelIds = channelIds + id
                            newChannelId = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter le salon") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("allowFormulas", allowFormulas)
                                    put("channels", JsonArray(channelIds.map { JsonPrimitive(it) }))
                                }
                                api.postJson("/api/counting", json.encodeToString(JsonObject.serializer(), body))
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Comptage sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Comptage")
                }
            }
        }
    }
}

@Composable
private fun TruthDareConfigTab(
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var mode by remember { mutableStateOf("sfw") }
    var isLoading by remember { mutableStateOf(false) }
    var prompts by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var channelIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var newPromptType by remember { mutableStateOf("v") } // v=truth, a=action
    var newPromptText by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/truthdare/$mode")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val p = obj["prompts"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
                    val ch = obj["channels"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    withContext(Dispatchers.Main) {
                        prompts = p
                        channelIds = ch
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(mode) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🎲 A/V", subtitle = "Channels + prompts (SFW / NSFW)") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    TabRow(selectedTabIndex = if (mode == "sfw") 0 else 1) {
                        Tab(selected = mode == "sfw", onClick = { mode = "sfw" }, text = { Text("🟢 SFW") })
                        Tab(selected = mode == "nsfw", onClick = { mode = "nsfw" }, text = { Text("🔴 NSFW") })
                    }
                    IconButton(onClick = { load() }, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Rafraîchir", tint = Color.White)
                    }
                }
            }
        }

        item {
            SectionCard(title = "📋 Channels (${channelIds.size})") {
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = {
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    try {
                                        api.deleteJson("/api/truthdare/$mode/channels/$chId")
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Channel supprimé") }
                                        load()
                                    } catch (e: Exception) {
                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                    }
                                }
                            }
                        }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }

                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val id = newChannelId ?: return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject { put("channelId", id) }
                                    api.postJson("/api/truthdare/$mode/channels", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Channel ajouté") }
                                    withContext(Dispatchers.Main) { newChannelId = null }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            SectionCard(title = "🧠 Prompts (${prompts.size})", subtitle = "Édition rapide (texte) + suppression") {
                if (isLoading) {
                    CircularProgressIndicator()
                } else {
                    prompts.sortedBy { it["id"]?.jsonPrimitive?.intOrNull ?: 0 }.forEach { p ->
                        val id = p["id"]?.jsonPrimitive?.intOrNull ?: 0
                        val type = p["type"]?.jsonPrimitive?.contentOrNull ?: "v"
                        var text by remember(id, mode) { mutableStateOf(p["text"]?.jsonPrimitive?.contentOrNull ?: "") }

                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))) {
                            Column(Modifier.padding(12.dp)) {
                                Text("ID #$id • ${if (type == "a") "Action" else "Vérité"}", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = text,
                                    onValueChange = { text = it },
                                    label = { Text("Texte") },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2
                                )
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                withContext(Dispatchers.IO) {
                                                    try {
                                                        api.putJson(
                                                            "/api/truthdare/$mode/$id",
                                                            json.encodeToString(JsonObject.serializer(), buildJsonObject { put("text", text) })
                                                        )
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Prompt modifié") }
                                                        load()
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                                    }
                                                }
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) { Text("💾 Sauver") }
                                    OutlinedButton(
                                        onClick = {
                                            scope.launch {
                                                withContext(Dispatchers.IO) {
                                                    try {
                                                        api.deleteJson("/api/truthdare/$mode/$id")
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Prompt supprimé") }
                                                        load()
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                                    }
                                                }
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) { Text("🗑️ Supprimer") }
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                }

                Divider(color = Color(0xFF2A2A2A))
                Spacer(Modifier.height(12.dp))
                Text("➕ Ajouter un prompt", color = Color.White, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(
                        onClick = { newPromptType = "v" },
                        label = { Text("Vérité") },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (newPromptType == "v") Color(0xFF2E7D32) else Color(0xFF2A2A2A)
                        )
                    )
                    AssistChip(
                        onClick = { newPromptType = "a" },
                        label = { Text("Action") },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (newPromptType == "a") Color(0xFFB71C1C) else Color(0xFF2A2A2A)
                        )
                    )
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = newPromptText,
                    onValueChange = { newPromptText = it },
                    label = { Text("Texte") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val text = newPromptText.trim()
                        if (text.isBlank()) return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject {
                                        put("type", newPromptType)
                                        put("text", text)
                                    }
                                    api.postJson("/api/truthdare/$mode", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) {
                                        newPromptText = ""
                                        snackbar.showSnackbar("✅ Prompt ajouté")
                                    }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newPromptText.trim().isNotBlank()
                ) { Text("➕ Ajouter prompt") }
            }
        }
    }
}

@Composable
private fun TicketsConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val tickets = configData?.obj("tickets")
    var subTab by remember { mutableIntStateOf(0) } // 0=config, 1=categories, 2=history
    var selectedCategoryIndex by remember { mutableStateOf<Int?>(null) }

    // fields
    var enabled by remember { mutableStateOf(tickets?.bool("enabled") ?: false) }
    var categoryId by remember { mutableStateOf(tickets?.str("categoryId")) }
    var panelChannelId by remember { mutableStateOf(tickets?.str("panelChannelId")) }
    var logChannelId by remember { mutableStateOf(tickets?.str("logChannelId")) }
    var transcriptChannelId by remember { mutableStateOf(tickets?.str("transcriptChannelId")) }
    var pingStaffOnOpen by remember { mutableStateOf(tickets?.bool("pingStaffOnOpen") ?: true) }
    var panelTitle by remember { mutableStateOf(tickets?.str("panelTitle") ?: "🎫 Ouvrir un ticket") }
    var panelText by remember { mutableStateOf(tickets?.str("panelText") ?: "") }
    var bannerUrl by remember { mutableStateOf(tickets?.str("bannerUrl") ?: "") }
    var certifiedRoleId by remember { mutableStateOf(tickets?.str("certifiedRoleId")) }
    var namingMode by remember { mutableStateOf(tickets?.obj("naming")?.str("mode") ?: "custom") }
    var namingPattern by remember { mutableStateOf(tickets?.obj("naming")?.str("customPattern") ?: "{cat}-{user}-{num}") }
    var transcriptStyle by remember { mutableStateOf(tickets?.obj("transcript")?.str("style") ?: "pro") }

    // categories
    val initialCategories = remember(tickets) {
        tickets?.arr("categories")?.mapNotNull { it.jsonObject } ?: emptyList()
    }
    var categories by remember(initialCategories) { mutableStateOf(initialCategories) }

    val records = tickets?.obj("records") ?: buildJsonObject { }
    val recordsCount = records.size
    var isSaving by remember { mutableStateOf(false) }

    // UI
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard(title = "🎫 Tickets", subtitle = "Config / Catégories / Historique") {
            TabRow(selectedTabIndex = subTab) {
                Tab(selected = subTab == 0, onClick = { subTab = 0; selectedCategoryIndex = null }, text = { Text("⚙️ Config") })
                Tab(selected = subTab == 1, onClick = { subTab = 1 }, text = { Text("📁 Catégories") })
                Tab(selected = subTab == 2, onClick = { subTab = 2; selectedCategoryIndex = null }, text = { Text("📋 Historique") })
            }
        }

        when (subTab) {
            0 -> {
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        SectionCard(title = "⚙️ Configuration générale") {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Switch(checked = enabled, onCheckedChange = { enabled = it })
                            }
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, categoryId, { categoryId = it }, label = "Catégorie (ID)")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, panelChannelId, { panelChannelId = it }, label = "Channel du Panel")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, logChannelId, { logChannelId = it }, label = "Channel des logs (tickets)")
                            Spacer(Modifier.height(10.dp))
                            ChannelSelector(channels, transcriptChannelId, { transcriptChannelId = it }, label = "Channel des transcripts")
                            Spacer(Modifier.height(10.dp))
                            RoleSelector(roles, certifiedRoleId, { certifiedRoleId = it }, label = "Rôle Certified")
                            Spacer(Modifier.height(10.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Ping staff à l'ouverture", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Switch(checked = pingStaffOnOpen, onCheckedChange = { pingStaffOnOpen = it })
                            }
                            Spacer(Modifier.height(10.dp))
                            OutlinedTextField(panelTitle, { panelTitle = it }, label = { Text("Titre panel") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(panelText, { panelText = it }, label = { Text("Texte panel") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(bannerUrl, { bannerUrl = it }, label = { Text("Banner URL") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(12.dp))
                            Text("Naming", color = Color.White, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(namingMode, { namingMode = it }, label = { Text("Mode (ex: custom)") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(namingPattern, { namingPattern = it }, label = { Text("Pattern") }, modifier = Modifier.fillMaxWidth())
                            Spacer(Modifier.height(12.dp))
                            OutlinedTextField(transcriptStyle, { transcriptStyle = it }, label = { Text("Transcript style (ex: pro)") }, modifier = Modifier.fillMaxWidth())
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val settings = buildJsonObject {
                                                put("enabled", enabled)
                                                categoryId?.let { put("categoryId", it) }
                                                panelChannelId?.let { put("panelChannelId", it) }
                                                logChannelId?.let { put("logChannelId", it) }
                                                transcriptChannelId?.let { put("transcriptChannelId", it) }
                                                certifiedRoleId?.let { put("certifiedRoleId", it) }
                                                put("pingStaffOnOpen", pingStaffOnOpen)
                                                put("panelTitle", panelTitle)
                                                put("panelText", panelText)
                                                put("bannerUrl", bannerUrl)
                                                put("naming", buildJsonObject {
                                                    put("mode", namingMode)
                                                    put("customPattern", namingPattern)
                                                })
                                                put("transcript", buildJsonObject { put("style", transcriptStyle) })
                                            }

                                            postOrPutSection(
                                                api = api,
                                                json = json,
                                                primaryPostPath = "/api/tickets",
                                                primaryBody = buildJsonObject { put("settings", settings) },
                                                fallbackSectionKey = "tickets",
                                                fallbackSectionBody = settings
                                            )
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Tickets sauvegardés") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Config Tickets")
                            }
                        }
                    }
                }
            }

            1 -> {
                // Toutes les catégories sous forme de vignettes
                if (selectedCategoryIndex == null) {
                    Column(Modifier.fillMaxSize()) {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 160.dp),
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(4.dp)
                        ) {
                            itemsIndexedGrid(categories) { idx, cat ->
                                val key = cat["key"]?.jsonPrimitive?.contentOrNull ?: ""
                                val label = cat["label"]?.jsonPrimitive?.contentOrNull ?: "Catégorie"
                                val emoji = cat["emoji"]?.jsonPrimitive?.contentOrNull ?: "🎫"
                                val staffCount = cat["staffPingRoleIds"]?.jsonArray?.size ?: 0
                                val viewerCount = cat["extraViewerRoleIds"]?.jsonArray?.size ?: 0

                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedCategoryIndex = idx }
                                ) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(emoji, style = MaterialTheme.typography.headlineMedium)
                                        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
                                        Text(key.ifBlank { "(sans key)" }, color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                        Text("📌 $staffCount • 👁️ $viewerCount", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }

                            item {
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            categories = categories + buildJsonObject {
                                                put("key", "nouvelle-categorie")
                                                put("label", "Nouvelle catégorie")
                                                put("emoji", "🎫")
                                                put("description", "")
                                                put("bannerUrl", "")
                                                put("staffPingRoleIds", JsonArray(emptyList()))
                                                put("extraViewerRoleIds", JsonArray(emptyList()))
                                            }
                                            selectedCategoryIndex = categories.size - 1
                                        }
                                ) {
                                    Box(Modifier.padding(14.dp).height(90.dp), contentAlignment = Alignment.Center) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                                            Spacer(Modifier.height(6.dp))
                                            Text("Ajouter", color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    withContext(Dispatchers.IO) {
                                        try {
                                            val catsArr = JsonArray(categories)
                                            postOrPutSection(
                                                api = api,
                                                json = json,
                                                primaryPostPath = "/api/tickets",
                                                primaryBody = buildJsonObject { put("categories", catsArr) },
                                                fallbackSectionKey = "tickets",
                                                fallbackSectionBody = buildJsonObject { put("categories", catsArr) }
                                            )
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Catégories sauvegardées") }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                        } finally {
                                            withContext(Dispatchers.Main) { isSaving = false }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                            else {
                                Icon(Icons.Default.Save, null)
                                Spacer(Modifier.width(8.dp))
                                Text("Sauvegarder Catégories")
                            }
                        }
                    }
                } else {
                    val idx = selectedCategoryIndex!!
                    val cat = categories.getOrNull(idx) ?: buildJsonObject { }

                    var key by remember(idx) { mutableStateOf(cat["key"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var label by remember(idx) { mutableStateOf(cat["label"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var emoji by remember(idx) { mutableStateOf(cat["emoji"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var description by remember(idx) { mutableStateOf(cat["description"]?.jsonPrimitive?.contentOrNull ?: "") }
                    var banner by remember(idx) { mutableStateOf(cat["bannerUrl"]?.jsonPrimitive?.contentOrNull ?: "") }
                    val staffPing = remember(idx) {
                        cat["staffPingRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    }
                    val viewers = remember(idx) {
                        cat["extraViewerRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                    }
                    var staffPingRoleIds by remember(idx) { mutableStateOf(staffPing) }
                    var extraViewerRoleIds by remember(idx) { mutableStateOf(viewers) }
                    var newStaffRoleId by remember { mutableStateOf<String?>(null) }
                    var newViewerRoleId by remember { mutableStateOf<String?>(null) }

                    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(onClick = { selectedCategoryIndex = null }) {
                                    Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                                }
                                Text("Éditer catégorie", color = Color.White, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(48.dp))
                            }
                        }

                        item {
                            SectionCard(title = "📁 Catégorie", subtitle = key.ifBlank { "(sans key)" }) {
                                OutlinedTextField(value = key, onValueChange = { key = it }, label = { Text("Key") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = emoji, onValueChange = { emoji = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(value = banner, onValueChange = { banner = it }, label = { Text("Banner URL") }, modifier = Modifier.fillMaxWidth())
                            }
                        }

                        item {
                            SectionCard(title = "📌 Staff ping roles (${staffPingRoleIds.size})") {
                                staffPingRoleIds.forEach { roleId ->
                                    RemovableIdRow(
                                        label = "Rôle",
                                        id = roleId,
                                        resolvedName = roles[roleId],
                                        onRemove = { staffPingRoleIds = staffPingRoleIds.filterNot { it == roleId } }
                                    )
                                }
                                RoleSelector(
                                    roles = roles.filterKeys { !staffPingRoleIds.contains(it) },
                                    selectedRoleId = newStaffRoleId,
                                    onRoleSelected = { newStaffRoleId = it },
                                    label = "Ajouter un rôle staff ping"
                                )
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    onClick = { newStaffRoleId?.let { staffPingRoleIds = staffPingRoleIds + it; newStaffRoleId = null } },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = newStaffRoleId != null
                                ) { Text("➕ Ajouter") }
                            }
                        }

                        item {
                            SectionCard(title = "👁️ Viewer roles (${extraViewerRoleIds.size})") {
                                extraViewerRoleIds.forEach { roleId ->
                                    RemovableIdRow(
                                        label = "Rôle",
                                        id = roleId,
                                        resolvedName = roles[roleId],
                                        onRemove = { extraViewerRoleIds = extraViewerRoleIds.filterNot { it == roleId } }
                                    )
                                }
                                RoleSelector(
                                    roles = roles.filterKeys { !extraViewerRoleIds.contains(it) },
                                    selectedRoleId = newViewerRoleId,
                                    onRoleSelected = { newViewerRoleId = it },
                                    label = "Ajouter un viewer rôle"
                                )
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    onClick = { newViewerRoleId?.let { extraViewerRoleIds = extraViewerRoleIds + it; newViewerRoleId = null } },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = newViewerRoleId != null
                                ) { Text("➕ Ajouter") }
                            }
                        }

                        item {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { categories = categories.filterIndexed { i, _ -> i != idx }; selectedCategoryIndex = null },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE53935))
                                ) { Text("🗑️ Supprimer") }

                                Button(
                                    onClick = {
                                        val updated = buildJsonObject {
                                            put("key", key)
                                            put("label", label)
                                            put("emoji", emoji)
                                            put("description", description)
                                            put("bannerUrl", banner)
                                            put("staffPingRoleIds", JsonArray(staffPingRoleIds.map { JsonPrimitive(it) }))
                                            put("extraViewerRoleIds", JsonArray(extraViewerRoleIds.map { JsonPrimitive(it) }))
                                        }
                                        categories = categories.mapIndexed { i, old -> if (i == idx) updated else old }
                                        selectedCategoryIndex = null
                                    },
                                    modifier = Modifier.weight(1f)
                                ) { Text("✅ Appliquer") }
                            }
                        }
                    }
                }
            }

            else -> {
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        SectionCard(
                            title = "📋 Historique",
                            subtitle = "$recordsCount enregistrements (read-only)"
                        ) {
                            Text(
                                "Le dashboard web affiche l'historique complet. Ici on montre juste un résumé.",
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LogsConfigTab(
    configData: JsonObject?,
    members: Map<String, String>,
    channels: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val logs = configData?.obj("logs")
    var enabled by remember { mutableStateOf(logs?.bool("enabled") ?: false) }
    var emoji by remember { mutableStateOf(logs?.str("emoji") ?: "📝") }
    var pseudo by remember { mutableStateOf(logs?.bool("pseudo") ?: true) }
    var ignoreBots by remember { mutableStateOf(logs?.obj("filters")?.bool("ignoreBots") ?: true) }

    val categoriesObj = logs?.obj("categories") ?: buildJsonObject { }
    var categories by remember(categoriesObj) {
        mutableStateOf(categoriesObj.mapValues { it.value.jsonPrimitive.booleanOrNull ?: false })
    }
    val channelsObj = logs?.obj("channels") ?: buildJsonObject { }
    var categoryChannels by remember(channelsObj) {
        mutableStateOf(channelsObj.mapValues { it.value.jsonPrimitive.contentOrNull ?: "" })
    }

    val initialIgnoreUsers = remember(logs) { logs?.obj("filters")?.arr("ignoreUsers")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val initialIgnoreChannels = remember(logs) { logs?.obj("filters")?.arr("ignoreChannels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val initialIgnoreRoles = remember(logs) { logs?.obj("filters")?.arr("ignoreRoles")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }

    var ignoreUsers by remember { mutableStateOf(initialIgnoreUsers) }
    var ignoreChannels by remember { mutableStateOf(initialIgnoreChannels) }
    var ignoreRoles by remember { mutableStateOf(initialIgnoreRoles) }

    var newIgnoreUser by remember { mutableStateOf<String?>(null) }
    var newIgnoreChannel by remember { mutableStateOf<String?>(null) }
    var newIgnoreRole by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "📝 Logs", subtitle = "Cats + channels + filtres") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(emoji, { emoji = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Pseudo", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = pseudo, onCheckedChange = { pseudo = it })
                }
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Ignorer les bots", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = ignoreBots, onCheckedChange = { ignoreBots = it })
                }
            }
        }

        item {
            SectionCard(title = "📁 Catégories") {
                categories.keys.sorted().forEach { k ->
                    val checked = categories[k] == true
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(k, color = Color.White)
                        Switch(checked = checked, onCheckedChange = { categories = categories + (k to it) })
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
            }
        }

        item {
            SectionCard(title = "📢 Channels par catégorie") {
                categoryChannels.keys.sorted().forEach { k ->
                    ChannelSelector(
                        channels = channels,
                        selectedChannelId = categoryChannels[k].takeIf { !it.isNullOrBlank() },
                        onChannelSelected = { categoryChannels = categoryChannels + (k to it) },
                        label = "Channel pour $k"
                    )
                    Spacer(Modifier.height(10.dp))
                }
            }
        }

        item {
            SectionCard(title = "🚫 Filtres - Ignorer") {
                Text("👤 Users (${ignoreUsers.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreUsers.forEach { uid ->
                    RemovableIdRow(
                        label = "User",
                        id = uid,
                        resolvedName = members[uid],
                        onRemove = { ignoreUsers = ignoreUsers.filterNot { it == uid } }
                    )
                }
                MemberSelector(
                    members = members.filterKeys { !ignoreUsers.contains(it) },
                    selectedMemberId = newIgnoreUser,
                    onMemberSelected = { newIgnoreUser = it },
                    label = "Ajouter un user à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreUser?.let { ignoreUsers = ignoreUsers + it; newIgnoreUser = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreUser != null
                ) { Text("➕ Ajouter user") }

                Spacer(Modifier.height(12.dp))
                Text("📢 Channels (${ignoreChannels.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreChannels.forEach { chId ->
                    RemovableIdRow(
                        label = "Channel",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { ignoreChannels = ignoreChannels.filterNot { it == chId } }
                    )
                }
                ChannelSelector(
                    channels = channels.filterKeys { !ignoreChannels.contains(it) },
                    selectedChannelId = newIgnoreChannel,
                    onChannelSelected = { newIgnoreChannel = it },
                    label = "Ajouter un channel à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreChannel?.let { ignoreChannels = ignoreChannels + it; newIgnoreChannel = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreChannel != null
                ) { Text("➕ Ajouter channel") }

                Spacer(Modifier.height(12.dp))
                Text("🏷️ Roles (${ignoreRoles.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                ignoreRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Role",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { ignoreRoles = ignoreRoles.filterNot { it == rid } }
                    )
                }
                RoleSelector(
                    roles = roles.filterKeys { !ignoreRoles.contains(it) },
                    selectedRoleId = newIgnoreRole,
                    onRoleSelected = { newIgnoreRole = it },
                    label = "Ajouter un rôle à ignorer"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newIgnoreRole?.let { ignoreRoles = ignoreRoles + it; newIgnoreRole = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newIgnoreRole != null
                ) { Text("➕ Ajouter rôle") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val logsBody = buildJsonObject {
                                    put("enabled", enabled)
                                    put("emoji", emoji)
                                    put("pseudo", pseudo)
                                    put("categories", buildJsonObject { categories.forEach { (k, v) -> put(k, v) } })
                                    put("channels", buildJsonObject { categoryChannels.forEach { (k, v) -> put(k, v) } })
                                    put("filters", buildJsonObject {
                                        put("ignoreBots", ignoreBots)
                                        put("ignoreUsers", JsonArray(ignoreUsers.map { JsonPrimitive(it) }))
                                        put("ignoreChannels", JsonArray(ignoreChannels.map { JsonPrimitive(it) }))
                                        put("ignoreRoles", JsonArray(ignoreRoles.map { JsonPrimitive(it) }))
                                    })
                                }

                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/logs",
                                    primaryBody = buildJsonObject { put("logs", logsBody) },
                                    fallbackSectionKey = "logs",
                                    fallbackSectionBody = logsBody
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Logs sauvegardés") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Logs")
                }
            }
        }
    }
}

@Composable
private fun ConfessConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val confess = configData?.obj("confess")
    var mode by remember { mutableStateOf("sfw") }
    var logChannelId by remember { mutableStateOf(confess?.str("logChannelId")) }
    var allowReplies by remember { mutableStateOf(confess?.bool("allowReplies") ?: false) }
    var threadNaming by remember { mutableStateOf(confess?.str("threadNaming") ?: "") }
    val initialNames = remember(confess) { confess?.arr("nsfwNames")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var nsfwNames by remember { mutableStateOf(initialNames) }
    var newName by remember { mutableStateOf("") }

    val sfwChannelsInit = remember(confess) { confess?.obj("sfw")?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    val nsfwChannelsInit = remember(confess) { confess?.obj("nsfw")?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var sfwChannels by remember { mutableStateOf(sfwChannelsInit) }
    var nsfwChannels by remember { mutableStateOf(nsfwChannelsInit) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    val activeList = if (mode == "sfw") sfwChannels else nsfwChannels

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "💬 Confess", subtitle = "SFW/NSFW + logs + options") {
                TabRow(selectedTabIndex = if (mode == "sfw") 0 else 1) {
                    Tab(selected = mode == "sfw", onClick = { mode = "sfw" }, text = { Text("🟢 SFW") })
                    Tab(selected = mode == "nsfw", onClick = { mode = "nsfw" }, text = { Text("🔴 NSFW") })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, logChannelId, { logChannelId = it }, label = "Channel des logs")
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Autoriser les réponses", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = allowReplies, onCheckedChange = { allowReplies = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(threadNaming, { threadNaming = it }, label = { Text("Thread naming") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "📋 Channels ${mode.uppercase()} (${activeList.size})") {
                activeList.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = {
                            if (mode == "sfw") sfwChannels = sfwChannels.filterNot { it == chId }
                            else nsfwChannels = nsfwChannels.filterNot { it == chId }
                        }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(
                    channels = channels.filterKeys { !activeList.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        newChannelId?.let { id ->
                            if (mode == "sfw") sfwChannels = sfwChannels + id else nsfwChannels = nsfwChannels + id
                            newChannelId = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            SectionCard(title = "🏷️ NSFW Names (${nsfwNames.size})", subtitle = "Utilisé pour le naming NSFW") {
                nsfwNames.forEach { nm ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(nm, color = Color.White)
                        IconButton(onClick = { nsfwNames = nsfwNames.filterNot { it == nm } }) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
                        }
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(newName, { newName = it }, label = { Text("Nouveau nom") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { nsfwNames = nsfwNames + newName.trim(); newName = "" },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newName.trim().isNotBlank()
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("sfw", buildJsonObject { put("channels", JsonArray(sfwChannels.map { JsonPrimitive(it) })) })
                                    put("nsfw", buildJsonObject { put("channels", JsonArray(nsfwChannels.map { JsonPrimitive(it) })) })
                                    logChannelId?.let { put("logChannelId", it) }
                                    put("allowReplies", allowReplies)
                                    put("threadNaming", threadNaming)
                                    put("nsfwNames", JsonArray(nsfwNames.map { JsonPrimitive(it) }))
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/confess",
                                    primaryBody = buildJsonObject { put("settings", body) },
                                    fallbackSectionKey = "confess",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Confess sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Confess")
                }
            }
        }
    }
}

@Composable
private fun WelcomeConfigTab(
    api: ApiClient,
    json: Json,
    channels: Map<String, String>,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }
    var sendEmbedInDM by remember { mutableStateOf(false) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/welcome")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        channelId = obj["channelId"]?.jsonPrimitive?.contentOrNull
                        message = obj["message"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedEnabled = obj["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        embedTitle = obj["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedDescription = obj["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedColor = obj["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedFooter = obj["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                        sendEmbedInDM = obj["sendEmbedInDM"]?.jsonPrimitive?.booleanOrNull ?: false
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👋 Welcome", subtitle = "Messages + embed") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, channelId, { channelId = it }, label = "Channel welcome")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(message, { message = it }, label = { Text("Message") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Embed", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = embedEnabled, onCheckedChange = { embedEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(embedTitle, { embedTitle = it }, label = { Text("Embed title") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedDescription, { embedDescription = it }, label = { Text("Embed description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedColor, { embedColor = it }, label = { Text("Embed color") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedFooter, { embedFooter = it }, label = { Text("Embed footer") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Envoyer l'embed en DM", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = sendEmbedInDM, onCheckedChange = { sendEmbedInDM = it })
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val welcome = buildJsonObject {
                                        put("enabled", enabled)
                                        put("channelId", channelId ?: "")
                                        put("message", message)
                                        put("embedEnabled", embedEnabled)
                                        put("embedTitle", embedTitle)
                                        put("embedDescription", embedDescription)
                                        put("embedColor", embedColor)
                                        put("embedFooter", embedFooter)
                                        put("sendEmbedInDM", sendEmbedInDM)
                                    }
                                    api.postJson("/api/welcome", json.encodeToString(JsonObject.serializer(), buildJsonObject { put("welcome", welcome) }))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Welcome sauvegardé") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }
    }
}

@Composable
private fun GoodbyeConfigTab(
    api: ApiClient,
    json: Json,
    channels: Map<String, String>,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var channelId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var embedEnabled by remember { mutableStateOf(false) }
    var embedTitle by remember { mutableStateOf("") }
    var embedDescription by remember { mutableStateOf("") }
    var embedColor by remember { mutableStateOf("") }
    var embedFooter by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/goodbye")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        channelId = obj["channelId"]?.jsonPrimitive?.contentOrNull
                        message = obj["message"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedEnabled = obj["embedEnabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        embedTitle = obj["embedTitle"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedDescription = obj["embedDescription"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedColor = obj["embedColor"]?.jsonPrimitive?.contentOrNull ?: ""
                        embedFooter = obj["embedFooter"]?.jsonPrimitive?.contentOrNull ?: ""
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "😢 Goodbye", subtitle = "Messages + embed") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, channelId, { channelId = it }, label = "Channel goodbye")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(message, { message = it }, label = { Text("Message") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Embed", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = embedEnabled, onCheckedChange = { embedEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(embedTitle, { embedTitle = it }, label = { Text("Embed title") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedDescription, { embedDescription = it }, label = { Text("Embed description") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedColor, { embedColor = it }, label = { Text("Embed color") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(embedFooter, { embedFooter = it }, label = { Text("Embed footer") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val goodbye = buildJsonObject {
                                        put("enabled", enabled)
                                        put("channelId", channelId ?: "")
                                        put("message", message)
                                        put("embedEnabled", embedEnabled)
                                        put("embedTitle", embedTitle)
                                        put("embedDescription", embedDescription)
                                        put("embedColor", embedColor)
                                        put("embedFooter", embedFooter)
                                    }
                                    api.postJson("/api/goodbye", json.encodeToString(JsonObject.serializer(), buildJsonObject { put("goodbye", goodbye) }))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Goodbye sauvegardé") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }
    }
}

@Composable
private fun StaffConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val initial = remember(configData) {
        configData?.arr("staffRoleIds")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
    }
    var staffRoles by remember { mutableStateOf(initial) }
    var newRoleId by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👥 Staff roles", subtitle = "${staffRoles.size} rôle(s)") {
                staffRoles.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { staffRoles = staffRoles.filterNot { it == rid } }
                    )
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(
                    roles = roles.filterKeys { !staffRoles.contains(it) },
                    selectedRoleId = newRoleId,
                    onRoleSelected = { newRoleId = it },
                    label = "Ajouter un rôle staff"
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { newRoleId?.let { staffRoles = staffRoles + it; newRoleId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newRoleId != null
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject { put("staffRoleIds", JsonArray(staffRoles.map { JsonPrimitive(it) })) }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/staff",
                                    primaryBody = body,
                                    fallbackSectionKey = "staffRoleIds",
                                    fallbackSectionBody = JsonObject(body)
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Staff sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Staff")
                }
            }
        }
    }
}

@Composable
private fun AutoKickConfigTab(
    configData: JsonObject?,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val autokick = configData?.obj("autokick")
    var enabled by remember { mutableStateOf(autokick?.bool("enabled") ?: false) }
    var roleId by remember { mutableStateOf(autokick?.str("roleId")) }
    var delayMs by remember { mutableStateOf((autokick?.int("delayMs") ?: 172800000).toString()) }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "👢 AutoKick", subtitle = "Role + délai") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                RoleSelector(roles, roleId, { roleId = it }, label = "Rôle AutoKick")
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = delayMs,
                    onValueChange = { delayMs = it },
                    label = { Text("Délai (ms)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("autokick", buildJsonObject {
                                        put("enabled", enabled)
                                        put("roleId", roleId ?: "")
                                        put("delayMs", delayMs.toLongOrNull() ?: 172800000)
                                    })
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/autokick",
                                    primaryBody = body,
                                    fallbackSectionKey = "autokick",
                                    fallbackSectionBody = body["autokick"]!!.jsonObject
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ AutoKick sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder AutoKick")
                }
            }
        }
    }
}

@Composable
private fun InactivityConfigTab(
    members: Map<String, String>,
    roles: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(false) }
    var enabled by remember { mutableStateOf(false) }
    var delayDays by remember { mutableStateOf("30") }
    var inactiveRoleId by remember { mutableStateOf<String?>(null) }
    var excludedRoleIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var trackingCount by remember { mutableIntStateOf(0) }
    var selectedMember by remember { mutableStateOf<String?>(null) }
    var newExcludedRole by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            withContext(Dispatchers.IO) {
                try {
                    val resp = api.getJson("/api/inactivity")
                    val obj = json.parseToJsonElement(resp).jsonObject
                    val tracking = obj["tracking"]?.jsonObject?.size ?: 0
                    withContext(Dispatchers.Main) {
                        enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
                        delayDays = (obj["delayDays"]?.jsonPrimitive?.intOrNull ?: 30).toString()
                        inactiveRoleId = obj["inactiveRoleId"]?.jsonPrimitive?.contentOrNull
                        excludedRoleIds = obj["excludedRoleIds"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
                        trackingCount = tracking
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                } finally {
                    withContext(Dispatchers.Main) { isLoading = false }
                }
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "⏰ Inactivité", subtitle = "Config + outils") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = delayDays,
                    onValueChange = { delayDays = it },
                    label = { Text("Délai (jours)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                RoleSelector(roles, inactiveRoleId, { inactiveRoleId = it }, label = "Rôle Inactif")
                Spacer(Modifier.height(10.dp))
                Text("Exclusions (${excludedRoleIds.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                excludedRoleIds.forEach { rid ->
                    RemovableIdRow(
                        label = "Rôle exclu",
                        id = rid,
                        resolvedName = roles[rid],
                        onRemove = { excludedRoleIds = excludedRoleIds.filterNot { it == rid } }
                    )
                }
                RoleSelector(
                    roles = roles.filterKeys { !excludedRoleIds.contains(it) },
                    selectedRoleId = newExcludedRole,
                    onRoleSelected = { newExcludedRole = it },
                    label = "Ajouter un rôle exclu"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newExcludedRole?.let { excludedRoleIds = excludedRoleIds + it; newExcludedRole = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newExcludedRole != null
                ) { Text("➕ Ajouter rôle exclu") }
                Spacer(Modifier.height(8.dp))
                Text("Tracking: $trackingCount membres", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { load() }, modifier = Modifier.weight(1f), enabled = !isLoading) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rafraîchir")
                }
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            withContext(Dispatchers.IO) {
                                try {
                                    val body = buildJsonObject {
                                        put("enabled", enabled)
                                        put("delayDays", delayDays.toIntOrNull() ?: 30)
                                        put("excludedRoleIds", JsonArray(excludedRoleIds.map { JsonPrimitive(it) }))
                                        put("inactiveRoleId", inactiveRoleId?.let { JsonPrimitive(it) } ?: JsonNull)
                                    }
                                    api.postJson("/api/inactivity", json.encodeToString(JsonObject.serializer(), body))
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Inactivité sauvegardée") }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                } finally {
                                    withContext(Dispatchers.Main) { isLoading = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isLoading
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauver")
                }
            }
        }

        item {
            SectionCard(title = "🔧 Outils", subtitle = "Reset / tracking") {
                MemberSelector(members, selectedMember, { selectedMember = it }, label = "Sélectionner un membre")
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        val uid = selectedMember ?: return@Button
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    api.postJson("/api/inactivity/reset/$uid", "{}")
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Reset inactivité: ${members[uid] ?: uid}") }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = selectedMember != null
                ) { Text("🔄 Reset inactivité membre") }

                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    api.postJson("/api/inactivity/add-all-members", "{}")
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Ajout auto members au tracking") }
                                    load()
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("➕ Ajouter tous les membres au tracking") }
            }
        }
    }
}

@Composable
private fun AutoThreadConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val at = configData?.obj("autothread")
    val initialChannels = remember(at) { at?.arr("channels")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var channelIds by remember { mutableStateOf(initialChannels) }
    var namingMode by remember { mutableStateOf(at?.obj("naming")?.str("mode") ?: "nsfw") }
    var customPattern by remember { mutableStateOf(at?.obj("naming")?.str("customPattern") ?: "") }
    var policy by remember { mutableStateOf(at?.str("policy") ?: "new_messages") }
    var archivePolicy by remember { mutableStateOf(at?.str("archivePolicy") ?: "1w") }
    val initialNames = remember(at) { at?.arr("nsfwNames")?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList() }
    var nsfwNames by remember { mutableStateOf(initialNames) }
    var newChannelId by remember { mutableStateOf<String?>(null) }
    var newName by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🧵 AutoThread") {
                Text("Channels (${channelIds.size})", color = Color.White, fontWeight = FontWeight.SemiBold)
                channelIds.forEach { chId ->
                    RemovableIdRow(
                        label = "Salon",
                        id = chId,
                        resolvedName = channels[chId],
                        onRemove = { channelIds = channelIds.filterNot { it == chId } }
                    )
                }
                ChannelSelector(
                    channels = channels.filterKeys { !channelIds.contains(it) },
                    selectedChannelId = newChannelId,
                    onChannelSelected = { newChannelId = it },
                    label = "Ajouter un salon"
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { newChannelId?.let { channelIds = channelIds + it; newChannelId = null } },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newChannelId != null
                ) { Text("➕ Ajouter") }

                Spacer(Modifier.height(12.dp))
                OutlinedTextField(namingMode, { namingMode = it }, label = { Text("Naming mode") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(customPattern, { customPattern = it }, label = { Text("Custom pattern") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(policy, { policy = it }, label = { Text("Policy") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(archivePolicy, { archivePolicy = it }, label = { Text("Archive policy") }, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            SectionCard(title = "🏷️ NSFW Names (${nsfwNames.size})") {
                nsfwNames.forEach { nm ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(nm, color = Color.White)
                        IconButton(onClick = { nsfwNames = nsfwNames.filterNot { it == nm } }) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color(0xFFE53935))
                        }
                    }
                    Divider(color = Color(0xFF2A2A2A))
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(newName, { newName = it }, label = { Text("Nouveau nom") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { nsfwNames = nsfwNames + newName.trim(); newName = "" },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newName.trim().isNotBlank()
                ) { Text("➕ Ajouter") }
            }
        }

        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("channels", JsonArray(channelIds.map { JsonPrimitive(it) }))
                                    put("naming", buildJsonObject {
                                        put("mode", namingMode)
                                        put("customPattern", customPattern)
                                    })
                                    put("policy", policy)
                                    put("archivePolicy", archivePolicy)
                                    put("nsfwNames", JsonArray(nsfwNames.map { JsonPrimitive(it) }))
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/autothread",
                                    primaryBody = buildJsonObject { put("autothread", body) },
                                    fallbackSectionKey = "autothread",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ AutoThread sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder AutoThread")
                }
            }
        }
    }
}

@Composable
private fun DisboardConfigTab(
    configData: JsonObject?,
    channels: Map<String, String>,
    api: ApiClient,
    json: Json,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbar: SnackbarHostState
) {
    val dis = configData?.obj("disboard")
    var remindersEnabled by remember { mutableStateOf(dis?.bool("remindersEnabled") ?: false) }
    var remindChannelId by remember { mutableStateOf(dis?.str("remindChannelId")) }
    val lastBumpAt = dis?.str("lastBumpAt") ?: dis?.get("lastBumpAt")?.jsonPrimitive?.longOrNull?.toString()
    var isSaving by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "📢 Disboard", subtitle = "Rappels + channel") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Activer les rappels", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Switch(checked = remindersEnabled, onCheckedChange = { remindersEnabled = it })
                }
                Spacer(Modifier.height(10.dp))
                ChannelSelector(channels, remindChannelId, { remindChannelId = it }, label = "Channel de rappel")
                Spacer(Modifier.height(10.dp))
                Text("Dernier bump: ${lastBumpAt ?: "N/A"}", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }
        item {
            Button(
                onClick = {
                    scope.launch {
                        isSaving = true
                        withContext(Dispatchers.IO) {
                            try {
                                val body = buildJsonObject {
                                    put("remindersEnabled", remindersEnabled)
                                    put("remindChannelId", remindChannelId ?: "")
                                }
                                postOrPutSection(
                                    api = api,
                                    json = json,
                                    primaryPostPath = "/api/disboard",
                                    primaryBody = buildJsonObject { put("disboard", body) },
                                    fallbackSectionKey = "disboard",
                                    fallbackSectionBody = body
                                )
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("✅ Disboard sauvegardé") }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) { snackbar.showSnackbar("❌ Erreur: ${e.message}") }
                            } finally {
                                withContext(Dispatchers.Main) { isSaving = false }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !isSaving
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                else {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sauvegarder Disboard")
                }
            }
        }
    }
}

@Composable
private fun GeoConfigTab(
    configData: JsonObject?,
    members: Map<String, String>
) {
    val geo = configData?.obj("geo")
    val locs = geo?.obj("locations") ?: buildJsonObject { }
    val rows = remember(locs) {
        locs.mapNotNull { (uid, el) ->
            val o = el.jsonObject
            val city = o["city"]?.jsonPrimitive?.contentOrNull ?: ""
            val lat = o["lat"]?.jsonPrimitive?.doubleOrNull
            val lon = o["lon"]?.jsonPrimitive?.doubleOrNull
            Triple(uid, city, (lat?.toString() ?: "") + "," + (lon?.toString() ?: ""))
        }
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🌍 Géo", subtitle = "Locations (read-only)") {
                Text("Total: ${rows.size}", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }
        itemsIndexed(rows) { idx, (uid, city, coords) ->
            SectionCard(title = "${idx + 1}. ${members[uid] ?: uid}", subtitle = uid) {
                Text(city.ifBlank { "(ville inconnue)" }, color = Color.White)
                Text(coords, color = Color.Gray, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun RawConfigTab(configData: JsonObject?, json: Json) {
    val pretty = remember(configData) {
        try {
            if (configData == null) "null"
            else Json { prettyPrint = true }.encodeToString(JsonObject.serializer(), configData)
        } catch (_: Exception) {
            configData?.toString() ?: "null"
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionCard(title = "🧾 Config brute (/api/configs)", subtitle = "Lecture seule") {
                Text(pretty, color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

