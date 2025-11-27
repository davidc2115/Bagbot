#!/bin/bash

# Script de déploiement MANUEL - Instructions pas à pas
# À copier-coller dans votre terminal connecté à la Freebox

cat << 'EOF'

╔═══════════════════════════════════════════════════════════╗
║     DÉPLOIEMENT MANUEL - COPIER/COLLER CES COMMANDES     ║
╚═══════════════════════════════════════════════════════════╝

Connectez-vous d'abord à votre Freebox:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ssh -p 22222 bagbot@88.174.155.230
# Mot de passe: bagbot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 1: Aller dans le répertoire du bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd /home/bagbot/Bag-bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 2: Créer des sauvegardes (IMPORTANT!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cp src/commands/dashboard.js src/commands/dashboard.js.backup_$BACKUP_DATE
cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE
cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_$BACKUP_DATE
cp dashboard-v2/index.html dashboard-v2/index.html.backup_$BACKUP_DATE
cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE
echo "✅ Sauvegardes créées: backup_$BACKUP_DATE"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 3: Modifier les fichiers (remplacer l'ancienne IP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Fichier 1: src/commands/dashboard.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/commands/dashboard.js

# Fichier 2: src/utils/discord_gif_downloader.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/utils/discord_gif_downloader.js

# Fichier 3: dashboard-v2/server-v2.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/server-v2.js

# Fichier 4: dashboard-v2/index.html
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/index.html

# Fichier 5: dashboard-v2/auto_download_discord_gifs.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/auto_download_discord_gifs.js

# Fichier 6: deploy-to-freebox.sh (si existe)
sed -i 's|82\.67\.65\.98|88.174.155.230|g' deploy-to-freebox.sh 2>/dev/null || true

# Fichier 7: docs/README.md (si existe)
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' docs/README.md 2>/dev/null || true

# Fichier 8: dashboard-v2/list-cached-gifs.js (si existe)
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/list-cached-gifs.js 2>/dev/null || true

echo "✅ Tous les fichiers ont été modifiés"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 4: Vérifier les modifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "Vérification des modifications:"
grep -n "88.174.155.230:3002" src/commands/dashboard.js
grep -n "88.174.155.230:3002" src/utils/discord_gif_downloader.js | head -2
grep -n "88.174.155.230:3002" dashboard-v2/server-v2.js
grep -n "88.174.155.230:3002" dashboard-v2/index.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 5: Redémarrer les services
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

pm2 restart bag-bot dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 6: Vérifier l'état des services
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

pm2 status
pm2 logs bag-bot --lines 20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TERMINÉ!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testez maintenant:
1. Utilisez la commande /dashboard sur Discord
2. Le lien devrait pointer vers: http://88.174.155.230:3002
3. Cliquez sur le lien pour accéder au dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔙 RESTAURATION (en cas de problème)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si quelque chose ne fonctionne pas, restaurez les sauvegardes:

cd /home/bagbot/Bag-bot
# Remplacez YYYYMMDD_HHMMSS par la date de votre sauvegarde
BACKUP_DATE="YYYYMMDD_HHMMSS"
cp src/commands/dashboard.js.backup_$BACKUP_DATE src/commands/dashboard.js
cp src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE src/utils/discord_gif_downloader.js
cp dashboard-v2/server-v2.js.backup_$BACKUP_DATE dashboard-v2/server-v2.js
cp dashboard-v2/index.html.backup_$BACKUP_DATE dashboard-v2/index.html
cp dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE dashboard-v2/auto_download_discord_gifs.js
pm2 restart bag-bot dashboard

EOF
