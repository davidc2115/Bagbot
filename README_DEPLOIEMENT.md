# 🚀 Guide de Déploiement - Modifications Dashboard

## ❌ Connexion Directe Impossible

Je n'ai pas pu me connecter directement à votre Freebox depuis cet environnement car:
- L'adresse `88.174.155.230` n'est pas accessible depuis Internet
- Le serveur ne répond pas aux pings (timeout)
- Les ports SSH (22, 22222, 49085) sont tous inaccessibles

## ✅ Solutions Disponibles

### 📋 Option 1: Script Automatique (RECOMMANDÉ)

**À exécuter depuis une machine ayant accès SSH à la Freebox:**

\`\`\`bash
cd /workspace
./deploy-changes.sh
\`\`\`

Ce script va:
1. ✅ Se connecter à la Freebox
2. ✅ Créer des sauvegardes automatiques
3. ✅ Transférer tous les fichiers modifiés
4. ✅ Redémarrer les services (bot + dashboard)
5. ✅ Afficher l'état des services

**Prérequis:**
- `sshpass` installé: `sudo apt-get install sshpass`
- Accès SSH à la Freebox

---

### 📝 Option 2: Instructions Manuelles (SIMPLE)

**Consultez le fichier:** `INSTRUCTIONS_MANUELLES.txt`

Ou copiez-collez ces commandes directement dans votre SSH:

\`\`\`bash
# 1. Connexion
ssh -p 22222 bagbot@88.174.155.230

# 2. Aller dans le répertoire
cd /home/bagbot/Bag-bot

# 3. Créer sauvegardes
BACKUP_DATE=\$(date +%Y%m%d_%H%M%S)
cp src/commands/dashboard.js src/commands/dashboard.js.backup_\$BACKUP_DATE
cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_\$BACKUP_DATE
cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_\$BACKUP_DATE
cp dashboard-v2/index.html dashboard-v2/index.html.backup_\$BACKUP_DATE
cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_\$BACKUP_DATE

# 4. Remplacer l'ancienne IP par la nouvelle
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/commands/dashboard.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/utils/discord_gif_downloader.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/server-v2.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/index.html
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/auto_download_discord_gifs.js

# 5. Redémarrer
pm2 restart bag-bot dashboard
pm2 status
\`\`\`

---

### 📂 Option 3: Transfert Manuel par SCP

Si vous préférez transférer les fichiers modifiés depuis ce workspace:

\`\`\`bash
scp -P 22222 /workspace/src/commands/dashboard.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/src/commands/dashboard.js
scp -P 22222 /workspace/src/utils/discord_gif_downloader.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/src/utils/discord_gif_downloader.js
scp -P 22222 /workspace/dashboard-v2/server-v2.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/dashboard-v2/server-v2.js
scp -P 22222 /workspace/dashboard-v2/index.html bagbot@88.174.155.230:/home/bagbot/Bag-bot/dashboard-v2/index.html
scp -P 22222 /workspace/dashboard-v2/auto_download_discord_gifs.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/dashboard-v2/auto_download_discord_gifs.js

# Puis connectez-vous et redémarrez:
ssh -p 22222 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
pm2 restart bag-bot dashboard
\`\`\`

---

## 📁 Fichiers Préparés pour Vous

### Scripts de Déploiement
- ✅ `deploy-changes.sh` - Script automatique complet
- ✅ `deploy-manual.sh` - Générateur d'instructions
- ✅ `INSTRUCTIONS_MANUELLES.txt` - Guide pas à pas

### Documentation
- ✅ `MODIFICATIONS_DASHBOARD.txt` - Rapport détaillé
- ✅ `CHANGEMENTS_AVANT_APRES.md` - Comparaison avant/après
- ✅ `COMMANDES_FREEBOX.sh` - Commandes pour la Freebox
- ✅ `README_DEPLOIEMENT.md` - Ce fichier

### Fichiers Modifiés (prêts à déployer)
- ✅ `src/commands/dashboard.js`
- ✅ `src/utils/discord_gif_downloader.js`
- ✅ `dashboard-v2/server-v2.js`
- ✅ `dashboard-v2/index.html`
- ✅ `dashboard-v2/auto_download_discord_gifs.js`
- ✅ `deploy-to-freebox.sh`
- ✅ `docs/README.md`
- ✅ `dashboard-v2/list-cached-gifs.js`

### Sauvegardes Locales
- ✅ `*.backup` - Versions originales sauvegardées

---

## 🎯 Ce Qui a Été Changé

**Ancienne IP:** `82.67.65.98:3002`  
**Nouvelle IP:** `88.174.155.230:3002`

### Modifications dans 8 fichiers:
1. ✅ Bot - Commande /dashboard (2 URLs)
2. ✅ Bot - Téléchargeur GIFs (2 URLs)
3. ✅ Dashboard - Serveur backend (1 URL)
4. ✅ Dashboard - Interface web (1 URL API)
5. ✅ Dashboard - Auto-download GIFs (2 URLs)
6. ✅ Config - Script déploiement (1 IP)
7. ✅ Documentation (1 URL)
8. ✅ Utilitaire liste GIFs (1 URL)

**Total:** 11+ occurrences mises à jour

---

## ✅ Tests à Effectuer Après Déploiement

1. **Test de la commande Discord:**
   - Tapez `/dashboard` sur Discord
   - Vérifiez que le lien affiche: `http://88.174.155.230:3002`
   - Cliquez sur le bouton "🌐 Ouvrir le Dashboard"

2. **Test du dashboard:**
   - Ouvrez `http://88.174.155.230:3002` dans votre navigateur
   - Vérifiez que l'interface se charge correctement
   - Testez les fonctionnalités principales

3. **Test des GIFs:**
   - Créez une action avec un GIF Discord
   - Vérifiez que le GIF est correctement téléchargé et affiché

4. **Vérifier les logs:**
   \`\`\`bash
   pm2 logs bag-bot --lines 50
   pm2 logs dashboard --lines 50
   \`\`\`

---

## 🔙 Restauration (En Cas de Problème)

### Sur la Freebox:

\`\`\`bash
cd /home/bagbot/Bag-bot

# Remplacez YYYYMMDD_HHMMSS par votre timestamp
BACKUP_DATE="20251127_XXXXXX"

cp src/commands/dashboard.js.backup_\$BACKUP_DATE src/commands/dashboard.js
cp src/utils/discord_gif_downloader.js.backup_\$BACKUP_DATE src/utils/discord_gif_downloader.js
cp dashboard-v2/server-v2.js.backup_\$BACKUP_DATE dashboard-v2/server-v2.js
cp dashboard-v2/index.html.backup_\$BACKUP_DATE dashboard-v2/index.html
cp dashboard-v2/auto_download_discord_gifs.js.backup_\$BACKUP_DATE dashboard-v2/auto_download_discord_gifs.js

pm2 restart bag-bot dashboard
\`\`\`

---

## 💡 Besoin d'Aide?

- 📋 Consultez `MODIFICATIONS_DASHBOARD.txt` pour le rapport détaillé
- 📝 Consultez `CHANGEMENTS_AVANT_APRES.md` pour voir exactement ce qui a changé
- 🔧 Utilisez `INSTRUCTIONS_MANUELLES.txt` pour un guide pas à pas

---

**Date de préparation:** $(date)  
**Migration:** 82.67.65.98 → 88.174.155.230  
**Port:** 3002 (inchangé)
