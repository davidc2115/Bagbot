#!/bin/bash

# 🚀 Script de Build et Release - BAG Bot Dashboard Mobile
# Ce script lance le build EAS et surveille la progression

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🚀 BUILD & RELEASE - BAG Bot Dashboard Mobile v1.1     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

cd /workspace/BagBotApp

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    exit 1
fi

echo "📋 Étape 1/5 : Vérification des prérequis"
echo "─────────────────────────────────────────"

# Vérifier Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js non installé"
    exit 1
fi

# Vérifier npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm non installé"
    exit 1
fi

# Vérifier EAS CLI
if command -v eas &> /dev/null; then
    echo "✅ EAS CLI installé"
else
    echo "❌ EAS CLI non installé. Installation..."
    npm install -g eas-cli
fi

echo ""
echo "📦 Étape 2/5 : Installation des dépendances"
echo "─────────────────────────────────────────"
npm install --legacy-peer-deps
echo "✅ Dépendances installées"

echo ""
echo "🔐 Étape 3/5 : Connexion à Expo"
echo "─────────────────────────────────────────"
echo ""
echo "⚠️  VOUS DEVEZ VOUS CONNECTER MAINTENANT"
echo ""
echo "Si vous n'avez pas de compte Expo :"
echo "  1. Allez sur https://expo.dev"
echo "  2. Créez un compte gratuit"
echo "  3. Revenez ici et connectez-vous"
echo ""
echo "Commande à exécuter :"
echo "  eas login"
echo ""
read -p "Appuyez sur Entrée quand vous êtes connecté..."

echo ""
echo "🔧 Étape 4/5 : Configuration du projet"
echo "─────────────────────────────────────────"

# Vérifier si le projet est déjà configuré
if [ -f ".easrc" ] || grep -q "projectId" app.json 2>/dev/null; then
    echo "✅ Projet déjà configuré"
else
    echo "Configuration du projet..."
    eas build:configure
fi

echo ""
echo "🚀 Étape 5/5 : Lancement du build"
echo "─────────────────────────────────────────"
echo ""
echo "🎯 Build de production APK Android"
echo ""

# Lancer le build
eas build --platform android --profile production --non-interactive

BUILD_STATUS=$?

echo ""
echo "════════════════════════════════════════"
if [ $BUILD_STATUS -eq 0 ]; then
    echo "✅ BUILD LANCÉ AVEC SUCCÈS !"
    echo "════════════════════════════════════════"
    echo ""
    echo "📊 Le build est en cours..."
    echo ""
    echo "🔗 Pour suivre la progression :"
    echo "   1. Allez sur https://expo.dev"
    echo "   2. Cliquez sur 'Builds'"
    echo "   3. Surveillez le build en cours"
    echo ""
    echo "⏱️  Temps estimé : 10-20 minutes"
    echo ""
    echo "📱 Une fois terminé :"
    echo "   1. Téléchargez l'APK depuis le lien fourni"
    echo "   2. L'APK sera aussi accessible sur expo.dev"
    echo "   3. Partagez le lien avec votre équipe"
    echo ""
    echo "💡 Commandes utiles :"
    echo "   • Voir tous les builds   : eas build:list"
    echo "   • Voir le dernier build  : eas build:view --latest"
    echo "   • Télécharger l'APK      : eas build:download --latest"
    echo ""
else
    echo "❌ ERREUR LORS DU LANCEMENT DU BUILD"
    echo "════════════════════════════════════════"
    echo ""
    echo "🔧 Vérifiez :"
    echo "   • Que vous êtes connecté : eas whoami"
    echo "   • Votre connexion Internet"
    echo "   • Les logs d'erreur ci-dessus"
    echo ""
    echo "📚 Documentation : https://docs.expo.dev/build/setup/"
fi

echo ""
echo "════════════════════════════════════════"
echo "✨ Script terminé"
echo "════════════════════════════════════════"
