#!/bin/bash
# Script à exécuter DEPUIS VOTRE MACHINE (pas depuis Cursor)

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DÉPLOIEMENT AUTOMATIQUE - MODIFICATIONS DASHBOARD       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🔧 Configuration:"
echo "   IP: 88.174.155.230"
echo "   Port SSH: 40000"
echo "   User: bagbot"
echo ""

# Test de connexion
echo "📡 Test de connexion..."
if sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p 40000 bagbot@88.174.155.230 "echo OK" &> /dev/null; then
    echo "✅ Connexion réussie!"
else
    echo "❌ Impossible de se connecter. Vérifiez:"
    echo "   - Êtes-vous sur le même réseau que la Freebox?"
    echo "   - Le port SSH est-il bien 40000?"
    echo "   - Les credentials sont-ils corrects?"
    exit 1
fi

echo ""
echo "📦 Déploiement en cours..."
echo ""

# Exécution des commandes sur la Freebox
sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -p 40000 bagbot@88.174.155.230 << 'REMOTE_SCRIPT'
cd /home/bagbot/Bag-bot

echo "💾 Création des sauvegardes..."
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
echo "   Date: $BACKUP_DATE"

cp src/commands/dashboard.js src/commands/dashboard.js.backup_$BACKUP_DATE
cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE
cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_$BACKUP_DATE
cp dashboard-v2/index.html dashboard-v2/index.html.backup_$BACKUP_DATE
cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE

echo "✅ Sauvegardes créées"
echo ""

echo "🔄 Modification des fichiers..."
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/commands/dashboard.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' src/utils/discord_gif_downloader.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/server-v2.js
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/index.html
sed -i 's|82\.67\.65\.98:3002|88.174.155.230:3002|g' dashboard-v2/auto_download_discord_gifs.js

echo "✅ Fichiers modifiés"
echo ""

echo "🔍 Vérification..."
COUNT=$(grep -r "88.174.155.230:3002" src/commands/dashboard.js src/utils/discord_gif_downloader.js dashboard-v2/server-v2.js dashboard-v2/index.html dashboard-v2/auto_download_discord_gifs.js 2>/dev/null | wc -l)
echo "   ✅ $COUNT occurrences de la nouvelle IP trouvées"
echo ""

echo "🔄 Redémarrage des services..."
pm2 restart bag-bot dashboard

echo ""
echo "📊 État des services:"
pm2 list

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ!"
echo ""
echo "🔍 Pour vérifier les logs:"
echo "   pm2 logs bag-bot --lines 20"
echo ""
echo "🔙 Pour restaurer (si besoin):"
echo "   cd /home/bagbot/Bag-bot"
echo "   cp src/commands/dashboard.js.backup_$BACKUP_DATE src/commands/dashboard.js"
echo "   cp src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE src/utils/discord_gif_downloader.js"
echo "   cp dashboard-v2/server-v2.js.backup_$BACKUP_DATE dashboard-v2/server-v2.js"
echo "   cp dashboard-v2/index.html.backup_$BACKUP_DATE dashboard-v2/index.html"
echo "   cp dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE dashboard-v2/auto_download_discord_gifs.js"
echo "   pm2 restart bag-bot dashboard"
REMOTE_SCRIPT

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    ✅ TERMINÉ!                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Testez maintenant sur Discord:"
echo "   1. Tapez: /dashboard"
echo "   2. Vérifiez le lien: http://88.174.155.230:3002"
echo "   3. Cliquez sur le bouton pour accéder au dashboard"
echo ""
