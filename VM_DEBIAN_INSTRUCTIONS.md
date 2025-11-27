# 🖥️ Déploiement sur VM Debian (Freebox Delta)

## ✅ Parfait! Vous avez une VM Debian

Votre bot tourne sur une VM Debian hébergée sur votre Freebox Delta.
Voici comment appliquer les modifications directement!

---

## 🎯 Méthode 1: Connexion SSH depuis votre réseau local

### Depuis votre ordinateur (sur le même réseau):

```bash
# Connexion à la VM (testez ces possibilités)
ssh bagbot@192.168.x.x    # IP locale de la VM
ssh bagbot@88.174.155.230  # IP publique
ssh bagbot@vm-debian       # Nom d'hôte si configuré
```

**Si vous ne connaissez pas l'IP de la VM:**

1. Sur Freebox OS → **"VMs"** → Trouvez votre VM Debian
2. Notez son **IP locale** (ex: 192.168.0.50)
3. Connectez-vous: `ssh bagbot@192.168.0.50`

---

## 🎯 Méthode 2: Console VNC depuis Freebox OS

### Accès direct à la console de la VM:

1. Ouvrez **Freebox OS** (http://mafreebox.freebox.fr)
2. Allez dans **"VMs"** (Machines Virtuelles)
3. Sélectionnez votre **VM Debian**
4. Cliquez sur **"Console"** ou **"Accès VNC"**
5. Une fenêtre de terminal s'ouvre
6. Connectez-vous avec: `bagbot` / `bagbot`

---

## 🎯 Méthode 3: Console directe (si accès physique)

Si vous êtes devant votre Freebox Delta:

1. Sur l'écran tactile de la Freebox
2. **"VMs"** → Sélectionnez votre VM Debian
3. **"Ouvrir la console"**
4. Terminal direct!

---

## 🚀 COMMANDES À EXÉCUTER (Une fois connecté)

### Copiez-collez directement dans votre terminal VM:

```bash
cd /home/bagbot/Bag-bot

# 1. SAUVEGARDES
echo "💾 Création des sauvegardes..."
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cp src/commands/dashboard.js src/commands/dashboard.js.backup_$BACKUP_DATE
cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE
cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_$BACKUP_DATE
cp dashboard-v2/index.html dashboard-v2/index.html.backup_$BACKUP_DATE
cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE
echo "✅ Sauvegardes créées: backup_$BACKUP_DATE"

# 2. MODIFICATIONS (Remplacer l'ancienne IP par la nouvelle)
echo ""
echo "🔄 Modification des fichiers..."
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/commands/dashboard.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/utils/discord_gif_downloader.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/server-v2.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/index.html
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/auto_download_discord_gifs.js
echo "✅ Fichiers modifiés"

# 3. VÉRIFICATION
echo ""
echo "🔍 Vérification des modifications..."
echo "Nombre d'occurrences de la nouvelle IP:"
grep -r "88.174.155.230:3002" src/commands/dashboard.js src/utils/discord_gif_downloader.js dashboard-v2/server-v2.js dashboard-v2/index.html dashboard-v2/auto_download_discord_gifs.js 2>/dev/null | wc -l
echo ""

# 4. REDÉMARRAGE DES SERVICES
echo "🔄 Redémarrage des services..."
pm2 restart bag-bot dashboard

# 5. VÉRIFICATION FINALE
echo ""
echo "📊 État des services:"
pm2 list
echo ""
echo "✅ DÉPLOIEMENT TERMINÉ!"
echo ""
echo "🔍 Pour voir les logs:"
echo "   pm2 logs bag-bot --lines 20"
echo ""
echo "🎯 TESTEZ MAINTENANT:"
echo "   1. Allez sur Discord"
echo "   2. Tapez: /dashboard"
echo "   3. Vérifiez le lien: http://88.174.155.230:3002"
echo "   4. Cliquez sur le bouton pour accéder"
```

---

## 📋 VERSION CONDENSÉE (1 seule commande)

Si vous préférez tout exécuter d'un coup:

```bash
cd /home/bagbot/Bag-bot && BACKUP_DATE=$(date +%Y%m%d_%H%M%S) && cp src/commands/dashboard.js src/commands/dashboard.js.backup_$BACKUP_DATE && cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE && cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_$BACKUP_DATE && cp dashboard-v2/index.html dashboard-v2/index.html.backup_$BACKUP_DATE && cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE && sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/commands/dashboard.js && sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/utils/discord_gif_downloader.js && sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/server-v2.js && sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/index.html && sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/auto_download_discord_gifs.js && pm2 restart bag-bot dashboard && pm2 list && echo "✅ TERMINÉ! Testez /dashboard sur Discord"
```

---

## 🔍 Trouver l'IP de votre VM

Si vous ne savez pas comment vous connecter à la VM:

### Méthode 1: Via Freebox OS
1. http://mafreebox.freebox.fr
2. **"VMs"** → Sélectionnez votre VM
3. L'IP est affichée

### Méthode 2: Via la console Freebox
1. Écran tactile → **"VMs"**
2. Sélectionnez la VM
3. Info → IP locale

### Méthode 3: Scanner le réseau
```bash
# Depuis votre ordinateur
nmap -sn 192.168.0.0/24 | grep -B 2 "debian\|vm"
```

---

## ⚙️ Configuration des ports SSH de la VM

Si SSH n'est pas accessible sur la VM:

### Sur la VM Debian (via console):

```bash
# Vérifier si SSH est installé
sudo systemctl status ssh

# Installer SSH si nécessaire
sudo apt update
sudo apt install openssh-server

# Démarrer SSH
sudo systemctl start ssh
sudo systemctl enable ssh

# Vérifier le port SSH
sudo grep "^Port" /etc/ssh/sshd_config
```

### Redirection de port sur Freebox (optionnel):

Si vous voulez SSH depuis l'extérieur:

1. Freebox OS → **Paramètres** → **Gestion des ports**
2. Créez une redirection:
   - Port externe: `40000`
   - Port interne: `22`
   - IP destination: IP de votre VM (ex: 192.168.0.50)
   - Protocole: TCP
3. Sauvegardez

Puis: `ssh -p 40000 bagbot@88.174.155.230`

---

## 🔙 Restauration (si problème)

```bash
cd /home/bagbot/Bag-bot

# Remplacez YYYYMMDD_HHMMSS par votre timestamp de sauvegarde
BACKUP_DATE="20251127_XXXXXX"

cp src/commands/dashboard.js.backup_$BACKUP_DATE src/commands/dashboard.js
cp src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE src/utils/discord_gif_downloader.js
cp dashboard-v2/server-v2.js.backup_$BACKUP_DATE dashboard-v2/server-v2.js
cp dashboard-v2/index.html.backup_$BACKUP_DATE dashboard-v2/index.html
cp dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE dashboard-v2/auto_download_discord_gifs.js

pm2 restart bag-bot dashboard
```

---

## ✅ Après le Déploiement

**Testez immédiatement:**
1. Sur Discord: `/dashboard`
2. Le lien devrait afficher: `http://88.174.155.230:3002`
3. Cliquez et vérifiez que le dashboard s'ouvre

**Si ça ne marche pas:**
- Vérifiez les logs: `pm2 logs bag-bot --lines 50`
- Vérifiez le dashboard: `pm2 logs dashboard --lines 50`
- Restaurez les sauvegardes si nécessaire

---

## 💡 Besoin d'Aide?

Si vous avez un problème:
1. Montrez-moi les logs: `pm2 logs bag-bot --lines 30`
2. Vérifiez l'état: `pm2 status`
3. Testez la commande `/dashboard` sur Discord

**Tout est prêt! Il suffit de vous connecter à votre VM et d'exécuter les commandes!** 🚀
