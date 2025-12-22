#!/bin/bash
#
# Script de déploiement rapide des commandes Discord
# Ce script déploie toutes les commandes incluant la nouvelle commande /mot-cache
#

echo "🚀 Déploiement des commandes Discord"
echo "======================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    echo "   Assurez-vous d'exécuter ce script depuis la racine du projet"
    exit 1
fi

# Vérifier que les fichiers mot-cache existent
echo "🔍 Vérification des fichiers mot-cache..."
if [ ! -f "src/commands/mot-cache.js" ]; then
    echo "❌ Fichier manquant: src/commands/mot-cache.js"
    exit 1
fi

if [ ! -f "src/modules/mot-cache-handler.js" ]; then
    echo "❌ Fichier manquant: src/modules/mot-cache-handler.js"
    exit 1
fi

if [ ! -f "src/modules/mot-cache-buttons.js" ]; then
    echo "❌ Fichier manquant: src/modules/mot-cache-buttons.js"
    exit 1
fi

echo "✅ Tous les fichiers mot-cache sont présents"
echo ""

# Vérifier que bot.js intègre les handlers
echo "🔍 Vérification de l'intégration dans bot.js..."
if grep -q "mot-cache-handler" src/bot.js && grep -q "mot-cache-buttons" src/bot.js; then
    echo "✅ Les handlers sont intégrés dans bot.js"
else
    echo "⚠️  Les handlers ne semblent pas intégrés dans bot.js"
    echo "   Le jeu pourrait ne pas fonctionner correctement"
fi
echo ""

# Déployer les commandes
echo "📤 Déploiement des commandes sur Discord..."
echo ""

if [ -f "deploy-mot-cache.js" ]; then
    node deploy-mot-cache.js
else
    echo "⚠️  deploy-mot-cache.js introuvable, utilisation du script standard..."
    node deploy-guild-commands.js
fi

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Déploiement réussi !"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Redémarrer le bot Discord (si nécessaire)"
    echo "   2. Tester la commande /mot-cache sur Discord"
    echo "   3. Configurer le jeu avec /mot-cache config"
    echo ""
    echo "💡 Pour plus d'informations, consultez:"
    echo "   docs/MOT-CACHE-DEPLOY.md"
else
    echo "❌ Erreur lors du déploiement (code: $EXIT_CODE)"
    echo ""
    echo "💡 Vérifiez:"
    echo "   - Les variables d'environnement (DISCORD_TOKEN, CLIENT_ID, GUILD_ID)"
    echo "   - La connexion internet"
    echo "   - Les logs ci-dessus pour plus de détails"
fi

exit $EXIT_CODE
