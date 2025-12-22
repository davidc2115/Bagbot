package com.bagbot.manager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bagbot.manager.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

data class MotCacheProgress(
    val wordDisplay: String = "",
    val letters: List<String> = emptyList(),
    val letterCount: Int = 0,
    val wordLength: Int = 0,
    val progress: Int = 0
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MotCacheScreen(
    api: ApiClient,
    json: Json,
    scope: CoroutineScope,
    snackbar: SnackbarHostState
) {
    var isLoading by remember { mutableStateOf(true) }
    var isActive by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf(MotCacheProgress()) }
    var guessText by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    // Charger les données
    fun loadData() {
        scope.launch {
            isLoading = true
            errorMessage = null
            try {
                val result = withContext(Dispatchers.IO) {
                    api.getJson("/api/mot-cache/my-progress")
                }
                val jsonResult = json.parseToJsonElement(result).jsonObject
                
                isActive = jsonResult["active"]?.jsonPrimitive?.booleanOrNull ?: false
                
                if (isActive) {
                    progress = MotCacheProgress(
                        wordDisplay = jsonResult["wordDisplay"]?.jsonPrimitive?.contentOrNull ?: "",
                        letters = jsonResult["letters"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList(),
                        letterCount = jsonResult["letterCount"]?.jsonPrimitive?.intOrNull ?: 0,
                        wordLength = jsonResult["wordLength"]?.jsonPrimitive?.intOrNull ?: 0,
                        progress = jsonResult["progress"]?.jsonPrimitive?.intOrNull ?: 0
                    )
                }
            } catch (e: Exception) {
                errorMessage = "Erreur : ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }
    
    // Soumettre une proposition
    fun submitGuess() {
        if (guessText.isBlank()) return
        
        scope.launch {
            isSubmitting = true
            errorMessage = null
            try {
                val payload = buildJsonObject {
                    put("guess", guessText.uppercase())
                }
                
                val result = withContext(Dispatchers.IO) {
                    api.postJson("/api/mot-cache/guess", payload.toString())
                }
                val jsonResult = json.parseToJsonElement(result).jsonObject
                
                val success = jsonResult["success"]?.jsonPrimitive?.booleanOrNull ?: false
                val message = jsonResult["message"]?.jsonPrimitive?.contentOrNull ?: ""
                
                if (success) {
                    val isCorrect = jsonResult["correct"]?.jsonPrimitive?.booleanOrNull ?: false
                    if (isCorrect) {
                        val reward = jsonResult["reward"]?.jsonPrimitive?.intOrNull ?: 0
                        snackbar.showSnackbar("🎉 Bravo ! Vous avez gagné $reward BAG$ !")
                        guessText = ""
                        loadData()
                    } else {
                        snackbar.showSnackbar("❌ $message")
                        guessText = ""
                    }
                } else {
                    errorMessage = message
                }
            } catch (e: Exception) {
                errorMessage = "Erreur : ${e.message}"
            } finally {
                isSubmitting = false
            }
        }
    }
    
    // Charger au démarrage
    LaunchedEffect(Unit) {
        loadData()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("🔍 Jeu Mot-Caché") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E1E1E),
                    titleContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(Icons.Default.Refresh, "Actualiser", tint = Color.White)
                    }
                }
            )
        },
        containerColor = Color(0xFF121212)
    ) { padding ->
        if (isLoading) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF9C27B0))
            }
        } else if (!isActive) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(32.dp)
                ) {
                    Icon(
                        Icons.Default.Search,
                        null,
                        modifier = Modifier.size(80.dp),
                        tint = Color.Gray
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Aucun jeu actif",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Le jeu mot-caché n'est pas activé pour le moment.",
                        textAlign = TextAlign.Center,
                        color = Color.Gray
                    )
                }
            }
        } else {
            LazyColumn(
                Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Carte progression
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text(
                                "🎯 Votre Progression",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            
                            Spacer(Modifier.height(16.dp))
                            
                            // Mot à deviner
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
                            ) {
                                Box(
                                    Modifier.fillMaxWidth().padding(24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        progress.wordDisplay,
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF9C27B0),
                                        letterSpacing = 4.sp
                                    )
                                }
                            }
                            
                            Spacer(Modifier.height(16.dp))
                            
                            // Barre de progression
                            Column {
                                Text(
                                    "Progression : ${progress.progress}%",
                                    color = Color.Gray,
                                    fontSize = 14.sp
                                )
                                Spacer(Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = progress.progress / 100f,
                                    modifier = Modifier.fillMaxWidth().height(8.dp),
                                    color = Color(0xFF9C27B0),
                                    trackColor = Color(0xFF3A3A3A)
                                )
                            }
                            
                            Spacer(Modifier.height(16.dp))
                            
                            // Stats
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceAround
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        "${progress.letterCount}",
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF4CAF50)
                                    )
                                    Text("Lettres trouvées", fontSize = 12.sp, color = Color.Gray)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        "${progress.wordLength}",
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFFF9800)
                                    )
                                    Text("Lettres totales", fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                        }
                    }
                }
                
                // Lettres collectées
                if (progress.letters.isNotEmpty()) {
                    item {
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(Modifier.padding(20.dp)) {
                                Text(
                                    "📝 Lettres Collectées",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(Modifier.height(12.dp))
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    progress.letters.forEach { letter ->
                                        Box(
                                            Modifier
                                                .size(48.dp)
                                                .background(Color(0xFF9C27B0), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                letter,
                                                fontSize = 20.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Formulaire de proposition
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text(
                                "✍️ Proposer une Réponse",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(Modifier.height(12.dp))
                            
                            OutlinedTextField(
                                value = guessText,
                                onValueChange = { guessText = it.uppercase() },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("Entrez le mot") },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.LightGray,
                                    focusedBorderColor = Color(0xFF9C27B0),
                                    unfocusedBorderColor = Color.Gray
                                ),
                                enabled = !isSubmitting
                            )
                            
                            Spacer(Modifier.height(16.dp))
                            
                            Button(
                                onClick = { submitGuess() },
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                enabled = guessText.isNotBlank() && !isSubmitting,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF9C27B0),
                                    disabledContainerColor = Color.Gray
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = Color.White
                                    )
                                } else {
                                    Icon(Icons.Default.Send, null, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Valider", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
                
                // Message d'erreur
                errorMessage?.let { error ->
                    item {
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF3E2723))
                        ) {
                            Row(
                                Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Error,
                                    null,
                                    tint = Color(0xFFFF5252)
                                )
                                Spacer(Modifier.width(12.dp))
                                Text(error, color = Color(0xFFFF8A80))
                            }
                        }
                    }
                }
                
                // Aide
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3A5F))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, null, tint = Color(0xFF64B5F6))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Comment jouer ?",
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64B5F6)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "• Les lettres apparaissent aléatoirement sous les messages\n" +
                                "• Collectez toutes les lettres pour voir le mot complet\n" +
                                "• Proposez le mot pour gagner la récompense !",
                                color = Color(0xFFBBDEFB),
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
