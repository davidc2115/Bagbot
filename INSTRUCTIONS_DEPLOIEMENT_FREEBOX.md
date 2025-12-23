# 🚀 Instructions Déploiement sur Freebox

## ⚠️ Important: Déploiement depuis votre Machine Locale

Je ne peux **pas** accéder à votre Freebox (192.168.1.254) depuis l'environnement cloud.
Vous devez exécuter ces commandes **depuis votre propre machine**.

---

## 📋 Méthode 1: Script Automatique (RECOMMANDÉ)

### Étape 1: Télécharger le script

Le script est déjà dans le dépôt: `DEPLOYER_BOT_SIMPLE.sh`

### Étape 2: Exécuter

**Sur votre machine locale (Windows/Mac/Linux):**

```bash
# Cloner ou mettre à jour le dépôt
git clone https://github.com/mel805/Bagbot.git
# OU si déjà cloné:
cd Bagbot
git pull origin cursor/admin-chat-and-bot-function-a285

# Rendre le script exécutable (Linux/Mac)
chmod +x DEPLOYER_BOT_SIMPLE.sh

# Exécuter
./DEPLOYER_BOT_SIMPLE.sh
```

**Le script va:**
1. ✅ Se connecter à votre Freebox via SSH
2. ✅ Mettre à jour le code du bot
3. ✅ Redémarrer le bot et l'API
4. ✅ Afficher les logs

---

## 📋 Méthode 2: Commandes Manuelles

### Option A: Depuis votre machine (via SSH)

```bash
ssh freebox@192.168.1.254
# Mot de passe: Freebox2011$

# Une fois connecté:
cd /home/freebox/bagbot
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285
pm2 restart bagbot
pm2 restart bot-api
pm2 logs bagbot --lines 20
```

### Option B: Commande en une ligne

```bash
ssh freebox@192.168.1.254 "cd /home/freebox/bagbot && git fetch origin cursor/admin-chat-and-bot-function-a285 && git reset --hard origin/cursor/admin-chat-and-bot-function-a285 && pm2 restart bagbot && pm2 restart bot-api && pm2 logs bagbot --lines 20 --nostream"
```

---

## ✅ Vérification du Déploiement

### 1. Vérifier le commit actuel

```bash
ssh freebox@192.168.1.254 "cd /home/freebox/bagbot && git log -1 --oneline"
```

**Attendu:** `d68e31b fix(android): Amélioration logs debug` (ou plus récent)

### 2. Vérifier que le bot tourne

```bash
ssh freebox@192.168.1.254 "pm2 list | grep bagbot"
```

**Attendu:** Status "online"

### 3. Vérifier les logs (pas d'erreur)

```bash
ssh freebox@192.168.1.254 "pm2 logs bagbot --lines 50 --nostream | grep -i error"
```

**Attendu:** Pas d'erreur "component.toJSON"

---

## 🧪 Test du Tribunal

### Sur Discord

1. Tapez: `/tribunal`
2. Remplissez:
   - **Accusé:** Sélectionnez un membre
   - **Avocat:** Sélectionnez un autre membre
   - **Chef d'accusation:** "Test déploiement"
3. Appuyez sur Entrée

**✅ Résultat attendu:**
- Channel tribunal créé
- Bouton "👨‍⚖️ Devenir Juge" apparaît
- **AUCUNE erreur** "component.toJSON is not a function"

**❌ Si l'erreur persiste:**
- Vérifiez le commit: doit être `d68e31b` ou plus récent
- Vérifiez les logs: `pm2 logs bagbot --err --lines 50`
- Le fichier `src/commands/tribunal.js` doit contenir `ButtonBuilder`

---

## 📱 Test de l'Application Android v6.1.2

### Téléchargement

**Lien APK:**
```
https://github.com/mel805/Bagbot/releases/download/v6.1.2/BagBot-Manager-v6.1.2-android.apk
```

### Installation

1. Téléchargez l'APK sur votre téléphone
2. Installez (autorisez sources inconnues si nécessaire)
3. Lancez l'application

### Activer les Logs (Important!)

Cette version contient des **logs de debug** pour identifier les problèmes.

**Méthode 1: Via ADB (si téléphone connecté en USB)**

```bash
# Activer débogage USB sur le téléphone
# Connecter en USB
adb devices  # Vérifier connexion

# Démarrer capture des logs
adb logcat -c  # Nettoyer
adb logcat | grep -E "AdminScreen|ConfigDetail|BagBot"
```

**Méthode 2: Via Android Studio**

1. Ouvrir Android Studio
2. Menu: View > Tool Windows > Logcat
3. Connecter téléphone en USB
4. Filtrer sur: `AdminScreen|ConfigDetail`

### Test Inactivité

1. Dans l'app: Config > Modération & Sécurité
2. Cliquer sur: "🦶 Auto-kick & Inactivité"
3. **Observer les logs** (chercher "ConfigDetail")

**Logs attendus (si tout fonctionne):**
```
ConfigDetail: 📊 autokick keys: [enabled, delayMs, inactivityKick, ...]
ConfigDetail: 🔍 inactivityKick exists: true
ConfigDetail: 📋 inactivityKick keys: [enabled, delayDays, ...]
ConfigDetail: ✅ enabled=true, delayDays=30, tracked=X
```

**Logs si problème:**
```
ConfigDetail: ⚠️ inactivityKick is NULL - autokick structure: {...}
```

### Test Gestion Accès

1. Dans l'app: Admin > Gestion des Accès
2. **Observer les logs** (chercher "AdminScreen")

**Logs attendus (si tout fonctionne):**
```
AdminScreen: 🔄 Chargement allowed users...
AdminScreen: 📥 Response: {"allowedUsers":[...]}
AdminScreen: 👥 Users array size: X
AdminScreen: ✅ Loaded X users
```

**Logs si problème:**
```
AdminScreen: ❌ Error loading allowed users: [message erreur]
AdminScreen: Stack trace: [trace complète]
```

### Rapporter les Logs

Si le problème persiste:

1. **Copiez TOUS les logs** depuis `adb logcat`
2. Ou prenez des screenshots de Logcat Android Studio
3. Cherchez les lignes avec **❌** ou **⚠️**
4. Envoyez les logs complets

---

## 🔍 Diagnostic Backend

### Vérifier la structure de la config

```bash
ssh freebox@192.168.1.254 "cat /home/freebox/bagbot/data/config.json | jq '.guilds | to_entries[0].value.autokick.inactivityKick'"
```

**Attendu:**
```json
{
  "enabled": true,
  "delayDays": 30,
  "excludedRoleIds": [...],
  "trackActivity": true
}
```

### Tester l'API directement

```bash
# Depuis votre machine, récupérer votre token
# Puis:
curl -H "Authorization: Bearer VOTRE_TOKEN" http://votre-serveur:3001/api/configs | jq .autokick.inactivityKick
```

---

## 📊 Résumé Actions

| Action | Où | Commande |
|--------|-----|----------|
| **Déployer bot** | Machine locale | `./DEPLOYER_BOT_SIMPLE.sh` |
| **Vérifier déploiement** | SSH | `git log -1 && pm2 list` |
| **Tester tribunal** | Discord | `/tribunal` |
| **Installer APK** | Android | Télécharger depuis GitHub |
| **Logs Android** | USB + ADB | `adb logcat \| grep AdminScreen` |
| **Rapporter problème** | Avec logs | Copier les logs complets |

---

## ❓ FAQ

### Q: Pourquoi je dois déployer depuis ma machine?

**R:** L'environnement cloud où je travaille n'a **pas d'accès réseau** à votre Freebox locale (192.168.1.254). Seule votre machine peut s'y connecter.

### Q: Le script DEPLOYER_BOT_SIMPLE.sh demande un mot de passe

**R:** Tapez: `Freebox2011$`

### Q: L'erreur tribunal persiste après déploiement

**R:** Vérifiez:
1. Commit actuel: `git log -1 --oneline` → doit être `d68e31b` ou plus récent
2. Contenu du fichier: `grep "ButtonBuilder" src/commands/tribunal.js` → doit trouver des lignes
3. Bot redémarré: `pm2 logs bagbot --lines 10` → doit montrer restart récent

### Q: L'inactivité affiche toujours "désactivé" même avec v6.1.2

**R:** Version v6.1.2 n'**ajoute que des logs**. Les logs vous indiqueront:
- Si `inactivityKick` existe
- Si `enabled` vaut `true` ou `false`
- La structure exacte retournée par l'API

Envoyez ces logs pour identifier le vrai problème.

### Q: Comment voir les logs Android sans ADB?

**R:** Utilisez une app comme "Logcat Reader" depuis le Play Store (nécessite root ou ADB pour activer). Sinon, connectez en USB avec Android Studio.

---

## 🎯 Checklist Complète

- [ ] Déployé le bot avec `./DEPLOYER_BOT_SIMPLE.sh`
- [ ] Vérifié commit: `d68e31b` ou plus récent
- [ ] Bot redémarré avec succès
- [ ] Testé `/tribunal` sur Discord → ✅ bouton apparaît sans erreur
- [ ] Installé APK v6.1.2 sur Android
- [ ] Activé logs ADB ou Logcat
- [ ] Testé Inactivité dans l'app
- [ ] Testé Gestion Accès dans l'app
- [ ] Capturé les logs complets
- [ ] Rapporté les logs s'il y a des erreurs

---

**Contact:** Rapportez tout problème avec les logs complets (Discord + Android) pour diagnostic précis.
