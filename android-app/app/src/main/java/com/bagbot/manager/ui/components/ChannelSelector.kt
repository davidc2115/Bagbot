package com.bagbot.manager.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ChannelSelector(
    channels: Map<String, String>,
    selectedChannelId: String?,
    onChannelSelected: (String) -> Unit,
    label: String = "Sélectionner un channel"
) {
    var expanded by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    
    val filteredChannels = remember(channels, searchQuery) {
        if (searchQuery.isBlank()) {
            channels
        } else {
            channels.filter { (_, name) ->
                name.contains(searchQuery, ignoreCase = true)
            }
        }
    }
    
    Column {
        OutlinedButton(
            onClick = { expanded = !expanded },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(text = selectedChannelId?.let { channels[it] } ?: label)
        }
        
        if (expanded) {
            Card(
                modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)
            ) {
                Column {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Rechercher...") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        modifier = Modifier.fillMaxWidth().padding(8.dp)
                    )
                    
                    LazyColumn {
                        items(filteredChannels.toList()) { (id, name) ->
                            TextButton(
                                onClick = {
                                    onChannelSelected(id)
                                    expanded = false
                                    searchQuery = ""
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Divider()
                        }
                    }
                }
            }
        }
    }
}
