# 🚀 Guide de Démarrage Rapide: Llama pour Application Android

**Date:** 24 Décembre 2025  
**Objectif:** Installer Llama complètement séparé du bot Discord pour une nouvelle application Android

---

## 📋 Résumé de l'Analyse

### ❌ Ce qui N'est PAS Possible

**Installation sur votre Freebox actuelle:**
- **RAM:** 964 MB disponible vs 2+ GB requis pour Llama
- **Impact:** Risque de crash du bot Discord (BagBot)
- **Performance:** CPU ARM trop lent (2-4 tokens/seconde)
- **Verdict:** **IMPOSSIBLE sans compromettre le bot Discord**

### ✅ Solution Recommandée: Oracle Cloud (GRATUIT)

**Free Tier Oracle Cloud:**
- **Coût:** 0€ à vie
- **Ressources:** 4 CPU ARM + 24 GB RAM
- **Performance:** Excellente (50-100 tokens/sec)
- **Isolation:** Complètement séparé de votre Freebox

---

## ⚡ Installation en 30 Minutes

### Étape 1: Créer Compte Oracle Cloud (5 min)

1. **Aller sur:** https://cloud.oracle.com/free
2. **S'inscrire** (carte bancaire requise mais non débitée)
3. **Vérifier l'email** et se connecter

### Étape 2: Créer VM ARM "Always Free" (10 min)

1. **Console Oracle** → Compute → Instances → Create Instance

2. **Configuration:**
   ```
   Nom: llama-server
   Compartment: (root)
   
   Image: Ubuntu 22.04 (ARM)
   Shape: VM.Standard.A1.Flex
   OCPU: 4 (max gratuit)
   Memory: 24 GB (max gratuit)
   
   Boot Volume: 200 GB
   
   Networking:
   - VCN: Create new (par défaut)
   - Public IP: Assign
   
   SSH Keys:
   - Generate key pair (télécharger la clé privée)
   ```

3. **Créer l'instance** (attendre 2-3 minutes)

4. **Noter l'IP publique** affichée

### Étape 3: Configurer Security List (2 min)

1. **Console** → Networking → Virtual Cloud Networks → Security Lists

2. **Default Security List** → Ingress Rules → Add Ingress Rule:
   ```
   Stateless: Non
   Source Type: CIDR
   Source CIDR: 0.0.0.0/0
   IP Protocol: TCP
   Destination Port Range: 11434
   Description: Ollama API
   ```

3. **Ajouter la règle**

### Étape 4: Installer Ollama + Llama (10 min)

1. **Se connecter à la VM:**
   ```bash
   # Depuis votre PC local
   ssh -i chemin/vers/cle-privee.key ubuntu@IP-PUBLIQUE-VM
   ```

2. **Copier et exécuter le script d'installation:**
   ```bash
   # Télécharger le script
   wget https://raw.githubusercontent.com/VOTRE-REPO/INSTALL_LLAMA_ORACLE_CLOUD.sh
   
   # OU copier depuis votre machine locale
   scp -i cle-privee.key INSTALL_LLAMA_ORACLE_CLOUD.sh ubuntu@IP-VM:~/
   
   # Rendre exécutable et lancer
   chmod +x INSTALL_LLAMA_ORACLE_CLOUD.sh
   bash INSTALL_LLAMA_ORACLE_CLOUD.sh
   ```

3. **Attendre l'installation** (5-10 minutes pour télécharger Llama 3.2 3B)

4. **Vérifier que ça fonctionne:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Étape 5: Tester depuis Internet (2 min)

1. **Depuis votre PC ou téléphone:**
   ```bash
   curl -X POST http://IP-PUBLIQUE-VM:11434/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama3.2:3b",
       "prompt": "Bonjour Llama!",
       "stream": false
     }'
   ```

2. **Si ça marche:** Vous devriez recevoir une réponse JSON avec le texte généré

3. **Si ça ne marche pas:** Vérifier les Security Lists (Étape 3)

---

## 📱 Intégrer dans Application Android

### Ajouter Dépendances (build.gradle.kts)

```kotlin
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
```

### Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
    android:usesCleartextTraffic="true"
    ...>
```

### Code Minimal (Kotlin)

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class LlamaClient(private val serverUrl: String = "http://YOUR-VM-IP:11434") {
    
    private val client = OkHttpClient()
    
    fun generateText(prompt: String, callback: (String) -> Unit) {
        val json = JSONObject().apply {
            put("model", "llama3.2:3b")
            put("prompt", prompt)
            put("stream", false)
        }
        
        val request = Request.Builder()
            .url("$serverUrl/api/generate")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onResponse(call: Call, response: Response) {
                val result = JSONObject(response.body?.string() ?: "{}")
                val text = result.optString("response", "Erreur")
                callback(text)
            }
            
            override fun onFailure(call: Call, e: IOException) {
                callback("Erreur: ${e.message}")
            }
        })
    }
}

// Utilisation
val llama = LlamaClient("http://123.456.789.0:11434")
llama.generateText("Écris un poème court") { response ->
    println("Llama: $response")
}
```

### Interface Compose (Optionnel)

Voir le fichier complet: `EXEMPLE_ANDROID_LLAMA.kt`

---

## 🎯 Architecture Finale

```
┌─────────────────────────────────────────┐
│  Freebox VM (88.174.155.230:33000)     │
│                                         │
│  ✅ BagBot Discord                      │
│  ✅ API Server                          │
│  ✅ Dashboard                           │
│  ✅ Application Android existante      │
│                                         │
│  → Aucune modification nécessaire      │
│  → Fonctionne normalement              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Oracle Cloud VM (IP-PUBLIQUE:11434)   │
│                                         │
│  🤖 Ollama                              │
│  🦙 Llama 3.2 3B (ou 8B)                │
│  📡 API REST                            │
│                                         │
│  → 4 CPU ARM (Cortex-A72)              │
│  → 24 GB RAM                           │
│  → 200 GB Storage                      │
│  → 100% Gratuit à vie                  │
└─────────────────────────────────────────┘
          ↓ HTTP/API (port 11434)
┌─────────────────────────────────────────┐
│  Nouvelle Application Android          │
│                                         │
│  📱 Interface Chat                      │
│  🔌 OkHttp Client                       │
│  🗨️ Communique avec Llama               │
│                                         │
│  → Complètement séparée de BagBot      │
│  → Utilise Oracle Cloud VM             │
└─────────────────────────────────────────┘
```

---

## 📊 Comparaison des Options

| Critère | Freebox | Oracle Cloud | VPS Payant | PC Local |
|---------|---------|--------------|------------|----------|
| **Coût** | Inclu | **GRATUIT** | €6-12/mois | Électricité |
| **RAM** | ❌ 0.5 GB | ✅ 24 GB | ✅ 4-8 GB | ✅ 8+ GB |
| **CPU** | ❌ 2 ARM | ✅ 4 ARM | ✅ 2-4 x64 | ✅ Variable |
| **Performance** | ❌ Très lent | ✅ Excellente | ✅ Bonne | ✅ Excellente |
| **Séparation BagBot** | ❌ Impossible | ✅ Totale | ✅ Totale | ✅ Totale |
| **Disponibilité** | ✅ 24/7 | ✅ 24/7 | ✅ 24/7 | ⚠️ PC allumé |
| **Configuration** | ❌ Impossible | ⭐ 30 min | ⭐ 30 min | ⭐ 20 min |
| **Recommandé** | ❌ NON | ✅✅✅ **OUI** | ✅ OUI | ✅ OUI |

---

## 🔧 Commandes Utiles

### Sur le Serveur Ollama

```bash
# Gérer le service
sudo systemctl status ollama         # Statut
sudo systemctl restart ollama        # Redémarrer
sudo systemctl stop ollama           # Arrêter
sudo journalctl -u ollama -f         # Logs en temps réel

# Gérer les modèles
ollama list                          # Liste des modèles
ollama pull llama3.2:8b              # Télécharger Llama 8B
ollama pull llama3.2:1b              # Télécharger Llama 1B (plus petit)
ollama rm llama3.2:3b                # Supprimer un modèle
ollama show llama3.2:3b              # Infos sur un modèle

# Tester en ligne de commande
ollama run llama3.2:3b               # Chat interactif
ollama run llama3.2:3b "Question?"   # Question unique

# Monitorer les ressources
htop                                 # CPU/RAM en temps réel
df -h                                # Espace disque
free -h                              # Mémoire disponible
```

### Tests API

```bash
# Lister les modèles disponibles
curl http://VOTRE-IP:11434/api/tags

# Génération simple
curl -X POST http://VOTRE-IP:11434/api/generate \
  -d '{"model":"llama3.2:3b","prompt":"Hello!","stream":false}'

# Chat avec contexte
curl -X POST http://VOTRE-IP:11434/api/chat \
  -d '{
    "model":"llama3.2:3b",
    "messages":[
      {"role":"user","content":"Bonjour!"}
    ],
    "stream":false
  }'

# Version d'Ollama
curl http://VOTRE-IP:11434/api/version
```

---

## ⚠️ Sécurité (Production)

Pour une utilisation en production, ajoutez:

### 1. Reverse Proxy Nginx avec HTTPS

```bash
sudo apt-get install nginx certbot python3-certbot-nginx

# Configuration Nginx
sudo nano /etc/nginx/sites-available/ollama

server {
    listen 443 ssl;
    server_name votre-domaine.com;
    
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Activer
sudo ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
sudo certbot --nginx -d votre-domaine.com
sudo systemctl restart nginx
```

### 2. Authentification API (Bearer Token)

```bash
# Ajouter dans Nginx
location / {
    if ($http_authorization != "Bearer VOTRE-TOKEN-SECRET") {
        return 401;
    }
    proxy_pass http://localhost:11434;
}
```

**Dans Android:**
```kotlin
val request = Request.Builder()
    .url("https://votre-domaine.com/api/generate")
    .header("Authorization", "Bearer VOTRE-TOKEN-SECRET")
    .post(...)
    .build()
```

### 3. Rate Limiting

```bash
# Nginx
limit_req_zone $binary_remote_addr zone=ollama:10m rate=10r/m;

location / {
    limit_req zone=ollama burst=5;
    proxy_pass http://localhost:11434;
}
```

---

## 🐛 Dépannage

### Problème: "Connection refused"

**Causes possibles:**
1. Service Ollama non démarré
2. Security List Oracle non configurée
3. Firewall local bloque le port

**Solutions:**
```bash
# Vérifier le service
sudo systemctl status ollama

# Vérifier le port
sudo netstat -tlnp | grep 11434

# Tester localement
curl http://localhost:11434/api/tags

# Si OK en local mais pas depuis Internet:
# → Vérifier Security Lists Oracle Cloud
```

### Problème: "Out of memory"

**Solutions:**
```bash
# Vérifier RAM disponible
free -h

# Utiliser un modèle plus petit
ollama pull llama3.2:1b  # Au lieu de 3b ou 8b

# Redémarrer Ollama
sudo systemctl restart ollama
```

### Problème: "Model not found"

**Solutions:**
```bash
# Lister les modèles installés
ollama list

# Télécharger le modèle manquant
ollama pull llama3.2:3b

# Vérifier dans l'API
curl http://localhost:11434/api/tags
```

### Problème: Génération très lente

**Causes:**
- CPU surchargé
- Modèle trop grand pour la RAM
- Swap utilisé (très lent)

**Solutions:**
```bash
# Vérifier swap
free -h

# Utiliser un modèle plus petit
ollama pull llama3.2:1b

# Monitorer CPU
htop
```

---

## 📞 Support et Ressources

### Documentation Officielle

- **Ollama:** https://github.com/ollama/ollama
- **API Reference:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **Modèles:** https://ollama.com/library
- **Oracle Cloud:** https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm

### Communauté

- **Discord Ollama:** https://discord.gg/ollama
- **Reddit:** r/ollama, r/LocalLLaMA
- **GitHub Issues:** https://github.com/ollama/ollama/issues

### Alternatives Llama

Si Llama ne répond pas à vos besoins:

1. **Mistral 7B** - Plus rapide que Llama
   ```bash
   ollama pull mistral
   ```

2. **Phi-3** - Très petit (3.8B), rapide
   ```bash
   ollama pull phi3
   ```

3. **Gemma 2B** - Encore plus petit
   ```bash
   ollama pull gemma:2b
   ```

---

## ✅ Checklist Finale

Avant de commencer le développement Android:

- [ ] VM Oracle Cloud créée (4 CPU + 24 GB RAM)
- [ ] IP publique notée
- [ ] Security List configurée (port 11434 ouvert)
- [ ] Script INSTALL_LLAMA_ORACLE_CLOUD.sh exécuté
- [ ] Ollama installé et en cours d'exécution
- [ ] Llama 3.2 téléchargé
- [ ] Test API réussi depuis Internet
- [ ] Code Android de base testé
- [ ] Permissions AndroidManifest.xml ajoutées

---

## 🎉 Résultat Final

**Vous aurez:**

✅ **Serveur Llama gratuit et puissant** (Oracle Cloud)  
✅ **Complètement séparé** de votre bot Discord  
✅ **API REST accessible** depuis n'importe quelle app Android  
✅ **Performance excellente** (50-100 tokens/seconde)  
✅ **0€ de coût** (Free Tier permanent)  
✅ **24/7 disponibilité** (serveur cloud)  

**BagBot Discord reste intact:**

✅ **Aucune modification** sur la Freebox  
✅ **Aucun impact** sur les performances  
✅ **Aucun risque** de crash  
✅ **Continue de fonctionner** normalement  

---

## 🚀 Prêt à Commencer?

1. **Créer compte Oracle Cloud:** https://cloud.oracle.com/free
2. **Suivre les étapes ci-dessus** (30 minutes)
3. **Développer votre app Android** avec l'exemple fourni

**Besoin d'aide?** N'hésitez pas à demander!

---

*Guide créé le 24 Décembre 2025*  
*Compatible avec Oracle Cloud ARM Free Tier*
