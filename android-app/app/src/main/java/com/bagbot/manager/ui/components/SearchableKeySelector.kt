package com.bagbot.manager.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Sélecteur (clé/label) avec recherche + scroll.
 * Utile quand il y a beaucoup d'items (ex: actions économie).
 */
@Composable
fun SearchableKeySelector(
    items: List<Pair<String, String>>,
    selectedKey: String?,
    onSelected: (String) -> Unit,
    label: String = "Sélectionner..."
) {
    var expanded by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val labelByKey = remember(items) { items.toMap() }
    val filtered = remember(items, searchQuery) {
        val q = searchQuery.trim()
        if (q.isBlank()) items
        else items.filter { (k, v) ->
            k.contains(q, ignoreCase = true) || v.contains(q, ignoreCase = true)
        }
    }

    Column {
        OutlinedButton(
            onClick = { expanded = !expanded },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(text = selectedKey?.let { labelByKey[it] } ?: label)
        }

        if (expanded) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 420.dp)
            ) {
                Column {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Rechercher...") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp)
                    )

                    LazyColumn {
                        items(filtered, key = { it.first }) { (k, v) ->
                            TextButton(
                                onClick = {
                                    onSelected(k)
                                    expanded = false
                                    searchQuery = ""
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(v, modifier = Modifier.fillMaxWidth())
                            }
                            Divider()
                        }
                    }
                }
            }
        }
    }
}

