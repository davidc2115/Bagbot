/**
 * 🤖 Exemple d'intégration Llama dans une Application Android
 * 
 * Cette classe montre comment communiquer avec Ollama/Llama
 * depuis une application Android Kotlin/Compose
 * 
 * Date: 24 Décembre 2025
 * 
 * Prérequis:
 * - Ollama installé sur un serveur accessible (Oracle Cloud, VPS, etc.)
 * - Permission INTERNET dans AndroidManifest.xml
 * 
 * Dépendances (build.gradle.kts):
 * implementation("com.squareup.okhttp3:okhttp:4.12.0")
 * implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
 * implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
 */

package com.example.llamaapp

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Client API pour communiquer avec Ollama
 */
class OllamaClient(
    private val baseUrl: String = "http://YOUR-SERVER-IP:11434",
    private val defaultModel: String = "llama3.2:3b"
) {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS) // Llama peut être lent
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    /**
     * Modèles de données
     */
    @Serializable
    data class GenerateRequest(
        val model: String,
        val prompt: String,
        val stream: Boolean = false,
        val temperature: Double? = null,
        val top_p: Double? = null,
        val max_tokens: Int? = null
    )
    
    @Serializable
    data class GenerateResponse(
        val model: String,
        val created_at: String,
        val response: String,
        val done: Boolean,
        val context: List<Int>? = null,
        val total_duration: Long? = null,
        val load_duration: Long? = null,
        val prompt_eval_duration: Long? = null,
        val eval_count: Int? = null,
        val eval_duration: Long? = null
    )
    
    @Serializable
    data class ChatMessage(
        val role: String, // "system", "user", "assistant"
        val content: String
    )
    
    @Serializable
    data class ChatRequest(
        val model: String,
        val messages: List<ChatMessage>,
        val stream: Boolean = false
    )
    
    @Serializable
    data class ChatResponse(
        val model: String,
        val created_at: String,
        val message: ChatMessage,
        val done: Boolean
    )
    
    @Serializable
    data class ModelInfo(
        val name: String,
        val modified_at: String,
        val size: Long
    )
    
    @Serializable
    data class ModelsResponse(
        val models: List<ModelInfo>
    )
    
    /**
     * Génère du texte à partir d'un prompt simple
     * 
     * @param prompt Le texte d'entrée
     * @param model Le modèle à utiliser (défaut: llama3.2:3b)
     * @return La réponse générée
     */
    suspend fun generate(
        prompt: String,
        model: String = defaultModel,
        temperature: Double? = null,
        maxTokens: Int? = null
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val requestBody = GenerateRequest(
                model = model,
                prompt = prompt,
                stream = false,
                temperature = temperature,
                max_tokens = maxTokens
            )
            
            val jsonBody = json.encodeToString(GenerateRequest.serializer(), requestBody)
            
            val request = Request.Builder()
                .url("$baseUrl/api/generate")
                .post(jsonBody.toRequestBody("application/json".toMediaType()))
                .build()
            
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("Erreur HTTP: ${response.code} - ${response.message}")
                    )
                }
                
                val responseBody = response.body?.string() 
                    ?: return@withContext Result.failure(IOException("Réponse vide"))
                
                val generateResponse = json.decodeFromString<GenerateResponse>(responseBody)
                
                Log.d("OllamaClient", "Génération réussie: ${generateResponse.response.length} caractères")
                Log.d("OllamaClient", "Durée totale: ${generateResponse.total_duration?.div(1_000_000)}ms")
                
                Result.success(generateResponse.response)
            }
        } catch (e: Exception) {
            Log.e("OllamaClient", "Erreur lors de la génération", e)
            Result.failure(e)
        }
    }
    
    /**
     * Chat avec contexte (conversation multi-tours)
     * 
     * @param messages Liste des messages de la conversation
     * @param model Le modèle à utiliser
     * @return La réponse du modèle
     */
    suspend fun chat(
        messages: List<ChatMessage>,
        model: String = defaultModel
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val requestBody = ChatRequest(
                model = model,
                messages = messages,
                stream = false
            )
            
            val jsonBody = json.encodeToString(ChatRequest.serializer(), requestBody)
            
            val request = Request.Builder()
                .url("$baseUrl/api/chat")
                .post(jsonBody.toRequestBody("application/json".toMediaType()))
                .build()
            
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("Erreur HTTP: ${response.code}")
                    )
                }
                
                val responseBody = response.body?.string() 
                    ?: return@withContext Result.failure(IOException("Réponse vide"))
                
                val chatResponse = json.decodeFromString<ChatResponse>(responseBody)
                
                Log.d("OllamaClient", "Chat réussi: ${chatResponse.message.content}")
                
                Result.success(chatResponse.message.content)
            }
        } catch (e: Exception) {
            Log.e("OllamaClient", "Erreur lors du chat", e)
            Result.failure(e)
        }
    }
    
    /**
     * Liste les modèles disponibles sur le serveur
     * 
     * @return Liste des modèles installés
     */
    suspend fun listModels(): Result<List<ModelInfo>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/tags")
                .get()
                .build()
            
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("Erreur HTTP: ${response.code}")
                    )
                }
                
                val responseBody = response.body?.string() 
                    ?: return@withContext Result.failure(IOException("Réponse vide"))
                
                val modelsResponse = json.decodeFromString<ModelsResponse>(responseBody)
                
                Log.d("OllamaClient", "Modèles trouvés: ${modelsResponse.models.size}")
                
                Result.success(modelsResponse.models)
            }
        } catch (e: Exception) {
            Log.e("OllamaClient", "Erreur lors de la récupération des modèles", e)
            Result.failure(e)
        }
    }
    
    /**
     * Vérifie si le serveur est accessible
     */
    suspend fun ping(): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/tags")
                .get()
                .build()
            
            client.newCall(request).execute().use { response ->
                Result.success(response.isSuccessful)
            }
        } catch (e: Exception) {
            Log.e("OllamaClient", "Serveur non accessible", e)
            Result.failure(e)
        }
    }
}

/**
 * ViewModel pour gérer l'état de l'application
 */
@androidx.lifecycle.ViewModel
class LlamaViewModel(
    private val ollamaClient: OllamaClient
) : androidx.lifecycle.ViewModel() {
    
    private val _messages = androidx.compose.runtime.mutableStateListOf<ChatMessage>()
    val messages: List<ChatMessage> get() = _messages
    
    private val _isLoading = androidx.compose.runtime.mutableStateOf(false)
    val isLoading: Boolean get() = _isLoading.value
    
    private val _error = androidx.compose.runtime.mutableStateOf<String?>(null)
    val error: String? get() = _error.value
    
    /**
     * Envoie un message à Llama
     */
    fun sendMessage(userMessage: String) {
        if (userMessage.isBlank()) return
        
        // Ajouter le message utilisateur
        _messages.add(ChatMessage(role = "user", content = userMessage))
        _isLoading.value = true
        _error.value = null
        
        // Appeler Llama
        viewModelScope.launch {
            ollamaClient.chat(_messages).onSuccess { response ->
                _messages.add(ChatMessage(role = "assistant", content = response))
                _isLoading.value = false
            }.onFailure { exception ->
                _error.value = exception.message ?: "Erreur inconnue"
                _isLoading.value = false
                Log.e("LlamaViewModel", "Erreur d'envoi", exception)
            }
        }
    }
    
    /**
     * Génération simple (sans contexte)
     */
    fun generateSimple(prompt: String, onResult: (Result<String>) -> Unit) {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            val result = ollamaClient.generate(prompt)
            _isLoading.value = false
            onResult(result)
        }
    }
    
    /**
     * Réinitialise la conversation
     */
    fun clearChat() {
        _messages.clear()
        _error.value = null
    }
}

/**
 * Interface Compose pour le chat avec Llama
 */
@androidx.compose.runtime.Composable
fun LlamaChatScreen(
    viewModel: LlamaViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    var inputText by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("") }
    
    androidx.compose.material3.Scaffold(
        topBar = {
            androidx.compose.material3.TopAppBar(
                title = { androidx.compose.material3.Text("Chat avec Llama") },
                actions = {
                    androidx.compose.material3.IconButton(onClick = { viewModel.clearChat() }) {
                        androidx.compose.material3.Icon(
                            androidx.compose.material.icons.Icons.Default.Delete,
                            contentDescription = "Effacer"
                        )
                    }
                }
            )
        }
    ) { padding ->
        androidx.compose.foundation.layout.Column(
            modifier = androidx.compose.ui.Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Liste des messages
            androidx.compose.foundation.lazy.LazyColumn(
                modifier = androidx.compose.ui.Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                reverseLayout = true
            ) {
                items(viewModel.messages.reversed()) { message ->
                    ChatBubble(message)
                }
            }
            
            // Indicateur de chargement
            if (viewModel.isLoading) {
                androidx.compose.foundation.layout.Row(
                    modifier = androidx.compose.ui.Modifier.padding(16.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    androidx.compose.material3.CircularProgressIndicator(
                        modifier = androidx.compose.ui.Modifier.size(24.dp)
                    )
                    androidx.compose.foundation.layout.Spacer(
                        modifier = androidx.compose.ui.Modifier.width(8.dp)
                    )
                    androidx.compose.material3.Text("Llama réfléchit...")
                }
            }
            
            // Message d'erreur
            viewModel.error?.let { error ->
                androidx.compose.material3.Text(
                    text = "Erreur: $error",
                    color = androidx.compose.material3.MaterialTheme.colorScheme.error,
                    modifier = androidx.compose.ui.Modifier.padding(16.dp)
                )
            }
            
            // Champ de saisie
            androidx.compose.foundation.layout.Row(
                modifier = androidx.compose.ui.Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
            ) {
                androidx.compose.material3.OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    modifier = androidx.compose.ui.Modifier.weight(1f),
                    placeholder = { androidx.compose.material3.Text("Posez une question...") },
                    enabled = !viewModel.isLoading
                )
                
                androidx.compose.foundation.layout.Spacer(
                    modifier = androidx.compose.ui.Modifier.width(8.dp)
                )
                
                androidx.compose.material3.Button(
                    onClick = {
                        if (inputText.isNotBlank()) {
                            viewModel.sendMessage(inputText)
                            inputText = ""
                        }
                    },
                    enabled = !viewModel.isLoading && inputText.isNotBlank()
                ) {
                    androidx.compose.material3.Icon(
                        androidx.compose.material.icons.Icons.Default.Send,
                        contentDescription = "Envoyer"
                    )
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
fun ChatBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    
    androidx.compose.foundation.layout.Row(
        modifier = androidx.compose.ui.Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = if (isUser) 
            androidx.compose.foundation.layout.Arrangement.End 
        else 
            androidx.compose.foundation.layout.Arrangement.Start
    ) {
        androidx.compose.material3.Card(
            modifier = androidx.compose.ui.Modifier.widthIn(max = 280.dp),
            colors = androidx.compose.material3.CardDefaults.cardColors(
                containerColor = if (isUser) 
                    androidx.compose.material3.MaterialTheme.colorScheme.primaryContainer
                else
                    androidx.compose.material3.MaterialTheme.colorScheme.secondaryContainer
            )
        ) {
            androidx.compose.material3.Text(
                text = message.content,
                modifier = androidx.compose.ui.Modifier.padding(12.dp),
                style = androidx.compose.material3.MaterialTheme.typography.bodyMedium
            )
        }
    }
}

/**
 * Configuration dans MainActivity
 */
class MainActivity : androidx.activity.ComponentActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialiser le client Ollama
        val ollamaClient = OllamaClient(
            baseUrl = "http://YOUR-SERVER-IP:11434", // ← Remplacer par votre IP
            defaultModel = "llama3.2:3b"
        )
        
        // Créer le ViewModel
        val viewModel = LlamaViewModel(ollamaClient)
        
        setContent {
            androidx.compose.material3.MaterialTheme {
                LlamaChatScreen(viewModel)
            }
        }
    }
}

/**
 * AndroidManifest.xml - Permissions requises
 * 
 * <uses-permission android:name="android.permission.INTERNET" />
 * <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
 * 
 * <application
 *     android:usesCleartextTraffic="true"  <!-- Pour HTTP non sécurisé -->
 *     ...
 * />
 */

/**
 * Exemples d'utilisation
 */
object ExamplesUsage {
    
    suspend fun example1_SimpleGeneration() {
        val client = OllamaClient(baseUrl = "http://YOUR-IP:11434")
        
        val result = client.generate("Écris un court poème sur l'IA")
        result.onSuccess { response ->
            println("Llama: $response")
        }.onFailure { error ->
            println("Erreur: ${error.message}")
        }
    }
    
    suspend fun example2_ChatWithContext() {
        val client = OllamaClient()
        
        val messages = listOf(
            ChatMessage("system", "Tu es un assistant sympathique et concis."),
            ChatMessage("user", "Bonjour! Comment t'appelles-tu?"),
        )
        
        val result = client.chat(messages)
        result.onSuccess { response ->
            println("Llama: $response")
        }
    }
    
    suspend fun example3_ListModels() {
        val client = OllamaClient()
        
        val result = client.listModels()
        result.onSuccess { models ->
            models.forEach { model ->
                println("Modèle: ${model.name}")
                println("Taille: ${model.size / 1024 / 1024} MB")
                println("---")
            }
        }
    }
    
    suspend fun example4_CheckServerStatus() {
        val client = OllamaClient()
        
        val result = client.ping()
        if (result.isSuccess) {
            println("✓ Serveur accessible")
        } else {
            println("✗ Serveur inaccessible")
        }
    }
}
