# 🍜 Guide Complet: Naruto AI Chat

**Date:** 24 Décembre 2025  
**Application créée:** Naruto AI Chat - Chat avec personnages Naruto et célébrités (SFW/NSFW)

---

## 📦 Ce qui a été créé

### Application Android Complète

**Localisation:** `/workspace/naruto-ai-chat/`

**Fonctionnalités:**
- ✅ 6 personnages Naruto (Naruto, Sasuke, Sakura, Kakashi, Hinata, Itachi)
- ✅ 7 célébrités (Brad Pitt, Leo DiCaprio, The Rock, Scarlett Johansson, Margot Robbie, Emma Watson, Zendaya)
- ✅ Modes SFW et NSFW avec personnalités adaptées
- ✅ Interface Material Design 3 moderne
- ✅ Intégration Oracle Cloud / Llama 3.2
- ✅ Gestion contexte de conversation
- ✅ Workflow GitHub Actions pour build automatique

**Technologies:**
- Kotlin + Jetpack Compose
- Material Design 3
- MVVM Architecture
- OkHttp pour API
- Coroutines

---

## 🚀 Étape 1: Pousser sur GitHub

### 1.1 Créer le Repository GitHub

```bash
cd /workspace/naruto-ai-chat

# Option A: Via interface web GitHub
# 1. Aller sur https://github.com/new
# 2. Nom: naruto-ai-chat
# 3. Description: AI Chat app with Naruto characters and celebrities (SFW/NSFW)
# 4. Public
# 5. NE PAS initialiser avec README
# 6. Create repository

# Option B: Via gh CLI (si permissions)
gh repo create naruto-ai-chat --public --source=. --description="AI Chat app with Naruto characters and celebrities (SFW/NSFW)"
```

### 1.2 Pousser le Code

```bash
cd /workspace/naruto-ai-chat

# Si pas encore fait
git init
git add .
git commit -m "Initial commit: Naruto AI Chat app"

# Ajouter remote (remplacer YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/naruto-ai-chat.git

# Pousser
git branch -M main
git push -u origin main
```

---

## 📱 Étape 2: Builder l'APK

### Option A: GitHub Actions (Automatique - Recommandé)

Le workflow est déjà configuré dans `.github/workflows/build-release.yml`

**Créer une release:**

```bash
cd /workspace/naruto-ai-chat

# Créer un tag
git tag -a v1.0.0 -m "First release: Naruto AI Chat"
git push origin v1.0.0

# OU lancer manuellement depuis GitHub:
# 1. Aller dans Actions tab
# 2. Sélectionner "Build and Release APK"
# 3. Click "Run workflow"
# 4. Entrer version: 1.0.0
# 5. Run workflow
```

**Note:** Pour signer l'APK, vous devez configurer les secrets GitHub:
- `SIGNING_KEY` - Votre keystore en base64
- `ALIAS` - Alias de la clé
- `KEY_STORE_PASSWORD` - Mot de passe du keystore
- `KEY_PASSWORD` - Mot de passe de la clé

### Option B: Build Local

**Prérequis:**
- Android Studio installé OU
- Android SDK + Java 17

**Build:**

```bash
cd /workspace/naruto-ai-chat

# Build APK debug (non-signé)
./gradlew assembleDebug

# APK généré dans:
# app/build/outputs/apk/debug/app-debug.apk

# Build APK release (nécessite keystore)
./gradlew assembleRelease

# APK généré dans:
# app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## ☁️ Étape 3: Configurer Oracle Cloud

### 3.1 Créer Compte Oracle Cloud (Gratuit)

1. **Aller sur:** https://cloud.oracle.com/free
2. **S'inscrire** (carte requise mais non débitée)
3. **Vérifier email** et se connecter

### 3.2 Créer VM ARM "Always Free"

**Console Oracle** → Compute → Instances → Create Instance

**Configuration:**
```
Name:              llama-ai-server
Compartment:       (root)

Image:             Ubuntu 22.04 (ARM)
Shape:             VM.Standard.A1.Flex
OCPU Count:        4 (maximum gratuit)
Memory (GB):       24 (maximum gratuit)

Boot Volume:       200 GB

Networking:
  VCN:             Create new
  Subnet:          Create new public subnet
  Public IP:       Assign

SSH Keys:
  Generate key pair → Download private key
```

**Créer** et attendre 2-3 minutes

**Noter l'IP publique** affichée (ex: `123.456.789.0`)

### 3.3 Configurer Security List

**Console** → Networking → Virtual Cloud Networks → votre VCN → Security Lists → Default Security List

**Ingress Rules** → **Add Ingress Rule:**
```
Stateless:               No
Source Type:             CIDR
Source CIDR:             0.0.0.0/0
IP Protocol:             TCP
Destination Port Range:  11434
Description:             Ollama API
```

**Add Ingress Rule**

### 3.4 Installer Ollama + Llama

**Se connecter à la VM:**
```bash
# Depuis votre PC local
ssh -i chemin/vers/cle-privee.pem ubuntu@VOTRE-IP-PUBLIQUE
```

**Installer Ollama:**
```bash
# Sur la VM Oracle
curl -fsSL https://ollama.com/install.sh | sh
```

**Télécharger Llama 3.2:**
```bash
# Pour qualité standard (recommandé)
ollama pull llama3.2:3b

# OU pour meilleure qualité (plus lent)
ollama pull llama3:8b
```

**Configurer pour accès externe:**
```bash
# Éditer le service
sudo systemctl edit ollama.service

# Ajouter ces lignes (copier-coller):
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"

# Sauvegarder (Ctrl+X, Y, Enter)

# Redémarrer
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Vérifier:**
```bash
# Sur la VM
curl http://localhost:11434/api/tags

# Depuis votre PC
curl http://VOTRE-IP-PUBLIQUE:11434/api/tags
```

Si ça fonctionne, vous verrez la liste des modèles.

---

## 📱 Étape 4: Installer et Configurer l'App

### 4.1 Installer l'APK

**Option A: Depuis GitHub Release**
1. Aller sur https://github.com/YOUR-USERNAME/naruto-ai-chat/releases
2. Télécharger `Naruto-AI-Chat-v1.0.0.apk`
3. Transférer sur Android
4. Installer

**Option B: Depuis Build Local**
```bash
# Copier l'APK vers votre téléphone
adb install app/build/outputs/apk/debug/app-debug.apk

# OU via USB/Bluetooth/Email
```

### 4.2 Configurer l'App

1. **Ouvrir l'app** Naruto AI Chat
2. **Aller dans Settings** (icône ⚙️)
3. **Entrer l'URL Oracle Cloud:**
   ```
   http://VOTRE-IP-PUBLIQUE:11434
   ```
4. **Tester la connexion** (bouton Test)
5. **Si ça marche:** ✅ "Connected successfully"

### 4.3 Utiliser l'App

1. **Sélectionner un personnage** (Naruto, Sasuke, Sakura, etc.)
2. **Choisir le mode:**
   - 🔒 SFW Mode (conversations appropriées)
   - 🔓 NSFW Mode (conversations non-censurées)
3. **Commencer à chatter!**

---

## 🎭 Personnages Disponibles

### 🍜 Naruto Universe (6 personnages)

| Personnage | Emoji | Personnalité | Spécialité |
|------------|-------|--------------|------------|
| **Naruto Uzumaki** | 🍜 | Énergique, optimiste, déterminé | Rasengan, Shadow Clones |
| **Sasuke Uchiha** | ⚡ | Cool, mystérieux, puissant | Sharingan, Chidori |
| **Sakura Haruno** | 🌸 | Intelligente, forte, caring | Medical Ninjutsu, Force |
| **Kakashi Hatake** | 📖 | Calme, mystérieux, sage | Copy Ninja, Sharingan |
| **Hinata Hyuga** | 💜 | Timide, gentille, déterminée | Byakugan, Gentle Fist |
| **Itachi Uchiha** | 🌙 | Calme, génie, tragique | Mangekyō Sharingan |

### ⭐ Célébrités (7 personnages)

| Personnage | Emoji | Catégorie | Style |
|------------|-------|-----------|-------|
| **Brad Pitt** | 🎬 | Homme | Charismatique, charming |
| **Leonardo DiCaprio** | 🌊 | Homme | Passionné, intense |
| **Dwayne Johnson** | 💪 | Homme | Motivant, énergique |
| **Scarlett Johansson** | 🕷️ | Femme | Confiante, sultry |
| **Margot Robbie** | 💎 | Femme | Charmante, drôle |
| **Emma Watson** | 📚 | Femme | Intelligente, élégante |
| **Zendaya** | ✨ | Femme | Cool, tendance |

---

## 🔧 Personnalisation

### Modifier l'URL Ollama dans le Code

**Fichier:** `app/src/main/java/com/narutoai/chat/api/LlamaClient.kt`

```kotlin
class LlamaClient(
    private val baseUrl: String = "http://VOTRE-IP:11434" // ← Modifier ici
) {
    // ...
}
```

### Ajouter un Nouveau Personnage

**Fichier:** `app/src/main/java/com/narutoai/chat/data/Characters.kt`

```kotlin
val nouveauPersonnage = Character(
    id = "mon_personnage",
    name = "Mon Personnage",
    description = "Description courte",
    category = CharacterCategory.NARUTO, // ou CELEBRITY_MALE/FEMALE
    avatarEmoji = "😎",
    personality = listOf("trait1", "trait2", "trait3"),
    systemPromptSFW = """Vous êtes [personnage].
Décrivez sa personnalité en SFW...""",
    systemPromptNSFW = """Vous êtes [personnage] en mode NSFW.
Décrivez sa personnalité sans censure..."""
)

// Ajouter à la liste
val allCharacters = listOf(
    naruto, sasuke, sakura, // ... existants
    nouveauPersonnage  // ← Ajouter ici
)
```

### Changer le Modèle Llama

**Fichier:** `app/src/main/java/com/narutoai/chat/api/LlamaClient.kt`

```kotlin
val jsonBody = JSONObject().apply {
    put("model", "llama3.2:3b") // ← Modifier: llama3:8b, llama3:70b, etc.
    // ...
}
```

---

## 🐛 Dépannage

### Erreur: "Connection refused"

**Causes:**
1. VM Oracle Cloud éteinte
2. Ollama non démarré
3. Security List pas configurée
4. Mauvaise IP dans l'app

**Solutions:**
```bash
# Vérifier Ollama sur VM
ssh ubuntu@VOTRE-IP
sudo systemctl status ollama
sudo systemctl restart ollama

# Vérifier port
sudo netstat -tlnp | grep 11434

# Tester depuis VM
curl http://localhost:11434/api/tags

# Tester depuis Internet
curl http://VOTRE-IP:11434/api/tags
```

### Erreur: "Timeout"

**Solution:** Augmenter le timeout dans `LlamaClient.kt`:

```kotlin
private val client = OkHttpClient.Builder()
    .connectTimeout(60, TimeUnit.SECONDS) // ← 30 → 60
    .readTimeout(180, TimeUnit.SECONDS)   // ← 120 → 180
    .build()
```

### Réponses très lentes

**Causes:**
- Modèle trop gros (8B ou 70B)
- VM surchargée

**Solutions:**
```bash
# Utiliser modèle plus petit
ollama pull llama3.2:1b  # Au lieu de 3b ou 8b

# Vérifier ressources VM
htop
free -h
```

### App crash au lancement

**Vérifier:**
1. Android 8.0+ (API 26)
2. Permission Internet accordée
3. Logs: `adb logcat | grep Naruto`

---

## 📊 Performance Attendue

### Oracle Cloud (Free Tier: 4 CPU ARM + 24 GB RAM)

| Modèle | Vitesse | Qualité | Temps réponse (100 tokens) |
|--------|---------|---------|----------------------------|
| Llama 3.2 1B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 2-5 secondes |
| Llama 3.2 3B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-8 secondes |
| Llama 3 8B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 8-15 secondes |

**Recommandation:** Llama 3.2 3B (bon équilibre)

---

## 🔐 Sécurité

### Pour Production

**1. HTTPS avec Nginx:**
```bash
# Sur VM Oracle
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

**2. Authentification API:**
```bash
# Ajouter token dans Nginx
location / {
    if ($http_authorization != "Bearer SECRET-TOKEN") {
        return 401;
    }
    proxy_pass http://localhost:11434;
}
```

**3. Rate Limiting:**
```bash
# Limiter à 30 req/min
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
location / {
    limit_req zone=api burst=10;
    proxy_pass http://localhost:11434;
}
```

---

## 📦 Structure du Projet

```
naruto-ai-chat/
├── app/
│   ├── src/main/
│   │   ├── java/com/narutoai/chat/
│   │   │   ├── api/
│   │   │   │   └── LlamaClient.kt          # Client API Ollama
│   │   │   ├── data/
│   │   │   │   └── Characters.kt           # 13 personnages définis
│   │   │   ├── models/
│   │   │   │   └── Character.kt            # Modèles de données
│   │   │   ├── ui/
│   │   │   │   ├── screens/
│   │   │   │   │   ├── CharacterSelectionScreen.kt
│   │   │   │   │   └── ChatScreen.kt
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Theme.kt
│   │   │   │   │   └── Type.kt
│   │   │   │   └── NarutoAIChatApp.kt
│   │   │   ├── viewmodel/
│   │   │   │   └── ChatViewModel.kt
│   │   │   └── MainActivity.kt
│   │   └── res/                            # Resources Android
│   └── build.gradle.kts
├── .github/workflows/
│   └── build-release.yml                   # GitHub Actions
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradlew
└── README.md
```

---

## 📝 Checklist Finale

### Avant de Publier

- [ ] Code poussé sur GitHub
- [ ] README.md complet
- [ ] Workflow GitHub Actions testé
- [ ] Oracle Cloud VM créée et configurée
- [ ] Ollama + Llama installés et testés
- [ ] Security List configurée (port 11434)
- [ ] APK buildé et testé
- [ ] Release GitHub créée avec APK
- [ ] URL Oracle Cloud configurée dans l'app

### Après Publication

- [ ] Tester l'app sur vraï dispositif Android
- [ ] Vérifier tous les personnages
- [ ] Tester mode SFW et NSFW
- [ ] Vérifier performance (temps de réponse)
- [ ] Documenter toute modification

---

## 🎉 C'est Prêt!

L'application **Naruto AI Chat** est complète avec:

✅ 13 personnages (6 Naruto + 7 célébrités)  
✅ Modes SFW et NSFW  
✅ Personnalités réalistes et détaillées  
✅ Interface Material Design 3 moderne  
✅ Intégration Oracle Cloud gratuite  
✅ Workflow GitHub Actions automatique  
✅ Documentation complète  

**Prochaines étapes:**
1. Pousser sur GitHub
2. Configurer Oracle Cloud (30 min)
3. Builder l'APK (automatique)
4. Créer la release
5. Profiter!

**Liens utiles:**
- Oracle Cloud: https://cloud.oracle.com/free
- Ollama: https://ollama.com
- Documentation Llama: https://github.com/ollama/ollama/blob/main/docs/api.md

---

**🍜 Bon développement avec Naruto AI Chat! Dattebayo! 🍜**
