package com.bagbot.manager.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.bagbot.manager.data.api.ApiClient
import com.bagbot.manager.data.repository.BotRepository
import com.bagbot.manager.ui.screens.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Setup : Screen("setup")
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object Guilds : Screen("guilds")
    object Commands : Screen("commands")
    object Music : Screen("music/{guildId}") {
        fun createRoute(guildId: String) = "music/$guildId"
    }
    object Moderation : Screen("moderation/{guildId}") {
        fun createRoute(guildId: String) = "moderation/$guildId"
    }
    object Settings : Screen("settings")
}

@Composable
fun BagBotNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val repository = remember { BotRepository(context) }
    
    // Initialiser le token d'authentification au démarrage
    val isLoggedIn by repository.isLoggedInFlow().collectAsState(initial = false)
    
    // Charger le token et l'URL de base
    remember {
        CoroutineScope(Dispatchers.IO).launch {
            val token = repository.getAuthToken()
            val baseUrl = repository.getBaseUrl()
            
            token?.let { ApiClient.setAuthToken(it) }
            baseUrl?.let { ApiClient.setBaseUrl(it) }
        }
    }
    
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                repository = repository,
                onNavigateToSetup = {
                    navController.navigate(Screen.Setup.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToDashboard = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Setup.route) {
            SetupScreen(
                repository = repository,
                onSetupComplete = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Setup.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Login.route) {
            LoginScreen(
                repository = repository,
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                repository = repository,
                navController = navController,
                onNavigateToGuilds = {
                    navController.navigate(Screen.Guilds.route)
                },
                onNavigateToCommands = {
                    navController.navigate(Screen.Commands.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Guilds.route) {
            GuildsScreen(
                repository = repository,
                navController = navController,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Commands.route) {
            CommandsScreen(
                repository = repository,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Music.route) { backStackEntry ->
            val guildId = backStackEntry.arguments?.getString("guildId") ?: ""
            MusicScreen(
                repository = repository,
                guildId = guildId,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Moderation.route) { backStackEntry ->
            val guildId = backStackEntry.arguments?.getString("guildId") ?: ""
            ModerationScreen(
                repository = repository,
                guildId = guildId,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                repository = repository,
                onBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
