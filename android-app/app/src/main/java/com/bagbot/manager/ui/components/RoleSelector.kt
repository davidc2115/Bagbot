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
fun RoleSelector(
    roles: Map<String, String>,
    selectedRoleId: String?,
    onRoleSelected: (String) -> Unit,
    label: String = "Sélectionner un rôle"
) {
    var expanded by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    
    val filteredRoles = remember(roles, searchQuery) {
        if (searchQuery.isBlank()) {
            roles
        } else {
            roles.filter { (id, name) ->
                name.contains(searchQuery, ignoreCase = true) ||
                id.contains(searchQuery, ignoreCase = true)
            }
        }
    }
    
    Column {
        OutlinedButton(
            onClick = { expanded = !expanded },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(text = selectedRoleId?.let { roles[it] } ?: label)
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
                        items(filteredRoles.toList()) { (id, name) ->
                            TextButton(
                                onClick = {
                                    onRoleSelected(id)
                                    expanded = false
                                    searchQuery = ""
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(Modifier.fillMaxWidth()) {
                                    Text(name, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        "ID: $id",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                            Divider()
                        }
                    }
                }
            }
        }
    }
}
