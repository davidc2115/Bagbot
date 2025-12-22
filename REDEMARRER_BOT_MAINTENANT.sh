#!/bin/bash
# Script de redémarrage du bot Discord sur Freebox
# À exécuter sur votre machine locale

echo "🔄 REDÉMARRAGE DU BOT DISCORD"
echo "═══════════════════════════════════════"
echo ""
echo "📡 Connexion à la Freebox..."
echo "   Host: 88.174.155.230"
echo "   Port: 33000"
echo "   User: bagbot"
echo ""
echo "⚠️  Mot de passe: bagbot"
echo ""

# Connexion SSH et redémarrage
ssh -p 33000 bagbot@88.174.155.230 << 'ENDSSH'
cd /home/bagbot/Bag-bot
echo ""
echo "📂 Dossier actuel: $(pwd)"
echo ""
echo "🔄 Redémarrage du bot..."
pm2 restart bagbot
echo ""
echo "✅ Bot redémarré !"
echo ""
echo "📊 Statut actuel:"
pm2 status
echo ""
echo "📋 Derniers logs (20 lignes):"
pm2 logs bagbot --lines 20 --nostream
echo ""
echo "✨ Redémarrage terminé avec succès !"
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ REDÉMARRAGE TERMINÉ"
echo ""
echo "💡 Prochaines étapes:"
echo "   1. Tester /mot-cache sur Discord"
echo "   2. Cliquer sur '⚙️ Config'"
echo "   3. Vérifier qu'il n'y a pas d'échec d'interaction"
echo ""
