# 🔍 Release Notes - BagBot Manager v6.1.2

## 📅 Date: 23 Décembre 2025

## 🎯 Objectif: Diagnostic Approfondi

Cette version ajoute des **logs de debug détaillés** pour identifier précisément les problèmes persistants:
- ⏰ Inactivité affichant toujours "désactivé"
- 👥 Gestion des accès affichant "erreur inconnue"

## 🔍 Logs Ajoutés

### AdminScreen - Gestion des Accès

**Logs ajoutés:**
```kotlin
- 🔄 Début du chargement
- 📥 Réponse API brute (500 premiers caractères)
- 📊 Clés de l'objet JSON parsé
- 👥 Taille du tableau allowedUsers
- Détails de chaque utilisateur (Object vs Primitive)
- ✅ Nombre total d'utilisateurs chargés
- ❌ Erreurs avec stack trace complète
```

**Utilité:** Permet de voir exactement où le chargement échoue

### App.kt - Configuration Inactivité

**Logs ajoutés:**
```kotlin
- 📊 Clés de la section autokick
- 🔍 Vérification existence de inactivityKick
- 🔍 Vérification existence de inactivityTracking
- 📋 Clés de inactivityKick si présent
- ✅ Valeurs: enabled, delayDays, tracked count
- ⚠️ Structure complète si inactivityKick est NULL
- ⚡ Logs pour auto-kick rapide
```

**Utilité:** Identifie si la structure de données est correcte

### App.kt - Chargement Config Global

**Logs ajoutés:**
```kotlin
- 📥 Réponse /api/configs (500 premiers caractères)
- 📊 Nombre de sections chargées
- 📝 Liste des clés de configuration
- ✅ Confirmation si autokick existe
- ⚠️ Alerte si autokick manque
- ❌ Stack trace complète en cas d'erreur
```

**Utilité:** Vérifie que l'API retourne bien toutes les sections

## 📱 Comment Utiliser cette Version

### Étape 1: Installer l'APK v6.1.2

**Téléchargement:** (lien sera ajouté après build)

### Étape 2: Activer les Logs Android

Sur votre téléphone Android:

```bash
# Connecter le téléphone en USB avec débogage activé
adb logcat -c  # Clear logs
adb logcat | grep -E "AdminScreen|ConfigDetail|BagBot"
```

Ou utiliser Android Studio > Logcat

### Étape 3: Tester et Récupérer les Logs

**Test Inactivité:**
1. Ouvrir l'app
2. Aller dans Config > Modération & Sécurité
3. Cliquer sur "🦶 Auto-kick & Inactivité"
4. Observer les logs (chercher "ConfigDetail")

**Logs attendus:**
```
ConfigDetail: 📊 autokick keys: [enabled, delayMs, inactivityKick, inactivityTracking, ...]
ConfigDetail: 🔍 inactivityKick exists: true
ConfigDetail: 📋 inactivityKick keys: [enabled, delayDays, excludedRoleIds, ...]
ConfigDetail: ✅ enabled=true, delayDays=30, tracked=15
```

**Test Gestion Accès:**
1. Ouvrir l'app
2. Aller dans Admin > Gestion des Accès
3. Observer les logs (chercher "AdminScreen")

**Logs attendus:**
```
AdminScreen: 🔄 Chargement allowed users...
AdminScreen: 📥 Response: {"allowedUsers":[...]}
AdminScreen: 📊 Parsed data keys: [allowedUsers, count]
AdminScreen: 👥 Users array size: 3
AdminScreen: ✅ Loaded 3 users
```

### Étape 4: Rapporter les Logs

Si le problème persiste:
1. Copiez TOUS les logs depuis le démarrage de l'app
2. Cherchez les lignes avec ❌ ou ⚠️
3. Envoyez les logs complets

## 🚀 Déploiement Bot Discord

Pour déployer la correction du tribunal sur votre serveur:

**Script Simple:**
```bash
cd /workspace
./DEPLOYER_BOT_SIMPLE.sh
```

**Ou manuellement:**
```bash
ssh freebox@192.168.1.254
cd /home/freebox/bagbot
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285
pm2 restart bagbot
pm2 restart bot-api
pm2 logs bagbot --lines 20
```

**Vérification:**
- Sur Discord: `/tribunal` → devrait créer le channel avec bouton SANS erreur
- Commit attendu: `d68e31b` ou plus récent

## 📊 Changements Techniques

### Fichiers Modifiés

1. **AdminScreen.kt**
   - Ajout de 10+ lignes de logs
   - Log de chaque étape du parsing
   - Stack trace complète en cas d'erreur

2. **App.kt**
   - Logs détaillés pour autokick dans renderKeyInfo()
   - Logs lors du chargement initial de la config
   - Vérification explicite de la présence d'autokick

3. **build.gradle.kts**
   - Version: 6.1.1 → **6.1.2**
   - VersionCode: 6101 → **6102**

4. **DEPLOYER_BOT_SIMPLE.sh** (nouveau)
   - Script de déploiement simplifié
   - Connexion SSH automatique
   - Affichage des logs

## 🐛 Problèmes Ciblés

### Problème 1: Inactivité toujours "désactivé"

**Hypothèses à vérifier:**
1. ✓ L'API ne retourne pas `autokick` dans `/api/configs`
2. ✓ `autokick.inactivityKick` n'existe pas ou est null
3. ✓ `inactivityKick.enabled` est false côté backend
4. ✓ Erreur de parsing JSON

**Les logs permettront d'identifier laquelle est vraie**

### Problème 2: Gestion accès "erreur inconnue"

**Hypothèses à vérifier:**
1. ✓ L'API retourne un format inattendu
2. ✓ Erreur réseau (timeout, 404, 500)
3. ✓ Parsing JSON échoue
4. ✓ Exception non catchée

**Les logs permettront de voir l'erreur exacte**

## 🧪 Tests à Effectuer

### Test 1: Vérifier les Logs Inactivité
1. Installer APK v6.1.2
2. Activer `adb logcat`
3. Ouvrir Config > Auto-kick & Inactivité
4. Vérifier présence des logs `ConfigDetail`
5. Noter si "inactivityKick exists: true" ou "false"

### Test 2: Vérifier les Logs Gestion Accès
1. Ouvrir Admin > Gestion des Accès
2. Vérifier présence des logs `AdminScreen`
3. Noter la réponse API complète
4. Noter toute erreur avec stack trace

### Test 3: Vérifier API Backend Directement

**Via curl depuis votre machine:**
```bash
# Récupérer le token
TOKEN="votre_token"

# Tester /api/configs
curl -H "Authorization: Bearer $TOKEN" http://votre-serveur/api/configs | jq .autokick

# Tester /api/admin/allowed-users
curl -H "Authorization: Bearer $TOKEN" http://votre-serveur/api/admin/allowed-users | jq .
```

**Vérifier:**
- `autokick.inactivityKick.enabled` existe et vaut `true` ou `false`
- `allowedUsers` est un tableau d'objets avec `userId`

## ⚠️ Notes Importantes

1. **Cette version est pour diagnostic**
   - Les logs sont verbeux
   - Version stable: utilisez v6.1.1 pour production
   - Version debug: utilisez v6.1.2 pour identifier le problème

2. **Logs Android**
   - Nécessite débogage USB activé
   - Ou utilisez Android Studio Logcat
   - Filtrez sur "AdminScreen", "ConfigDetail", "BagBot"

3. **Une fois le problème identifié**
   - Rapportez les logs exacts
   - Une version v6.1.3 corrigera définitivement

## 📝 Commandes Utiles

### Logs Android
```bash
# Effacer et démarrer nouveau log
adb logcat -c && adb logcat | grep -E "AdminScreen|ConfigDetail"

# Sauvegarder dans un fichier
adb logcat | grep -E "AdminScreen|ConfigDetail" > logs_bagbot.txt

# Logs d'erreur uniquement
adb logcat *:E | grep -E "AdminScreen|ConfigDetail"
```

### Vérifier API Backend
```bash
# Status du bot
ssh freebox@192.168.1.254 "pm2 logs bot-api --lines 50 --nostream"

# Fichier de config
ssh freebox@192.168.1.254 "cat /home/freebox/bagbot/data/config.json | jq .guilds[].autokick.inactivityKick"
```

## 📦 Contenu de la Release

- ✅ APK Android v6.1.2 (avec logs debug)
- ✅ Script `DEPLOYER_BOT_SIMPLE.sh`
- ✅ Correctif tribunal (ButtonBuilder) déjà inclus

## 🔄 Prochaines Étapes

1. **Installer v6.1.2 et tester**
2. **Récupérer les logs Android**
3. **Rapporter les logs exacts du problème**
4. **Version v6.1.3 corrigera le problème identifié**

---

**Version:** 6.1.2 (versionCode 6102)  
**Type:** Debug / Diagnostic  
**Changements:** Logs détaillés pour diagnostic des bugs persistants  
**Compatible avec:** v6.1.0, v6.1.1
