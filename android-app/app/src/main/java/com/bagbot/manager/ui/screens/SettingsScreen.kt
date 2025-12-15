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
fun SettingsScreen(
    repository: BotRepository,
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showServerUrlDialog by remember { mutableStateOf(false) }
    var currentUrl by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    
    LaunchedEffect(Unit) {
        currentUrl = repository.getBaseUrl() ?: ""
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paramètres") },
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
            Text(
                text = "Configuration",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            SettingsCard(
                icon = Icons.Default.Storage,
                title = "URL du serveur",
                description = currentUrl.ifEmpty { "Non configuré" },
                onClick = { showServerUrlDialog = true }
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Compte",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            SettingsCard(
                icon = Icons.Default.Logout,
                title = "Déconnexion",
                description = "Se déconnecter de l'application",
                onClick = { showLogoutDialog = true },
                dangerous = true
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "BagBot Manager",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Version 1.0.0",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "© 2024 - Gestion de bot Discord",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
    
    // Dialog de déconnexion
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            icon = {
                Icon(Icons.Default.Logout, contentDescription = null)
            },
            title = {
                Text(text = "Déconnexion")
            },
            text = {
                Text("Êtes-vous sûr de vouloir vous déconnecter ?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            repository.logout()
                            onLogout()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Déconnexion")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
    
    // Dialog de changement d'URL
    if (showServerUrlDialog) {
        var newUrl by remember { mutableStateOf(currentUrl) }
        var isLoading by remember { mutableStateOf(false) }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        
        AlertDialog(
            onDismissRequest = { showServerUrlDialog = false },
            icon = {
                Icon(Icons.Default.Storage, contentDescription = null)
            },
            title = {
                Text(text = "Modifier l'URL du serveur")
            },
            text = {
                Column {
                    OutlinedTextField(
                        value = newUrl,
                        onValueChange = { 
                            newUrl = it
                            errorMessage = null
                        },
                        label = { Text("URL du serveur") },
                        placeholder = { Text("http://192.168.1.100:3001") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        isError = errorMessage != null
                    )
                    
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            errorMessage = null
                            
                            try {
                                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                                    errorMessage = "L'URL doit commencer par http:// ou https://"
                                    isLoading = false
                                    return@launch
                                }
                                
                                repository.saveBaseUrl(newUrl)
                                val healthResult = repository.checkHealth()
                                
                                if (healthResult.isSuccess) {
                                    currentUrl = newUrl
                                    showServerUrlDialog = false
                                } else {
                                    errorMessage = "Impossible de se connecter au serveur"
                                }
                            } catch (e: Exception) {
                                errorMessage = e.message
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = newUrl.isNotEmpty() && !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Enregistrer")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerUrlDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
}

@Composable
fun SettingsCard(
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
