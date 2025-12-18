# 🔧 Connexion Application Android au Dashboard BAG Bot Manager

## ✅ Corrections appliquées pour l'application Android

### Problème identifié
Les applications Android peuvent avoir des problèmes de connexion au dashboard à cause de :
1. **Restrictions CORS** - Bloquent les requêtes cross-origin
2. **Authentification manquante** - L'app ne peut pas s'authentifier
3. **Configuration réseau** - Mauvaise URL ou port

### ✅ Solution appliquée : Support CORS complet

Le serveur dashboard a été configuré pour accepter les connexions depuis des applications mobiles :

```javascript
// CORS middleware ajouté
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

## 📱 Configuration de l'application Android

### URL à utiliser dans l'app
```
http://88.174.155.230:33002
```

### Endpoints API disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Vérifier l'état du serveur |
| `/api/configs` | GET | Récupérer toute la configuration |
| `/api/config/:section` | GET | Récupérer une section spécifique |
| `/api/economy` | POST | Mettre à jour l'économie |
| `/api/tickets` | POST | Mettre à jour les tickets |
| `/api/truthdare/:mode` | GET | Récupérer Action/Vérité (sfw/nsfw) |
| `/api/counting` | GET | Récupérer config comptage |
| `/api/welcome` | GET | Récupérer config welcome |
| `/api/goodbye` | GET | Récupérer config goodbye |
| `/api/inactivity` | GET | Récupérer config inactivité |
| `/api/discord/channels` | GET | Liste des salons Discord |
| `/api/discord/roles` | GET | Liste des rôles Discord |
| `/api/discord/members` | GET | Liste des membres |

### Exemples de requêtes

#### Vérifier la connexion
```http
GET http://88.174.155.230:33002/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T..."
}
```

#### Récupérer la configuration
```http
GET http://88.174.155.230:33002/api/configs
```

Réponse : JSON avec toute la configuration du bot

#### Mettre à jour l'économie
```http
POST http://88.174.155.230:33002/api/economy
Content-Type: application/json

{
  "currency": {
    "name": "BAG$"
  }
}
```

## 🔒 Authentification (si activée)

Si le dashboard est protégé par mot de passe, ajouter le header :

```http
Authorization: Bearer votre_mot_de_passe_ici
```

Ou ajouter le paramètre dans l'URL :
```
http://88.174.155.230:33002/api/configs?key=votre_mot_de_passe
```

## 🧪 Tests de connectivité

### Depuis un terminal Android (adb)
```bash
# Test simple
curl http://88.174.155.230:33002/health

# Test avec CORS
curl -H "Origin: http://localhost" \
     -H "Content-Type: application/json" \
     http://88.174.155.230:33002/api/configs
```

### Depuis le code Android (Java/Kotlin)

#### Kotlin exemple :
```kotlin
import okhttp3.*
import kotlinx.coroutines.*

val client = OkHttpClient()
val baseUrl = "http://88.174.155.230:33002"

// Vérifier la santé
suspend fun checkHealth(): Boolean {
    return withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/health")
                .build()
            
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
}

// Récupérer la config
suspend fun getConfig(): JSONObject? {
    return withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/configs")
                .build()
            
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                JSONObject(response.body?.string() ?: "{}")
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
```

## 🐛 Dépannage

### L'app ne se connecte pas

#### 1. Vérifier la connexion réseau
```kotlin
val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
val isConnected = cm.activeNetworkInfo?.isConnected == true
```

#### 2. Vérifier que le serveur répond
```bash
curl http://88.174.155.230:33002/health
```

Doit retourner `{"status":"ok",...}`

#### 3. Permissions Android
Ajouter dans `AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Pour Android 9+ (Cleartext HTTP) -->
<application
    android:usesCleartextTraffic="true"
    ...>
```

#### 4. Configuration réseau (network_security_config.xml)
Créer `res/xml/network_security_config.xml` :
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">88.174.155.230</domain>
    </domain-config>
</network-security-config>
```

Et dans `AndroidManifest.xml` :
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### Erreur CORS

Si vous voyez des erreurs CORS dans les logs, vérifier :
1. Le serveur a bien le middleware CORS (✅ déjà ajouté)
2. L'app envoie les bons headers
3. L'URL est correcte (pas de trailing slash)

### Timeout

Si la connexion prend trop de temps :
```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .build()
```

### Erreur 401 Unauthorized

Si le dashboard est protégé par mot de passe :
```kotlin
val request = Request.Builder()
    .url("$baseUrl/api/configs")
    .header("Authorization", "Bearer votre_mot_de_passe")
    .build()
```

## 📊 Vérification de l'état du serveur

### Serveur opérationnel
```
✅ Serveur : RUNNING
✅ Port : 33002
✅ CORS : ACTIVÉ
✅ IP publique : 88.174.155.230
```

### Commandes de vérification
```bash
# Processus en cours
ps aux | grep 'node.*server-v2'

# Port ouvert
netstat -tuln | grep 33002

# Test depuis le serveur
curl http://88.174.155.230:33002/health

# Test CORS
curl -H "Origin: http://localhost" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://88.174.155.230:33002/api/configs -v
```

## 🔄 Redémarrer le serveur (si nécessaire)

```bash
# Arrêter
pkill -f 'node.*server-v2'

# Démarrer avec CORS
cd /workspace/dashboard-v2
DASHBOARD_PORT=33002 node server-v2.js &

# Vérifier
sleep 3 && curl http://88.174.155.230:33002/health
```

## 📝 Format des données

### GET /api/configs
```json
{
  "economy": {
    "currency": { "name": "BAG$" },
    "balances": {},
    "actions": { "gifs": {}, "messages": {}, "config": {} }
  },
  "levels": {
    "xpPerMessage": 10,
    "xpPerVoiceMinute": 5,
    "users": {}
  },
  "tickets": {
    "categories": [],
    "config": {},
    "panel": {}
  },
  ...
}
```

### POST /api/economy
```json
{
  "currency": {
    "name": "BAG$"
  },
  "settings": {
    "dailyReward": 100
  }
}
```

## ✨ Résumé

| Élément | Valeur | Status |
|---------|--------|--------|
| **URL API** | http://88.174.155.230:33002 | ✅ |
| **CORS** | Activé | ✅ |
| **Authentification** | Optionnelle | ⚠️ |
| **Format** | JSON | ✅ |
| **HTTP** | Cleartext autorisé | ✅ |

---

**Date de configuration** : 17 décembre 2025  
**Status** : ✅ **Prêt pour connexion mobile Android**

## 📞 Si le problème persiste

Merci de fournir :
1. Le code source de l'application Android (ou l'APK)
2. Les logs d'erreur de l'application
3. Le message d'erreur exact
4. La méthode de connexion utilisée (OkHttp, Retrofit, Volley, etc.)
