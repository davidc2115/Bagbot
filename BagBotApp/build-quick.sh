#!/bin/bash

echo "🚀 Script de Build Rapide - BAG Bot Dashboard Mobile"
echo "=================================================="
echo ""

cd /workspace/BagBotApp

echo "📋 Vérification des prérequis..."
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI n'est pas installé"
    echo "Installation en cours..."
    npm install -g eas-cli
fi

echo "✅ EAS CLI détecté"
echo ""

echo "🔐 Authentification requise..."
echo "Créez un compte gratuit sur https://expo.dev si nécessaire"
echo ""

# Vérifier si déjà authentifié
if eas whoami &> /dev/null; then
    echo "✅ Déjà authentifié"
else
    echo "📝 Veuillez vous connecter:"
    eas login
fi

echo ""
echo "🔨 Lancement du build..."
echo "⏱️  Durée estimée: 10-15 minutes"
echo ""

# Configurer si nécessaire
if [ ! -f "eas.json" ]; then
    echo "Configuration du projet..."
    eas build:configure
fi

# Lancer le build
echo "🏗️  Compilation de l'APK en cours..."
eas build --platform android --profile production

echo ""
echo "✅ Build lancé!"
echo ""
echo "📱 L'APK sera disponible sur:"
echo "   https://expo.dev"
echo ""
echo "💡 Vous recevrez un email quand le build sera terminé"
echo "   ou consultez: eas build:list"
echo ""
