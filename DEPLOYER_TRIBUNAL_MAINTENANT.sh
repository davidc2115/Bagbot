#!/bin/bash
# Déploiement urgent - Correctif Tribunal v6.1.1

echo "🚀 Déploiement correctif Tribunal sur Freebox"
echo "=============================================="
echo ""

# Variables
FREEBOX_IP="192.168.1.254"
FREEBOX_USER="freebox"
FREEBOX_PASS="Freebox2011$"

echo "📡 Connexion au serveur Freebox..."
sshpass -p "$FREEBOX_PASS" ssh -o StrictHostKeyChecking=no $FREEBOX_USER@$FREEBOX_IP << 'ENDSSH'

echo "📂 Changement de répertoire..."
cd /home/freebox/bagbot

echo "🔄 Mise à jour du code depuis GitHub..."
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285

echo ""
echo "📊 Commit actuel:"
git log -1 --pretty=format:"%h - %s" && echo ""

echo ""
echo "🔄 Redémarrage du bot Discord..."
pm2 restart bagbot

echo ""
echo "⏳ Attente de 5 secondes..."
sleep 5

echo ""
echo "📋 Logs récents du bot:"
pm2 logs bagbot --lines 20 --nostream | tail -30

echo ""
echo "✅ Status PM2:"
pm2 list | grep bagbot

ENDSSH

echo ""
echo "=============================================="
echo "✅ Déploiement terminé!"
echo ""
echo "🧪 Pour tester le tribunal:"
echo "   1. Sur Discord, tapez /tribunal"
echo "   2. Remplissez les champs"
echo "   3. Le bouton 'Devenir Juge' devrait apparaître sans erreur"
echo ""
echo "📝 Si l'erreur persiste, vérifiez les logs:"
echo "   ssh freebox@192.168.1.254"
echo "   pm2 logs bagbot --lines 50"
