package com.bagbot.manager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bagbot.manager.data.repository.BotRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModerationScreen(
    repository: BotRepository,
    guildId: String,
    onBack: () -> Unit
) {
    var showBanDialog by remember { mutableStateOf(false) }
    var showKickDialog by remember { mutableStateOf(false) }
    var userId by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var actionResult by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Modération") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Retour")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Actions de modération",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "Gérer les membres du serveur",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
            
            if (actionResult != null) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Text(
                        text = "✅ $actionResult",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }
            
            Text(
                text = "Actions disponibles",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            ModerationActionCard(
                icon = Icons.Default.PersonRemove,
                title = "Expulser un utilisateur",
                description = "Expulser un membre du serveur (peut revenir)",
                onClick = { showKickDialog = true }
            )
            
            ModerationActionCard(
                icon = Icons.Default.Block,
                title = "Bannir un utilisateur",
                description = "Bannir définitivement un membre du serveur",
                onClick = { showBanDialog = true },
                dangerous = true
            )
            
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "ℹ️ Information",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Pour effectuer des actions de modération, vous devez connaître l'ID Discord de l'utilisateur. " +
                                "Vous pouvez l'obtenir en activant le mode développeur dans Discord.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                }
            }
        }
    }
    
    // Dialog pour Kick
    if (showKickDialog) {
        ModerationDialog(
            title = "Expulser un utilisateur",
            icon = Icons.Default.PersonRemove,
            onDismiss = { 
                showKickDialog = false
                userId = ""
                reason = ""
            },
            onConfirm = {
                scope.launch {
                    isLoading = true
                    val result = repository.kickUser(guildId, userId, reason.ifEmpty { null })
                    if (result.isSuccess) {
                        actionResult = "Utilisateur expulsé avec succès"
                        showKickDialog = false
                        userId = ""
                        reason = ""
                    } else {
                        actionResult = "Erreur : ${result.exceptionOrNull()?.message}"
                    }
                    isLoading = false
                }
            },
            userId = userId,
            onUserIdChange = { userId = it },
            reason = reason,
            onReasonChange = { reason = it },
            isLoading = isLoading
        )
    }
    
    // Dialog pour Ban
    if (showBanDialog) {
        ModerationDialog(
            title = "Bannir un utilisateur",
            icon = Icons.Default.Block,
            onDismiss = { 
                showBanDialog = false
                userId = ""
                reason = ""
            },
            onConfirm = {
                scope.launch {
                    isLoading = true
                    val result = repository.banUser(guildId, userId, reason.ifEmpty { null })
                    if (result.isSuccess) {
                        actionResult = "Utilisateur banni avec succès"
                        showBanDialog = false
                        userId = ""
                        reason = ""
                    } else {
                        actionResult = "Erreur : ${result.exceptionOrNull()?.message}"
                    }
                    isLoading = false
                }
            },
            userId = userId,
            onUserIdChange = { userId = it },
            reason = reason,
            onReasonChange = { reason = it },
            isLoading = isLoading,
            dangerous = true
        )
    }
}

@Composable
fun ModerationActionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    onClick: () -> Unit,
    dangerous: Boolean = false
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = if (dangerous) {
            CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer
            )
        } else {
            CardDefaults.cardColors()
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = if (dangerous) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.primary
                }
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (dangerous) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    }
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (dangerous) {
                        MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f)
                    } else {
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    }
                )
            }
            
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = if (dangerous) {
                    MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.5f)
                } else {
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                }
            )
        }
    }
}

@Composable
fun ModerationDialog(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    userId: String,
    onUserIdChange: (String) -> Unit,
    reason: String,
    onReasonChange: (String) -> Unit,
    isLoading: Boolean,
    dangerous: Boolean = false
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(icon, contentDescription = null)
        },
        title = {
            Text(text = title)
        },
        text = {
            Column {
                OutlinedTextField(
                    value = userId,
                    onValueChange = onUserIdChange,
                    label = { Text("ID Utilisateur") },
                    placeholder = { Text("123456789012345678") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = reason,
                    onValueChange = onReasonChange,
                    label = { Text("Raison (optionnel)") },
                    placeholder = { Text("Comportement inapproprié") },
                    minLines = 2,
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
                
                if (dangerous) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "⚠️ Cette action est définitive",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = userId.isNotEmpty() && !isLoading,
                colors = if (dangerous) {
                    ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                } else {
                    ButtonDefaults.buttonColors()
                }
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Confirmer")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
