package com.bagbot.manager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.bagbot.manager.ui.theme.*
import kotlinx.coroutines.delay
import androidx.compose.foundation.Image
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.bagbot.manager.R

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        delay(2500)
        isLoading = false
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = listOf(BagDarkPurple, BagPurple, BagPink))),
        contentAlignment = Alignment.Center
    ) {
        // Image plein écran (remplace le texte)
        Image(
            painter = painterResource(id = R.drawable.bag_server_logo),
            contentDescription = "Splash",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        if (isLoading) {
            CircularProgressIndicator(
                color = BagWhite,
                strokeWidth = 3.dp,
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 32.dp)
            )
        }
    }
}
