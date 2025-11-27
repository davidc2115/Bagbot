# 🔧 Guide: Activer SSH sur Freebox

## 📋 Méthode 1: Via l'interface Freebox OS (Web)

### Étape 1: Se connecter à l'interface Freebox

1. **Ouvrez votre navigateur** et allez sur:
   - `http://mafreebox.freebox.fr`
   - Ou utilisez l'IP locale: `http://192.168.0.254` (ou `192.168.1.254`)

2. **Connectez-vous** avec vos identifiants Freebox

### Étape 2: Activer le mode avancé

1. En haut à droite, cliquez sur l'**icône des paramètres** ⚙️
2. Activez le **"Mode avancé"** si ce n'est pas déjà fait

### Étape 3: Activer l'accès SSH

1. Dans le menu de gauche, cliquez sur **"Paramètres de la Freebox"**
2. Allez dans l'onglet **"Mode avancé"**
3. Cherchez la section **"Accès à distance"** ou **"SSH"**
4. **Cochez la case "Activer l'accès SSH"**

### Étape 4: Configurer les paramètres SSH

**Port SSH:**
- Par défaut: `22`
- Recommandé pour sécurité: Changer vers un port non-standard (ex: `22222`, `40000`)
- ⚠️ Notez bien le port que vous choisissez!

**Mot de passe:**
- Utilisateur: `freebox` (par défaut)
- Le mot de passe est celui de votre compte Freebox

**Permettre l'accès depuis Internet:**
- Si vous voulez accéder depuis l'extérieur, cochez **"Autoriser l'accès depuis Internet"**
- Sinon, SSH sera limité au réseau local

### Étape 5: Sauvegarder

1. Cliquez sur **"Sauvegarder"** ou **"Valider"**
2. La Freebox peut demander un redémarrage

---

## 📋 Méthode 2: Via l'écran LCD de la Freebox

### Pour Freebox Revolution / Delta / Ultra

1. Sur l'écran LCD de la Freebox, naviguez avec les flèches
2. Allez dans **"Réglages"** → **"Système"**
3. Cherchez **"Mode SSH"** ou **"Accès distant"**
4. Activez **"SSH"**
5. Notez le port SSH affiché

---

## 📋 Méthode 3: Configuration pour utilisateur personnalisé (bagbot)

Si vous avez créé un utilisateur `bagbot` sur votre Freebox:

### Via l'interface Web:

1. Allez dans **Freebox OS** → **Paramètres**
2. **"Contrôle d'accès"** → **"Utilisateurs"**
3. Sélectionnez l'utilisateur **"bagbot"**
4. Assurez-vous qu'il a les droits **"Accès SSH"**
5. Vérifiez que le mot de passe est bien `bagbot`

---

## 🔍 Vérification après activation

### Depuis votre réseau local:

```bash
# Test de connexion (remplacez PORT par votre port SSH)
ssh -p PORT bagbot@192.168.0.254

# Ou avec l'IP publique (si accès Internet activé)
ssh -p PORT bagbot@88.174.155.230
```

### Commandes de test:

```bash
# Test avec l'utilisateur freebox par défaut
ssh -p 22 freebox@mafreebox.freebox.fr

# Test avec votre utilisateur bagbot
ssh -p 22222 bagbot@mafreebox.freebox.fr
```

---

## 🌐 Configuration du Pare-feu / NAT

Si vous voulez accéder depuis Internet (extérieur):

### 1. Redirection de port (si nécessaire)

Dans **Freebox OS** → **Paramètres de la Freebox** → **Mode avancé**:

1. Allez dans **"Gestion des ports"** ou **"NAT"**
2. Créez une redirection:
   - **Port externe:** `40000` (ou votre choix)
   - **Port interne:** `22` (port SSH de la Freebox)
   - **IP de destination:** L'IP de votre Freebox (192.168.x.x)
   - **Protocole:** TCP

### 2. Autoriser dans le pare-feu

1. **"Pare-feu"** → **"IPv4"**
2. Autorisez le port SSH entrant depuis Internet
3. Sauvegardez

---

## ⚙️ Ports SSH recommandés

- **22:** Port SSH standard (déconseillé pour Internet)
- **22222:** Port alternatif sécurisé ✅
- **40000:** Port personnalisé ✅
- **49022:** Autre alternative

⚠️ **Important:** Évitez d'utiliser le port `49085` car c'est votre port FTP!

---

## 🔐 Sécurisation SSH

### Recommandations de sécurité:

1. **Utilisez un port non-standard** (pas 22)
2. **Mot de passe fort** pour l'utilisateur
3. **Limitez l'accès aux IPs** si possible
4. **Activez l'authentification par clé SSH** (plus sécurisé)

### Désactiver l'accès SSH par mot de passe (optionnel):

Après configuration des clés SSH:

```bash
# Sur la Freebox
sudo nano /etc/ssh/sshd_config

# Modifier:
PasswordAuthentication no
PubkeyAuthentication yes

# Redémarrer SSH
sudo systemctl restart sshd
```

---

## 🧪 Tests de connectivité

Une fois SSH activé, testez depuis votre machine:

```bash
# Test depuis le réseau local
ssh -v -p PORT bagbot@192.168.0.254

# Test depuis Internet (si activé)
ssh -v -p PORT bagbot@88.174.155.230

# Avec sshpass (pour automatisation)
sshpass -p 'bagbot' ssh -p PORT bagbot@88.174.155.230
```

---

## ❓ Problèmes courants

### "Connection refused"
- ✅ Vérifiez que SSH est bien activé dans Freebox OS
- ✅ Vérifiez le port SSH (pas le port FTP!)
- ✅ Redémarrez la Freebox si nécessaire

### "Connection timed out"
- ✅ Vérifiez les règles du pare-feu
- ✅ Vérifiez la redirection de port (NAT)
- ✅ Assurez-vous que l'accès depuis Internet est autorisé

### "Permission denied"
- ✅ Vérifiez le nom d'utilisateur (bagbot ou freebox?)
- ✅ Vérifiez le mot de passe
- ✅ Vérifiez que l'utilisateur a les droits SSH

### "No route to host"
- ✅ Vérifiez que vous êtes sur le bon réseau
- ✅ Testez avec l'IP locale d'abord (192.168.x.x)
- ✅ Vérifiez votre connexion Internet

---

## 📞 Une fois SSH activé

**Revenez me voir et dites-moi:**
1. ✅ Quel port SSH avez-vous configuré?
2. ✅ Avez-vous activé l'accès depuis Internet?
3. ✅ Quel utilisateur utilisez-vous? (bagbot ou freebox?)

**Et je pourrai:**
- ✅ Me connecter directement à votre Freebox
- ✅ Appliquer automatiquement les modifications
- ✅ Redémarrer les services
- ✅ Vérifier que tout fonctionne

---

## 🎯 Objectif Final

Une fois SSH activé et configuré, je pourrai:

```bash
# Me connecter
ssh -p [VOTRE_PORT] bagbot@88.174.155.230

# Appliquer les modifications automatiquement
cd /home/bagbot/Bag-bot
# ... modifications du dashboard ...
pm2 restart bag-bot dashboard

# ✅ TERMINÉ!
```

---

**📌 Note importante:** Si vous ne trouvez pas l'option SSH dans Freebox OS, c'est peut-être que:
- Vous n'êtes pas en mode avancé
- Votre modèle de Freebox ne supporte pas SSH nativement
- Vous devez installer FreeboxOS Custom Firmware

Dans ce cas, dites-moi votre modèle de Freebox et je vous guiderai!
