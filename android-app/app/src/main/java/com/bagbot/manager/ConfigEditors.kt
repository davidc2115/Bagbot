package com.bagbot.manager

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private fun JsonPrimitive.safeContentOrNull(): String? =
  if (this is JsonNull) null else this.content

private fun JsonObject.stringOrNull(key: String): String? =
  (this[key] as? JsonPrimitive)?.safeContentOrNull()

private fun JsonObject.boolOrNull(key: String): Boolean? =
  (this[key] as? JsonPrimitive)?.booleanOrNull

private fun JsonObject.longOrNull(key: String): Long? =
  (this[key] as? JsonPrimitive)?.longOrNull

private fun JsonElement.asObjectOrEmpty(): JsonObject =
  (this as? JsonObject) ?: JsonObject(emptyMap())

private fun JsonElement.asArrayOrEmpty(): JsonArray =
  (this as? JsonArray) ?: JsonArray(emptyList())

@Composable
fun IdPickerField(
  label: String,
  selectedId: String,
  items: Map<String, String>,
  modifier: Modifier = Modifier,
  onChange: (String) -> Unit,
) {
  val open = remember { mutableStateOf(false) }
  val query = remember { mutableStateOf("") }

  val selectedName = items[selectedId].orEmpty()
  OutlinedTextField(
    value = if (selectedId.isBlank()) "" else "$selectedName ($selectedId)",
    onValueChange = {},
    readOnly = true,
    label = { Text(label) },
    placeholder = { Text("Choisir…") },
    modifier = modifier
      .fillMaxWidth()
      .clickable { open.value = true }
  )

  if (open.value) {
    val filtered = items.entries
      .asSequence()
      .filter { (id, name) ->
        val q = query.value.trim()
        q.isBlank() || id.contains(q, ignoreCase = true) || name.contains(q, ignoreCase = true)
      }
      .sortedBy { it.value.lowercase() }
      .take(200)
      .toList()

    AlertDialog(
      onDismissRequest = { open.value = false },
      title = { Text(label) },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
          OutlinedTextField(
            value = query.value,
            onValueChange = { query.value = it },
            label = { Text("Rechercher") },
            modifier = Modifier.fillMaxWidth()
          )
          LazyColumn(modifier = Modifier.height(320.dp)) {
            items(filtered) { (id, name) ->
              Text(
                text = "$name\n$id",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier
                  .fillMaxWidth()
                  .clickable {
                    onChange(id)
                    open.value = false
                  }
                  .padding(vertical = 10.dp)
              )
            }
          }
        }
      },
      confirmButton = { TextButton(onClick = { open.value = false }) { Text("Fermer") } }
    )
  }
}

@Composable
fun MultiIdPickerField(
  label: String,
  selectedIds: List<String>,
  items: Map<String, String>,
  modifier: Modifier = Modifier,
  onChange: (List<String>) -> Unit,
) {
  val open = remember { mutableStateOf(false) }
  val query = remember { mutableStateOf("") }
  val working = remember(selectedIds) { mutableStateOf(selectedIds.toMutableSet()) }

  OutlinedTextField(
    value = if (selectedIds.isEmpty()) "" else "${selectedIds.size} sélectionné(s)",
    onValueChange = {},
    readOnly = true,
    label = { Text(label) },
    placeholder = { Text("Choisir…") },
    modifier = modifier
      .fillMaxWidth()
      .clickable { open.value = true }
  )

  if (open.value) {
    val filtered = items.entries
      .asSequence()
      .filter { (id, name) ->
        val q = query.value.trim()
        q.isBlank() || id.contains(q, ignoreCase = true) || name.contains(q, ignoreCase = true)
      }
      .sortedBy { it.value.lowercase() }
      .take(250)
      .toList()

    AlertDialog(
      onDismissRequest = { open.value = false },
      title = { Text(label) },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
          OutlinedTextField(
            value = query.value,
            onValueChange = { query.value = it },
            label = { Text("Rechercher") },
            modifier = Modifier.fillMaxWidth()
          )
          LazyColumn(modifier = Modifier.height(340.dp)) {
            items(filtered) { (id, name) ->
              val checked = working.value.contains(id)
              Row(
                modifier = Modifier
                  .fillMaxWidth()
                  .clickable {
                    if (checked) working.value.remove(id) else working.value.add(id)
                  }
                  .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
              ) {
                Text("$name\n$id", modifier = Modifier.weight(1f))
                Switch(checked = checked, onCheckedChange = {
                  if (it) working.value.add(id) else working.value.remove(id)
                })
              }
            }
          }
        }
      },
      confirmButton = {
        TextButton(onClick = {
          onChange(working.value.toList())
          open.value = false
        }) { Text("OK") }
      },
      dismissButton = { TextButton(onClick = { open.value = false }) { Text("Annuler") } }
    )
  }
}

data class TicketCategory(
  val key: String,
  val label: String,
  val emoji: String,
  val description: String,
  val bannerUrl: String,
  val staffPingRoleIds: List<String>,
  val extraViewerRoleIds: List<String>,
)

@Composable
fun TicketsEditor(
  tickets: JsonObject,
  channels: Map<String, String>,
  roles: Map<String, String>,
  onSave: (JsonObject) -> Unit,
  onBack: () -> Unit,
) {
  val enabled = remember { mutableStateOf(tickets.boolOrNull("enabled") ?: false) }
  val categoryId = remember { mutableStateOf(tickets.stringOrNull("categoryId") ?: "") }
  val panelChannelId = remember { mutableStateOf(tickets.stringOrNull("panelChannelId") ?: "") }
  val panelMessageId = remember { mutableStateOf(tickets.stringOrNull("panelMessageId") ?: "") }

  val categories = remember {
    val arr = tickets["categories"]?.asArrayOrEmpty() ?: JsonArray(emptyList())
    val parsed = arr.mapNotNull { el ->
      val o = el.asObjectOrEmpty()
      TicketCategory(
        key = o.stringOrNull("key") ?: return@mapNotNull null,
        label = o.stringOrNull("label") ?: "",
        emoji = o.stringOrNull("emoji") ?: "",
        description = o.stringOrNull("description") ?: "",
        bannerUrl = o.stringOrNull("bannerUrl") ?: "",
        staffPingRoleIds = o["staffPingRoleIds"]?.asArrayOrEmpty()?.mapNotNull { (it as? JsonPrimitive)?.safeContentOrNull() } ?: emptyList(),
        extraViewerRoleIds = o["extraViewerRoleIds"]?.asArrayOrEmpty()?.mapNotNull { (it as? JsonPrimitive)?.safeContentOrNull() } ?: emptyList(),
      )
    }.toMutableList()
    mutableStateOf(parsed)
  }

  val editIndex = remember { mutableStateOf<Int?>(null) }

  Column(
    modifier = Modifier
      .padding(16.dp)
      .verticalScroll(rememberScrollState()),
    verticalArrangement = Arrangement.spacedBy(12.dp)
  ) {
    Text("Tickets", style = MaterialTheme.typography.titleLarge)

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      Text("Activé", modifier = Modifier.weight(1f))
      Switch(checked = enabled.value, onCheckedChange = { enabled.value = it })
    }

    if (channels.isNotEmpty()) {
      IdPickerField(label = "Catégorie (ID)", selectedId = categoryId.value, items = channels, onChange = { categoryId.value = it })
      IdPickerField(label = "Salon du panel (ID)", selectedId = panelChannelId.value, items = channels, onChange = { panelChannelId.value = it })
    } else {
      OutlinedTextField(value = categoryId.value, onValueChange = { categoryId.value = it }, label = { Text("Catégorie ID") }, modifier = Modifier.fillMaxWidth())
      OutlinedTextField(value = panelChannelId.value, onValueChange = { panelChannelId.value = it }, label = { Text("Salon du panel ID") }, modifier = Modifier.fillMaxWidth())
    }

    OutlinedTextField(
      value = panelMessageId.value,
      onValueChange = { panelMessageId.value = it },
      label = { Text("Message panel ID") },
      modifier = Modifier.fillMaxWidth()
    )

    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Catégories", style = MaterialTheme.typography.titleMedium)
        categories.value.forEachIndexed { idx, c ->
          Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Text("${c.emoji} ${c.label}".trim(), modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { editIndex.value = idx }) { Text("Modifier") }
            OutlinedButton(onClick = {
              val list = categories.value.toMutableList()
              list.removeAt(idx)
              categories.value = list
            }) { Text("Suppr.") }
          }
        }
        OutlinedButton(onClick = {
          val list = categories.value.toMutableList()
          list.add(
            TicketCategory(
              key = "new",
              label = "Nouvelle catégorie",
              emoji = "🎫",
              description = "",
              bannerUrl = "",
              staffPingRoleIds = emptyList(),
              extraViewerRoleIds = emptyList(),
            )
          )
          categories.value = list
          editIndex.value = list.lastIndex
        }) { Text("Ajouter") }
      }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Button(onClick = {
        val catsJson = JsonArray(
          categories.value.map { c ->
            JsonObject(
              mapOf(
                "key" to JsonPrimitive(c.key),
                "label" to JsonPrimitive(c.label),
                "emoji" to JsonPrimitive(c.emoji),
                "description" to JsonPrimitive(c.description),
                "bannerUrl" to JsonPrimitive(c.bannerUrl),
                "staffPingRoleIds" to JsonArray(c.staffPingRoleIds.map { JsonPrimitive(it) }),
                "extraViewerRoleIds" to JsonArray(c.extraViewerRoleIds.map { JsonPrimitive(it) }),
              )
            )
          }
        )
        val out = JsonObject(
          mapOf(
            "enabled" to JsonPrimitive(enabled.value),
            "categoryId" to JsonPrimitive(categoryId.value),
            "panelChannelId" to JsonPrimitive(panelChannelId.value),
            "panelMessageId" to JsonPrimitive(panelMessageId.value),
            "categories" to catsJson,
          )
        )
        onSave(out)
      }) { Text("Sauvegarder") }
      OutlinedButton(onClick = onBack) { Text("Retour") }
    }
  }

  val idx = editIndex.value
  if (idx != null && idx >= 0 && idx < categories.value.size) {
    val current = categories.value[idx]
    val k = remember(idx) { mutableStateOf(current.key) }
    val label = remember(idx) { mutableStateOf(current.label) }
    val emoji = remember(idx) { mutableStateOf(current.emoji) }
    val desc = remember(idx) { mutableStateOf(current.description) }
    val banner = remember(idx) { mutableStateOf(current.bannerUrl) }
    val staffRoles = remember(idx) { mutableStateOf(current.staffPingRoleIds) }
    val viewerRoles = remember(idx) { mutableStateOf(current.extraViewerRoleIds) }

    AlertDialog(
      onDismissRequest = { editIndex.value = null },
      title = { Text("Catégorie ticket") },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
          OutlinedTextField(value = k.value, onValueChange = { k.value = it }, label = { Text("Key") }, modifier = Modifier.fillMaxWidth())
          OutlinedTextField(value = label.value, onValueChange = { label.value = it }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
          OutlinedTextField(value = emoji.value, onValueChange = { emoji.value = it }, label = { Text("Emoji") }, modifier = Modifier.fillMaxWidth())
          OutlinedTextField(value = desc.value, onValueChange = { desc.value = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
          OutlinedTextField(value = banner.value, onValueChange = { banner.value = it }, label = { Text("Banner URL") }, modifier = Modifier.fillMaxWidth())
          if (roles.isNotEmpty()) {
            MultiIdPickerField(label = "Rôles staff ping", selectedIds = staffRoles.value, items = roles, onChange = { staffRoles.value = it })
            MultiIdPickerField(label = "Rôles viewers +", selectedIds = viewerRoles.value, items = roles, onChange = { viewerRoles.value = it })
          } else {
            OutlinedTextField(
              value = staffRoles.value.joinToString(","),
              onValueChange = { staffRoles.value = it.split(",").map { s -> s.trim() }.filter { s -> s.isNotBlank() } },
              label = { Text("Rôles staff ping (IDs, séparés par ,)") },
              modifier = Modifier.fillMaxWidth(),
              textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
            )
            OutlinedTextField(
              value = viewerRoles.value.joinToString(","),
              onValueChange = { viewerRoles.value = it.split(",").map { s -> s.trim() }.filter { s -> s.isNotBlank() } },
              label = { Text("Rôles viewers + (IDs, séparés par ,)") },
              modifier = Modifier.fillMaxWidth(),
              textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
            )
          }
        }
      },
      confirmButton = {
        TextButton(onClick = {
          val list = categories.value.toMutableList()
          list[idx] = TicketCategory(
            key = k.value.trim(),
            label = label.value,
            emoji = emoji.value,
            description = desc.value,
            bannerUrl = banner.value,
            staffPingRoleIds = staffRoles.value,
            extraViewerRoleIds = viewerRoles.value,
          )
          categories.value = list
          editIndex.value = null
        }) { Text("OK") }
      },
      dismissButton = { TextButton(onClick = { editIndex.value = null }) { Text("Annuler") } }
    )
  }
}

@Composable
fun AutoKickEditor(
  autokick: JsonObject,
  roles: Map<String, String>,
  onSave: (JsonObject) -> Unit,
  onBack: () -> Unit,
) {
  val enabled = remember { mutableStateOf(autokick.boolOrNull("enabled") ?: false) }
  val roleId = remember { mutableStateOf(autokick.stringOrNull("roleId") ?: "") }
  val delayMs = remember { mutableStateOf(autokick.longOrNull("delayMs") ?: 0L) }
  val delayDays = remember { mutableStateOf(((delayMs.value / 86_400_000L).coerceAtLeast(0L)).toString()) }

  val inactivityKick = autokick["inactivityKick"]?.asObjectOrEmpty()
  val inactivityEnabled = remember { mutableStateOf(inactivityKick?.boolOrNull("enabled") ?: false) }
  val inactivityDelayDays = remember { mutableStateOf((inactivityKick?.longOrNull("delayDays") ?: 30L).toString()) }
  val excludedRoleIds = remember { mutableStateOf(inactivityKick?.get("excludedRoleIds")?.asArrayOrEmpty()?.mapNotNull { (it as? JsonPrimitive)?.safeContentOrNull() } ?: emptyList()) }
  val inactiveRoleId = remember { mutableStateOf(inactivityKick?.stringOrNull("inactiveRoleId") ?: "") }

  Column(
    modifier = Modifier
      .padding(16.dp)
      .verticalScroll(rememberScrollState()),
    verticalArrangement = Arrangement.spacedBy(12.dp)
  ) {
    Text("AutoKick / Inactivité", style = MaterialTheme.typography.titleLarge)

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      Text("Activé", modifier = Modifier.weight(1f))
      Switch(checked = enabled.value, onCheckedChange = { enabled.value = it })
    }

    if (roles.isNotEmpty()) {
      IdPickerField(label = "Rôle (roleId)", selectedId = roleId.value, items = roles, onChange = { roleId.value = it })
    } else {
      OutlinedTextField(value = roleId.value, onValueChange = { roleId.value = it }, label = { Text("roleId") }, modifier = Modifier.fillMaxWidth())
    }

    OutlinedTextField(
      value = delayDays.value,
      onValueChange = { delayDays.value = it },
      label = { Text("Délai (jours) (delayMs)") },
      modifier = Modifier.fillMaxWidth()
    )

    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Inactivité (/config bot)", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          Text("Kick inactivité activé", modifier = Modifier.weight(1f))
          Switch(checked = inactivityEnabled.value, onCheckedChange = { inactivityEnabled.value = it })
        }
        OutlinedTextField(
          value = inactivityDelayDays.value,
          onValueChange = { inactivityDelayDays.value = it },
          label = { Text("Délai kick (jours)") },
          modifier = Modifier.fillMaxWidth()
        )
        if (roles.isNotEmpty()) {
          MultiIdPickerField(label = "Rôles exemptés", selectedIds = excludedRoleIds.value, items = roles, onChange = { excludedRoleIds.value = it })
          IdPickerField(label = "Rôle inactif (optionnel)", selectedId = inactiveRoleId.value, items = roles, onChange = { inactiveRoleId.value = it })
        } else {
          OutlinedTextField(
            value = excludedRoleIds.value.joinToString(","),
            onValueChange = { excludedRoleIds.value = it.split(",").map { s -> s.trim() }.filter { s -> s.isNotBlank() } },
            label = { Text("Rôles exemptés (IDs, séparés par ,)") },
            modifier = Modifier.fillMaxWidth(),
            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
          )
          OutlinedTextField(
            value = inactiveRoleId.value,
            onValueChange = { inactiveRoleId.value = it },
            label = { Text("Rôle inactif ID (optionnel)") },
            modifier = Modifier.fillMaxWidth(),
            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace)
          )
        }
      }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Button(onClick = {
        val days = delayDays.value.trim().toLongOrNull() ?: 0L
        delayMs.value = days * 86_400_000L

        val inactivity = JsonObject(
          mapOf(
            "enabled" to JsonPrimitive(inactivityEnabled.value),
            "delayDays" to JsonPrimitive(inactivityDelayDays.value.trim().toLongOrNull() ?: 30L),
            "excludedRoleIds" to JsonArray(excludedRoleIds.value.map { JsonPrimitive(it) }),
            "inactiveRoleId" to JsonPrimitive(inactiveRoleId.value.ifBlank { "" }),
          )
        )

        val out = JsonObject(
          mapOf(
            "enabled" to JsonPrimitive(enabled.value),
            "roleId" to JsonPrimitive(roleId.value),
            "delayMs" to JsonPrimitive(delayMs.value),
            // keep in same section to match bot /config style if present
            "inactivityKick" to inactivity,
          )
        )
        onSave(out)
      }) { Text("Sauvegarder") }
      OutlinedButton(onClick = onBack) { Text("Retour") }
    }
  }
}

@Composable
fun StaffChatConfigEditor(
  staffChat: JsonObject,
  channels: Map<String, String>,
  onSave: (JsonObject) -> Unit,
  onBack: () -> Unit,
) {
  val enabled = remember { mutableStateOf(staffChat.boolOrNull("enabled") ?: false) }
  val channelId = remember { mutableStateOf(staffChat.stringOrNull("channelId") ?: "") }

  Column(
    modifier = Modifier
      .padding(16.dp)
      .verticalScroll(rememberScrollState()),
    verticalArrangement = Arrangement.spacedBy(12.dp)
  ) {
    Text("Chat staff", style = MaterialTheme.typography.titleLarge)

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      Text("Activé", modifier = Modifier.weight(1f))
      Switch(checked = enabled.value, onCheckedChange = { enabled.value = it })
    }

    if (channels.isNotEmpty()) {
      IdPickerField(label = "Salon staff (channelId)", selectedId = channelId.value, items = channels, onChange = { channelId.value = it })
    } else {
      OutlinedTextField(
        value = channelId.value,
        onValueChange = { channelId.value = it },
        label = { Text("channelId") },
        modifier = Modifier.fillMaxWidth()
      )
    }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Button(onClick = {
        onSave(
          JsonObject(
            mapOf(
              "enabled" to JsonPrimitive(enabled.value),
              "channelId" to JsonPrimitive(channelId.value.trim()),
            )
          )
        )
      }) { Text("Sauvegarder") }
      OutlinedButton(onClick = onBack) { Text("Retour") }
    }
  }
}

@Composable
fun LevelsEditor(
  levels: JsonObject,
  roles: Map<String, String>,
  members: Map<String, String>,
  onSave: (JsonObject) -> Unit,
  onBack: () -> Unit,
) {
  val enabled = remember { mutableStateOf(levels.boolOrNull("enabled") ?: false) }
  val xpPerMessage = remember { mutableStateOf((levels.longOrNull("xpPerMessage") ?: 10L).toString()) }
  val xpPerVoiceMinute = remember { mutableStateOf((levels.longOrNull("xpPerVoiceMinute") ?: 5L).toString()) }

  // rewards: { "10": "roleId", ... }
  val rewardsObj = (levels["rewards"] as? JsonObject) ?: JsonObject(emptyMap())
  val rewards = remember {
    mutableStateOf(
      rewardsObj.entries
        .mapNotNull { (k, v) ->
          val roleId = (v as? JsonPrimitive)?.safeContentOrNull() ?: return@mapNotNull null
          k to roleId
        }
        .sortedBy { it.first.toIntOrNull() ?: 0 }
        .toMutableList()
    )
  }

  val usersObj = (levels["users"] as? JsonObject) ?: JsonObject(emptyMap())
  val leaderboard = remember(levels, members) {
    val list = usersObj.entries.mapNotNull { (uid, v) ->
      val o = (v as? JsonObject) ?: return@mapNotNull null
      val xp = (o["xp"] as? JsonPrimitive)?.longOrNull ?: 0L
      val lvl = (o["level"] as? JsonPrimitive)?.longOrNull ?: 0L
      Triple(uid, lvl, xp)
    }.sortedWith(compareByDescending<Triple<String, Long, Long>> { it.second }.thenByDescending { it.third })
    list.take(50)
  }

  Column(
    modifier = Modifier
      .padding(16.dp)
      .verticalScroll(rememberScrollState()),
    verticalArrangement = Arrangement.spacedBy(12.dp)
  ) {
    Text("XP / Levels", style = MaterialTheme.typography.titleLarge)

    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          Text("Activé", modifier = Modifier.weight(1f))
          Switch(checked = enabled.value, onCheckedChange = { enabled.value = it })
        }
        OutlinedTextField(
          value = xpPerMessage.value,
          onValueChange = { xpPerMessage.value = it },
          label = { Text("XP par message") },
          modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
          value = xpPerVoiceMinute.value,
          onValueChange = { xpPerVoiceMinute.value = it },
          label = { Text("XP par minute vocale") },
          modifier = Modifier.fillMaxWidth()
        )
      }
    }

    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Récompenses (rôle par niveau)", style = MaterialTheme.typography.titleMedium)
        rewards.value.forEachIndexed { idx, (lvl, roleId) ->
          val roleName = roles[roleId] ?: roleId
          Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Text("Niv. $lvl", modifier = Modifier.width(80.dp))
            Text(roleName, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = {
              val list = rewards.value.toMutableList()
              list.removeAt(idx)
              rewards.value = list
            }) { Text("Suppr.") }
          }
        }
        OutlinedButton(onClick = {
          val list = rewards.value.toMutableList()
          list.add("1" to "")
          rewards.value = list
        }) { Text("Ajouter") }
      }
    }

    Card(Modifier.fillMaxWidth()) {
      Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Classement (Top 50)", style = MaterialTheme.typography.titleMedium)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
          Text("#", modifier = Modifier.width(28.dp))
          Text("Membre", modifier = Modifier.weight(1f))
          Text("Lvl", modifier = Modifier.width(44.dp))
          Text("XP", modifier = Modifier.width(70.dp))
        }
        leaderboard.forEachIndexed { idx, (uid, lvl, xp) ->
          val name = members[uid] ?: "User-${uid.takeLast(4)}"
          Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text((idx + 1).toString(), modifier = Modifier.width(28.dp))
            Text(name, modifier = Modifier.weight(1f))
            Text(lvl.toString(), modifier = Modifier.width(44.dp))
            Text(xp.toString(), modifier = Modifier.width(70.dp))
          }
        }
      }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Button(onClick = {
        val rewardsJson = JsonObject(
          rewards.value
            .filter { it.first.trim().isNotBlank() && it.second.trim().isNotBlank() }
            .associate { (lvl, rid) -> lvl.trim() to JsonPrimitive(rid.trim()) }
        )
        val out = JsonObject(
          mapOf(
            "enabled" to JsonPrimitive(enabled.value),
            "xpPerMessage" to JsonPrimitive(xpPerMessage.value.trim().toLongOrNull() ?: 10L),
            "xpPerVoiceMinute" to JsonPrimitive(xpPerVoiceMinute.value.trim().toLongOrNull() ?: 5L),
            "rewards" to rewardsJson,
            // keep existing users data untouched
            "users" to (levels["users"] ?: JsonObject(emptyMap()))
          )
        )
        onSave(out)
      }) { Text("Sauvegarder") }
      OutlinedButton(onClick = onBack) { Text("Retour") }
    }
  }
}

