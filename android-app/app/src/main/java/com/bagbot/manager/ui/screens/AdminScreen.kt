package com.bagbot.manager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ApiClient
import com.bagbot.manager.ui.components.MemberSelector
import com.bagbot.manager.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*

@Composable
fun AdminScreen(
    api: ApiClient,
    members: Map<String, String>,
    onShowSnackbar: suspend (String) -> Unit
) {
    var allowedUsers by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var selectedMember by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val json = remember { Json { ignoreUnknownKeys = true } }
    
    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val response = api.getJson("/api/admin/allowed-users")
            val data = json.parseToJsonElement(response).jsonObject
            allowedUsers = data["allowedUsers"]?.jsonArray?.map {
                it.jsonPrimitive.content
            } ?: emptyList()
        } catch (e: Exception) {
            onShowSnackbar("Erreur: ${e.message}")
        } finally {
            isLoading = false
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = BagPurple
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Security,
                    contentDescription = null,
                    tint = BagWhite,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(
                        "Gestion des Accès",
                        style = MaterialTheme.typography.headlineSmall,
                        color = BagWhite
                    )
                    Text(
                        "${allowedUsers.size} utilisateur(s) autorisé(s)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = BagLightPurple
                    )
                }
            }
        }
        
        Spacer(Modifier.height(24.dp))
        
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Ajouter un utilisateur",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(Modifier.height(8.dp))
                
                MemberSelector(
                    members = members.filterKeys { !allowedUsers.contains(it) },
                    selectedMemberId = selectedMember,
                    onMemberSelected = { selectedMember = it },
                    label = "Sélectionner un membre"
                )
                
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        selectedMember?.let { userId ->
                            scope.launch {
                                isLoading = true
                                try {
                                    val body = """{"userId":"$userId"}"""
                                    api.postJson("/api/admin/allowed-users/add", body)
                                    
                                    val response = api.getJson("/api/admin/allowed-users")
                                    val data = json.parseToJsonElement(response).jsonObject
                                    allowedUsers = data["allowedUsers"]?.jsonArray?.map {
                                        it.jsonPrimitive.content
                                    } ?: emptyList()
                                    
                                    selectedMember = null
                                    onShowSnackbar("✅ Utilisateur ajouté")
                                } catch (e: Exception) {
                                    onShowSnackbar("❌ Erreur: ${e.message}")
                                } finally {
                                    isLoading = false
                                }
                            }
                        }
                    },
                    enabled = selectedMember != null && !isLoading,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Autoriser l'accès")
                }
            }
        }
        
        Spacer(Modifier.height(24.dp))
        
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BagError.copy(alpha = 0.1f))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        tint = BagError,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Révocation totale d'accès",
                        style = MaterialTheme.typography.titleMedium,
                        color = BagError
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "Retirer DÉFINITIVEMENT l'accès à l'application (même si admin)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                Spacer(Modifier.height(12.dp))
                
                var userToRevoke by remember { mutableStateOf<String?>(null) }
                var showRevokeConfirm by remember { mutableStateOf(false) }
                
                MemberSelector(
                    members = allowedUsers.associateWith { members[it] ?: "Utilisateur $it" },
                    selectedMemberId = userToRevoke,
                    onMemberSelected = { userToRevoke = it },
                    label = "Sélectionner l'utilisateur à révoquer"
                )
                
                Spacer(Modifier.height(8.dp))
                
                Button(
                    onClick = { showRevokeConfirm = true },
                    enabled = userToRevoke != null && !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = BagError)
                ) {
                    Icon(Icons.Default.Block, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Révoquer définitivement")
                }
                
                if (showRevokeConfirm && userToRevoke != null) {
                    AlertDialog(
                        onDismissRequest = { showRevokeConfirm = false },
                        title = { Text("⚠️ Confirmation") },
                        text = {
                            Column {
                                Text("Voulez-vous vraiment révoquer DÉFINITIVEMENT l'accès de :")
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    members[userToRevoke] ?: "Utilisateur inconnu",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = BagError
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "Cette action est irréversible et retire tous les droits, même admin.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        },
                        confirmButton = {
                            Button(
                                onClick = {
                                    scope.launch {
                                        isLoading = true
                                        try {
                                            val body = """{"userId":"$userToRevoke","permanent":true}"""
                                            api.postJson("/api/admin/allowed-users/revoke", body)
                                            
                                            val response = api.getJson("/api/admin/allowed-users")
                                            val data = json.parseToJsonElement(response).jsonObject
                                            allowedUsers = data["allowedUsers"]?.jsonArray?.map {
                                                it.jsonPrimitive.content
                                            } ?: emptyList()
                                            
                                            userToRevoke = null
                                            showRevokeConfirm = false
                                            onShowSnackbar("✅ Accès révoqué définitivement")
                                        } catch (e: Exception) {
                                            onShowSnackbar("❌ Erreur: ${e.message}")
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = BagError)
                            ) {
                                Text("Révoquer")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showRevokeConfirm = false }) {
                                Text("Annuler")
                            }
                        }
                    )
                }
            }
        }
        
        Spacer(Modifier.height(24.dp))
        
        Text(
            "Utilisateurs autorisés",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(Modifier.height(8.dp))
        
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (allowedUsers.isEmpty()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Aucun utilisateur autorisé pour le moment",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(allowedUsers) { userId ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = BagCard
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    members[userId] ?: "Utilisateur inconnu",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                Text(
                                    "ID: $userId",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                            
                            IconButton(
                                onClick = {
                                    scope.launch {
                                        isLoading = true
                                        try {
                                            val body = """{"userId":"$userId"}"""
                                            api.postJson("/api/admin/allowed-users/remove", body)
                                            
                                            val response = api.getJson("/api/admin/allowed-users")
                                            val data = json.parseToJsonElement(response).jsonObject
                                            allowedUsers = data["allowedUsers"]?.jsonArray?.map {
                                                it.jsonPrimitive.content
                                            } ?: emptyList()
                                            
                                            onShowSnackbar("✅ Utilisateur retiré")
                                        } catch (e: Exception) {
                                            onShowSnackbar("❌ Erreur: ${e.message}")
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                }
                            ) {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = "Retirer l'accès",
                                    tint = BagError
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
