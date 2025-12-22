#!/bin/bash
# Script de déploiement final - 22 Décembre 2025

echo "======================================"
echo "🚀 DÉPLOIEMENT FINAL v5.9.15"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Redémarrage du bot Discord
echo -e "${BLUE}[1/4] Redémarrage du bot Discord...${NC}"
echo ""
echo "Connexion SSH à la Freebox..."
echo "Mot de passe: bagbot"
echo ""

ssh -p 33000 bagbot@88.174.155.230 << 'EOF'
cd /home/bagbot/Bag-bot
echo "📥 Pull des dernières modifications..."
git pull origin cursor/command-deployment-and-emoji-issue-1db6

echo "🔄 Redémarrage du bot..."
pm2 restart bagbot

echo "⏳ Attente du démarrage (5s)..."
sleep 5

echo "📊 Logs récents:"
pm2 logs bagbot --lines 20 --nostream

echo ""
echo "✅ Bot redémarré avec succès!"
echo ""
echo "🔍 Pour voir les logs mot-cache:"
echo "   pm2 logs bagbot | grep 'MOT-CACHE'"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Bot Discord redémarré avec succès!${NC}"
else
    echo -e "${RED}❌ Erreur lors du redémarrage du bot${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo "======================================"
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Tester le système mot-caché:"
echo "   - /mot-cache → Config → Activer"
echo "   - Définir un mot: \"CALIN\""
echo "   - Envoyer des messages >15 caractères"
echo "   - Observer: pm2 logs bagbot | grep MOT-CACHE"
echo ""
echo "2️⃣  Compiler l'APK Android v5.9.15:"
echo "   cd android-app"
echo "   ./gradlew clean assembleRelease"
echo ""
echo "3️⃣  Ou créer release GitHub:"
echo "   git tag -a v5.9.15 -m 'Release v5.9.15 - Notifications + Mentions Discord-like'"
echo "   git push origin v5.9.15"
echo ""
echo "📝 Documentation complète: CORRECTIONS_FINALES_22DEC2025.md"
echo ""
