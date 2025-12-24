#!/bin/bash
# Script simple de déploiement - À exécuter depuis votre machine locale

echo "🚀 Déploiement BagBot sur Freebox"
echo "=================================="
echo ""
echo "📝 Connexion à freebox@192.168.1.254..."
echo ""

ssh freebox@192.168.1.254 << 'EOF'
cd /home/freebox/bagbot
echo "📥 Récupération des mises à jour..."
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285
echo ""
echo "✅ Commit actuel:"
git log -1 --oneline
echo ""
echo "🔄 Redémarrage du bot..."
pm2 restart bagbot
pm2 restart bot-api
echo ""
echo "⏳ Attente 3 secondes..."
sleep 3
echo ""
echo "📊 Status:"
pm2 list | grep -E "bagbot|bot-api"
echo ""
echo "📋 Derniers logs:"
pm2 logs bagbot --lines 10 --nostream
EOF

echo ""
echo "=================================="
echo "✅ Déploiement terminé!"
echo ""
echo "🧪 Testez maintenant:"
echo "   - Discord: /tribunal"
echo "   - Android App: Inactivité & Gestion accès"
