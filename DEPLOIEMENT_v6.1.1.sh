#!/bin/bash
# Script de déploiement v6.1.1 - Correctifs Android & Tribunal

set -e

echo "🚀 Déploiement v6.1.1 sur le serveur Freebox"
echo "=============================================="
echo ""

# Connexion au serveur Freebox
echo "📡 Connexion au serveur..."
sshpass -p 'Freebox2011$' ssh -o StrictHostKeyChecking=no freebox@192.168.1.254 << 'ENDSSH'
set -e

echo "📂 Changement de répertoire..."
cd /home/freebox/bagbot

echo "🔄 Mise à jour du code depuis GitHub..."
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285

echo "📊 Version actuelle:"
git log -1 --oneline

echo ""
echo "🔄 Redémarrage du bot Discord..."
pm2 restart bagbot

echo "🔄 Redémarrage de l'API..."
pm2 restart bot-api

echo ""
echo "⏳ Attente de 5 secondes pour démarrage..."
sleep 5

echo "✅ Status PM2:"
pm2 status | grep -E "bagbot|bot-api"

echo ""
echo "📋 Derniers logs du bot:"
pm2 logs bagbot --lines 10 --nostream

ENDSSH

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📝 Changements déployés:"
echo "  - ⚖️  Tribunal: Correction ButtonBuilder (component.toJSON)"
echo "  - 💤 Inactivité: Structure autokick.inactivityKick corrigée"
echo "  - 👥 Gestion accès: Extraction userId depuis objets API"
echo "  - 🎨 Splash: Image plein écran (Android uniquement)"
echo ""
echo "🔗 Release: https://github.com/mel805/Bagbot/releases/tag/v6.1.1"
echo ""
echo "📱 APK téléchargeable:"
echo "   https://github.com/mel805/Bagbot/releases/download/v6.1.1/BagBot-Manager-v6.1.1-android.apk"
