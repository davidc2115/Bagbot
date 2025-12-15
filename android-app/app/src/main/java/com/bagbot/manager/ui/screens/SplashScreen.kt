package com.bagbot.manager.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bagbot.manager.data.repository.BotRepository
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    repository: BotRepository,
    onNavigateToSetup: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateToDashboard: () -> Unit
) {
    LaunchedEffect(Unit) {
        delay(1500) // Afficher le splash pendant 1.5 secondes
        
        val baseUrl = repository.getBaseUrl()
        val token = repository.getAuthToken()
        
        when {
            baseUrl == null -> onNavigateToSetup()
            token == null -> onNavigateToLogin()
            else -> {
                // Vérifier si le token est valide
                val healthResult = repository.checkHealth()
                if (healthResult.isSuccess) {
                    onNavigateToDashboard()
                } else {
                    // Token invalide ou serveur inaccessible
                    onNavigateToLogin()
                }
            }
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "🤖",
                fontSize = 72.sp
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "BagBot Manager",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Gérez votre bot Discord",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.8f)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            CircularProgressIndicator(
                color = Color.White
            )
        }
    }
}
