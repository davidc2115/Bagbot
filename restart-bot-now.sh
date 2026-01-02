#!/bin/bash
# Script SIMPLE de redémarrage du bot
# Exécutez depuis votre machine locale avec: bash restart-bot-now.sh

echo ""
echo "🚀 REDÉMARRAGE DU BOT - Actions v6.1.18"
echo "════════════════════════════════════════════════"
echo ""

# Connexion SSH et redémarrage
ssh -p 33000 bagbot@88.174.155.230 << 'ENDSSH'
cd /home/bagbot/Bag-bot

echo "📂 Dossier: $(pwd)"
echo ""
echo "🔄 Redémarrage du bot..."
pm2 restart bagbot

sleep 3

echo ""
echo "✅ Bot redémarré!"
echo ""
echo "📊 Statut PM2:"
pm2 status

echo ""
echo "📋 Derniers logs:"
pm2 logs bagbot --lines 15 --nostream

echo ""
echo "🔍 Test de l'endpoint actions:"
curl -s http://localhost:3000/api/debug/actions | head -20

ENDSSH

echo ""
echo "════════════════════════════════════════════════"
echo "✅ TERMINÉ!"
echo ""
echo "🧪 Prochaine étape:"
echo "   Rouvrez l'app Android v6.1.18 et vérifiez"
echo "   Config > Actions ou Économie > Actions"
echo "   Vous devriez voir les 56 actions! 🎉"
echo ""
