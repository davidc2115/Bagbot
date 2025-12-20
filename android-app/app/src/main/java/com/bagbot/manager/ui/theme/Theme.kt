package com.bagbot.manager.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = BagPurple,
    secondary = BagPink,
    tertiary = BagLightPurple,
    background = BagBackground,
    surface = BagSurface,
    onPrimary = BagWhite,
    onSecondary = BagWhite,
    onTertiary = BagWhite,
    onBackground = BagWhite,
    onSurface = BagWhite,
    error = BagError,
    onError = BagWhite
)

@Composable
fun BagBotTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
