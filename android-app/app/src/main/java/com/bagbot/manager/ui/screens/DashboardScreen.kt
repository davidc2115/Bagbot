package com.bagbot.manager.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.bagbot.manager.data.models.BotStats
import com.bagbot.manager.data.repository.BotRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    repository: BotRepository,
    navController: NavController,
    onNavigateToGuilds: () -> Unit,
    onNavigateToCommands: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit
) {
    var botStats by remember { mutableStateOf<BotStats?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var userInfo by remember { mutableStateOf<com.bagbot.manager.data.models.DiscordUser?>(null) }
    val scope = rememberCoroutineScope()
    
    // Auto-refresh toutes les 10 secondes
    LaunchedEffect(Unit) {
        userInfo = repository.getUserInfo()
        
        while (true) {
            isLoading = true
            val result = repository.getBotStats()
            if (result.isSuccess) {
                botStats = result.getOrNull()
                errorMessage = null
            } else {
                errorMessage = result.exceptionOrNull()?.message
            }
            isLoading = false
            delay(10000) // Rafraîchir toutes les 10 secondes
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Paramètres",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // User Info Card
            item {
                userInfo?.let { user ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
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
                            Text(
                                text = "👤",
                                fontSize = 32.sp
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = user.getDisplayName(),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Connecté",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                }
            }
            
            // Stats Section
            item {
                Text(
                    text = "Statistiques du Bot",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
            
            item {
                if (isLoading && botStats == null) {
                    Card(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                } else if (errorMessage != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            text = "❌ $errorMessage",
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                } else {
                    botStats?.let { stats ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            StatCard(
                                icon = "🌐",
                                label = "Serveurs",
                                value = stats.guilds.toString(),
                                modifier = Modifier.weight(1f)
                            )
                            StatCard(
                                icon = "👥",
                                label = "Utilisateurs",
                                value = stats.users.toString(),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
            
            item {
                botStats?.let { stats ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatCard(
                            icon = "⏱️",
                            label = "Uptime",
                            value = stats.getUptimeFormatted(),
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            icon = "📡",
                            label = "Ping",
                            value = "${stats.ping}ms",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
            
            // Quick Actions Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Actions rapides",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
            
            item {
                QuickActionCard(
                    icon = Icons.Default.Home,
                    title = "Serveurs",
                    description = "Gérer les serveurs du bot",
                    onClick = onNavigateToGuilds
                )
            }
            
            item {
                QuickActionCard(
                    icon = Icons.Default.List,
                    title = "Commandes",
                    description = "Voir toutes les commandes disponibles",
                    onClick = onNavigateToCommands
                )
            }
            
            item {
                QuickActionCard(
                    icon = Icons.Default.Settings,
                    title = "Paramètres",
                    description = "Configurer l'application",
                    onClick = onNavigateToSettings
                )
            }
        }
    }
}

@Composable
fun StatCard(
    icon: String,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = icon,
                fontSize = 32.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
fun QuickActionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
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
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
            Icon(
                Icons.Default.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}
