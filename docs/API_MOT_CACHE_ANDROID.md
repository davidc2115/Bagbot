# API Mot-Caché - Documentation pour l'Application Android

## 📡 Informations de Connexion

**Base URL**: `http://88.174.155.230:33003`  
**Port**: 33003  
**Authentification**: Bearer Token (OAuth Discord)

## 🔐 Authentification

Tous les endpoints nécessitent un token d'authentification dans le header :

```
Authorization: Bearer YOUR_TOKEN_HERE
```

Le token est obtenu via le flux OAuth Discord (voir documentation principale de l'API).

## 📚 Endpoints Mot-Caché

### 1. Récupérer l'État du Jeu

**Endpoint**: `GET /api/mot-cache`  
**Authentification**: ✅ Requise  
**Description**: Récupère les informations générales sur le jeu mot-caché

#### Exemple de Requête

```kotlin
val client = OkHttpClient()
val request = Request.Builder()
    .url("http://88.174.155.230:33003/api/mot-cache")
    .addHeader("Authorization", "Bearer YOUR_TOKEN")
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val json = response.body?.string()
        // Parser JSON
    }
})
```

#### Réponse Success (200)

```json
{
  "success": true,
  "motCache": {
    "enabled": true,
    "hasWord": true,
    "wordLength": 5,
    "mode": "daily",
    "probability": 5,
    "lettersPerDay": 1,
    "emoji": "🔍",
    "minMessageLength": 15,
    "rewardAmount": 5000,
    "totalPlayers": 12,
    "totalWinners": 3
  }
}
```

#### Champs de Réponse

| Champ | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Le jeu est-il activé ? |
| `hasWord` | boolean | Un mot cible est-il défini ? |
| `wordLength` | number | Longueur du mot à trouver |
| `mode` | string | Mode de jeu (`"daily"` ou `"probability"`) |
| `probability` | number | Probabilité d'obtenir une lettre (mode probabilité) |
| `lettersPerDay` | number | Nombre de lettres distribuées par jour (mode quotidien) |
| `emoji` | string | Emoji utilisé pour signaler une lettre trouvée |
| `minMessageLength` | number | Longueur minimale des messages pour obtenir des lettres |
| `rewardAmount` | number | Récompense en BAG$ pour le gagnant |
| `totalPlayers` | number | Nombre de joueurs ayant au moins une lettre |
| `totalWinners` | number | Nombre total de gagnants historiques |

---

### 2. Ma Progression

**Endpoint**: `GET /api/mot-cache/my-progress`  
**Authentification**: ✅ Requise  
**Description**: Récupère la progression personnelle de l'utilisateur connecté

#### Exemple de Requête

```kotlin
val request = Request.Builder()
    .url("http://88.174.155.230:33003/api/mot-cache/my-progress")
    .addHeader("Authorization", "Bearer YOUR_TOKEN")
    .build()
```

#### Réponse Success - Jeu Actif (200)

```json
{
  "success": true,
  "active": true,
  "wordDisplay": "C A _ _ N",
  "letters": ["C", "A", "N"],
  "letterCount": 3,
  "wordLength": 5,
  "progress": 60
}
```

#### Réponse Success - Jeu Inactif (200)

```json
{
  "success": true,
  "active": false,
  "message": "Le jeu n'est pas activé"
}
```

#### Champs de Réponse (Jeu Actif)

| Champ | Type | Description |
|-------|------|-------------|
| `active` | boolean | Le jeu est-il actif ? |
| `wordDisplay` | string | Mot avec lettres révélées (ex: "C A _ _ N") |
| `letters` | string[] | Tableau de lettres collectées |
| `letterCount` | number | Nombre de lettres collectées |
| `wordLength` | number | Longueur du mot cible |
| `progress` | number | Progression en pourcentage (0-100) |

---

### 3. Deviner le Mot

**Endpoint**: `POST /api/mot-cache/guess`  
**Authentification**: ✅ Requise  
**Content-Type**: `application/json`  
**Description**: Soumettre une tentative de deviner le mot

#### Body de la Requête

```json
{
  "word": "CALIN"
}
```

#### Exemple de Requête

```kotlin
val json = JSONObject()
json.put("word", "CALIN")

val requestBody = json.toString()
    .toRequestBody("application/json".toMediaType())

val request = Request.Builder()
    .url("http://88.174.155.230:33003/api/mot-cache/guess")
    .addHeader("Authorization", "Bearer YOUR_TOKEN")
    .post(requestBody)
    .build()
```

#### Réponse Success - Mot Correct (200)

```json
{
  "success": true,
  "correct": true,
  "message": "Félicitations ! Tu as trouvé le mot !",
  "word": "CALIN",
  "reward": 5000
}
```

#### Réponse Success - Mot Incorrect (200)

```json
{
  "success": true,
  "correct": false,
  "message": "Ce n'est pas le bon mot. Continue à collecter des lettres !",
  "userLetters": ["C", "A", "N"]
}
```

#### Réponse Error - Jeu Inactif (200)

```json
{
  "success": false,
  "message": "Le jeu n'est pas actif"
}
```

---

### 4. Configuration du Jeu (Admin)

**Endpoint**: `GET /api/mot-cache/config`  
**Authentification**: ✅ Requise (Admin uniquement)  
**Description**: Récupère la configuration complète du jeu (mot cible inclus)

#### Réponse Success (200)

```json
{
  "success": true,
  "config": {
    "enabled": true,
    "targetWord": "CALIN",
    "mode": "daily",
    "probability": 5,
    "lettersPerDay": 1,
    "emoji": "🔍",
    "minMessageLength": 15,
    "allowedChannels": ["1234567890"],
    "letterNotificationChannel": "9876543210",
    "winnerNotificationChannel": "1122334455",
    "rewardAmount": 5000,
    "collections": {
      "userId1": ["C", "A"],
      "userId2": ["L", "I", "N"]
    },
    "winners": [
      {
        "userId": "943487722738311219",
        "username": "Player1",
        "word": "HELLO",
        "date": 1703001234567,
        "reward": 5000
      }
    ]
  }
}
```

#### Réponse Error - Accès Refusé (403)

```json
{
  "error": "Forbidden: Admin only"
}
```

---

### 5. Mettre à Jour la Configuration (Admin)

**Endpoint**: `POST /api/mot-cache/config`  
**Authentification**: ✅ Requise (Admin uniquement)  
**Content-Type**: `application/json`  
**Description**: Met à jour la configuration du jeu

#### Body de la Requête

```json
{
  "enabled": true,
  "targetWord": "BONJOUR",
  "mode": "daily",
  "lettersPerDay": 2,
  "minMessageLength": 20,
  "rewardAmount": 10000
}
```

**Note**: Vous pouvez envoyer seulement les champs à modifier.

#### Exemple de Requête

```kotlin
val json = JSONObject().apply {
    put("enabled", true)
    put("targetWord", "BONJOUR")
    put("rewardAmount", 10000)
}

val requestBody = json.toString()
    .toRequestBody("application/json".toMediaType())

val request = Request.Builder()
    .url("http://88.174.155.230:33003/api/mot-cache/config")
    .addHeader("Authorization", "Bearer YOUR_TOKEN")
    .post(requestBody)
    .build()
```

#### Réponse Success (200)

```json
{
  "success": true,
  "message": "Configuration mise à jour",
  "config": {
    "enabled": true,
    "targetWord": "BONJOUR",
    "mode": "daily",
    "lettersPerDay": 2,
    "minMessageLength": 20,
    "rewardAmount": 10000,
    ...
  }
}
```

---

## 🎨 Exemple d'Interface Android - Vignette Mot-Caché

### Layout Recommandé

```xml
<androidx.cardview.widget.CardView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:cardCornerRadius="12dp"
    app:cardElevation="4dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp">

        <!-- Titre -->
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="🔍 Mot Caché"
            android:textSize="20sp"
            android:textStyle="bold"/>

        <!-- État du jeu -->
        <TextView
            android:id="@+id/gameStatus"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="✅ Jeu actif"
            android:textColor="@color/green"
            android:layout_marginTop="8dp"/>

        <!-- Mot avec lettres révélées -->
        <TextView
            android:id="@+id/wordDisplay"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="C A _ _ N"
            android:textSize="24sp"
            android:fontFamily="monospace"
            android:layout_marginTop="16dp"/>

        <!-- Progression -->
        <ProgressBar
            android:id="@+id/progressBar"
            style="?android:attr/progressBarStyleHorizontal"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:progress="60"
            android:layout_marginTop="8dp"/>

        <TextView
            android:id="@+id/progressText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="3/5 lettres (60%)"
            android:textSize="14sp"
            android:layout_marginTop="4dp"/>

        <!-- Bouton Deviner -->
        <Button
            android:id="@+id/guessButton"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="✍️ Deviner le mot"
            android:layout_marginTop="16dp"/>

    </LinearLayout>
</androidx.cardview.widget.CardView>
```

### Code Kotlin Exemple

```kotlin
class MotCacheFragment : Fragment() {
    
    private lateinit var wordDisplay: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var progressText: TextView
    private lateinit var guessButton: Button
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        wordDisplay = view.findViewById(R.id.wordDisplay)
        progressBar = view.findViewById(R.id.progressBar)
        progressText = view.findViewById(R.id.progressText)
        guessButton = view.findViewById(R.id.guessButton)
        
        loadProgress()
        
        guessButton.setOnClickListener {
            showGuessDialog()
        }
    }
    
    private fun loadProgress() {
        val client = OkHttpClient()
        val request = Request.Builder()
            .url("http://88.174.155.230:33003/api/mot-cache/my-progress")
            .addHeader("Authorization", "Bearer ${getToken()}")
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onResponse(call: Call, response: Response) {
                val json = JSONObject(response.body?.string() ?: "{}")
                
                activity?.runOnUiThread {
                    if (json.getBoolean("active")) {
                        wordDisplay.text = json.getString("wordDisplay")
                        val progress = json.getInt("progress")
                        progressBar.progress = progress
                        progressText.text = "${json.getInt("letterCount")}/${json.getInt("wordLength")} lettres ($progress%)"
                        guessButton.isEnabled = true
                    } else {
                        wordDisplay.text = "⏸️ Jeu non actif"
                        guessButton.isEnabled = false
                    }
                }
            }
            
            override fun onFailure(call: Call, e: IOException) {
                e.printStackTrace()
            }
        })
    }
    
    private fun showGuessDialog() {
        val input = EditText(requireContext())
        input.hint = "Entrez le mot"
        
        AlertDialog.Builder(requireContext())
            .setTitle("🎯 Deviner le mot")
            .setView(input)
            .setPositiveButton("Valider") { _, _ ->
                submitGuess(input.text.toString())
            }
            .setNegativeButton("Annuler", null)
            .show()
    }
    
    private fun submitGuess(word: String) {
        val json = JSONObject()
        json.put("word", word)
        
        val requestBody = json.toString()
            .toRequestBody("application/json".toMediaType())
        
        val client = OkHttpClient()
        val request = Request.Builder()
            .url("http://88.174.155.230:33003/api/mot-cache/guess")
            .addHeader("Authorization", "Bearer ${getToken()}")
            .post(requestBody)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onResponse(call: Call, response: Response) {
                val json = JSONObject(response.body?.string() ?: "{}")
                
                activity?.runOnUiThread {
                    if (json.getBoolean("correct")) {
                        showSuccessDialog(
                            json.getString("word"),
                            json.getInt("reward")
                        )
                    } else {
                        Toast.makeText(
                            requireContext(),
                            json.getString("message"),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    loadProgress() // Recharger la progression
                }
            }
            
            override fun onFailure(call: Call, e: IOException) {
                e.printStackTrace()
            }
        })
    }
    
    private fun showSuccessDialog(word: String, reward: Int) {
        AlertDialog.Builder(requireContext())
            .setTitle("🎉 Félicitations !")
            .setMessage("Tu as trouvé le mot : $word\n\n💰 Récompense : $reward BAG$")
            .setPositiveButton("OK") { _, _ ->
                loadProgress()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun getToken(): String {
        // Récupérer le token depuis SharedPreferences
        val prefs = requireContext().getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        return prefs.getString("auth_token", "") ?: ""
    }
}
```

---

## 🔄 Gestion des Erreurs

### Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Success |
| 400 | Bad Request (paramètres manquants/invalides) |
| 401 | Unauthorized (token manquant/invalide/expiré) |
| 403 | Forbidden (permissions insuffisantes) |
| 500 | Internal Server Error |

### Erreurs Courantes

```json
// Token manquant
{ "error": "No token" }

// Token invalide
{ "error": "Invalid token" }

// Token expiré
{ "error": "Token expired" }

// Accès refusé (admin uniquement)
{ "error": "Forbidden: Admin only" }

// Champ requis manquant
{ "error": "Word is required" }
```

---

## 🚀 Déploiement

### Informations de Production

- **Host**: `88.174.155.230`
- **Port**: `33003`
- **Protocole**: HTTP (HTTPS recommandé en production)
- **Disponibilité**: 24/7 (géré par PM2)

### Vérification de Santé

```
GET http://88.174.155.230:33003/health
```

Réponse :
```json
{
  "status": "ok",
  "service": "bot-api",
  "timestamp": "2025-12-22T22:37:04.123Z"
}
```

---

## 📞 Support

Pour toute question ou problème avec l'API, contactez l'équipe de développement.
