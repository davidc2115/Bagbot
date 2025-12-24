#!/bin/bash
# ⚡ DÉPLOIEMENT URGENT - Correctif Tribunal v6.1.1
# Exécutez ce script depuis votre machine locale qui a accès à la Freebox

set -e

echo "🚀 Déploiement URGENT du correctif Tribunal"
echo "=============================================="
echo ""
echo "📝 Correctif: ButtonBuilder dans tribunal.js"
echo "🎯 Résout: component.toJSON is not a function"
echo ""

# Connexion à la Freebox
echo "📡 Connexion au serveur Freebox (192.168.1.254)..."
ssh freebox@192.168.1.254 << 'ENDSSH'
set -e

echo ""
echo "📂 Navigation vers le répertoire du bot..."
cd /home/freebox/bagbot

echo ""
echo "📥 Récupération des dernières modifications..."
git fetch origin cursor/admin-chat-and-bot-function-a285

echo ""
echo "🔄 Mise à jour du code..."
git reset --hard origin/cursor/admin-chat-and-bot-function-a285

echo ""
echo "✅ Commit actuel:"
git log -1 --oneline

echo ""
echo "🔄 Redémarrage du bot Discord..."
pm2 restart bagbot

echo ""
echo "⏳ Attente du redémarrage (5 secondes)..."
sleep 5

echo ""
echo "📊 Status PM2:"
pm2 list | grep bagbot

echo ""
echo "📋 Derniers logs:"
pm2 logs bagbot --lines 15 --nostream

ENDSSH

echo ""
echo "=============================================="
echo "✅ Déploiement terminé!"
echo ""
echo "🧪 TESTEZ MAINTENANT:"
echo "   1. Sur Discord, tapez: /tribunal"
echo "   2. Remplissez: accusé, avocat, chef d'accusation"
echo "   3. Vérifiez que le bouton apparaît SANS erreur"
echo ""
echo "✅ L'erreur 'component.toJSON is not a function' devrait être corrigée!"
echo ""
echo "📱 APK Android v6.1.1 disponible ici:"
echo "   https://github.com/mel805/Bagbot/releases/download/v6.1.1/BagBot-Manager-v6.1.1-android.apk"
