#!/bin/bash
# Script pour redéployer TOUTES les commandes Discord (94 commandes)
# Date: 22 Décembre 2025

echo "🚀 DÉPLOIEMENT DES COMMANDES DISCORD"
echo "═══════════════════════════════════════"
echo ""
echo "📦 Déploiement de 94 commandes..."
echo ""

cd /home/bagbot/Bag-bot || exit 1

# Charger les variables d'environnement
if [ -f /var/data/.env ]; then
    export $(cat /var/data/.env | grep -v '^#' | xargs)
fi

# Vérifier que les tokens sont présents
if [ -z "$DISCORD_TOKEN" ]; then
    echo "❌ ERREUR: DISCORD_TOKEN non défini"
    exit 1
fi

if [ -z "$CLIENT_ID" ]; then
    echo "❌ ERREUR: CLIENT_ID non défini"
    exit 1
fi

if [ -z "$GUILD_ID" ]; then
    echo "❌ ERREUR: GUILD_ID non défini"
    exit 1
fi

echo "✅ Variables d'environnement chargées"
echo "   - CLIENT_ID: ${CLIENT_ID}"
echo "   - GUILD_ID: ${GUILD_ID}"
echo ""

# Déployer les commandes
echo "⏳ Déploiement en cours..."
node deploy-final.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DÉPLOIEMENT RÉUSSI !"
    echo ""
    echo "📊 Résumé:"
    echo "   - 94 commandes déployées"
    echo "   - Guild: ${GUILD_ID}"
    echo ""
    echo "⏰ Attendre 1-2 minutes pour la synchronisation Discord"
    echo ""
    echo "💡 Pour vérifier:"
    echo "   - Utiliser /help sur Discord"
    echo "   - Taper / et voir la liste des commandes"
else
    echo ""
    echo "❌ ERREUR LORS DU DÉPLOIEMENT"
    echo ""
    echo "🔍 Vérifier les logs ci-dessus pour plus de détails"
    exit 1
fi
