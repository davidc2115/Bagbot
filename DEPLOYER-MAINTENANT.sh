#!/bin/bash
#
# 🚀 SCRIPT DE DÉPLOIEMENT AUTOMATIQUE - MOT-CACHE
# Exécutez ce script sur votre serveur Discord pour déployer immédiatement
#

set -e  # Arrêter en cas d'erreur

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║     🚀 DÉPLOIEMENT AUTOMATIQUE - COMMANDE /MOT-CACHE                ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ ERREUR: Exécutez ce script depuis la racine du projet Bag-bot"
    exit 1
fi

echo "📍 Répertoire: $(pwd)"
echo ""

# Étape 1: Vérification
echo "🔍 ÉTAPE 1/4 - Vérification des fichiers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "verify-mot-cache.js" ]; then
    node verify-mot-cache.js || echo "⚠️  Vérification avec avertissements, on continue..."
else
    echo "✅ Fichiers mot-cache trouvés"
    ls -1 src/commands/mot-cache.js src/modules/mot-cache-*.js
fi

echo ""

# Étape 2: Déploiement des commandes
echo "📤 ÉTAPE 2/4 - Déploiement des commandes Discord..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "deploy-mot-cache.js" ]; then
    node deploy-mot-cache.js
else
    echo "⚠️  deploy-mot-cache.js introuvable, utilisation du script standard..."
    node deploy-guild-commands.js
fi

echo ""

# Étape 3: Redémarrage du bot
echo "🔄 ÉTAPE 3/4 - Redémarrage du bot..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Détecter le gestionnaire de processus
if command -v pm2 &> /dev/null; then
    echo "🔧 Utilisation de PM2..."
    pm2 restart bagbot || pm2 restart all
    echo "✅ Bot redémarré avec PM2"
elif systemctl is-active --quiet bagbot 2>/dev/null; then
    echo "🔧 Utilisation de systemd..."
    sudo systemctl restart bagbot
    echo "✅ Bot redémarré avec systemd"
else
    echo "⚠️  Gestionnaire de processus non détecté"
    echo "   Veuillez redémarrer le bot manuellement"
    echo ""
    echo "   Commandes possibles:"
    echo "   - pm2 restart bagbot"
    echo "   - sudo systemctl restart bagbot"
    echo "   - pkill -f 'node src/bot.js' && node src/bot.js &"
fi

echo ""

# Étape 4: Instructions finales
echo "✅ ÉTAPE 4/4 - Finalisation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ !"
echo ""
echo "📋 Prochaines étapes sur Discord:"
echo ""
echo "   1. Taper / dans un salon"
echo "   2. Chercher 'mot-cache'"
echo "   3. Vérifier que ces 3 commandes apparaissent:"
echo "      • /mot-cache jouer"
echo "      • /mot-cache deviner"
echo "      • /mot-cache config"
echo ""
echo "   4. Configuration (admin uniquement):"
echo "      /mot-cache config"
echo ""
echo "   5. Définir un mot secret (ex: CALIN)"
echo "   6. Choisir le mode (Probabilité 5% recommandé)"
echo "   7. Activer le jeu ▶️"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎮 LE JEU EST PRÊT !"
echo ""
echo "   • Les joueurs écrivent des messages (15+ caractères)"
echo "   • Le bot réagit avec 🔍 quand une lettre est cachée"
echo "   • Premier à deviner gagne 5000 BAG$ 💰"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation:"
echo "   - RESUME-FINAL.txt"
echo "   - GUIDE-DEPLOIEMENT-COMPLET.txt"
echo "   - docs/MOT-CACHE-DEPLOY.md"
echo ""
echo "╚═══════════════════════════════════════════════════════════════════════╝"
