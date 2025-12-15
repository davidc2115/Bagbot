#!/bin/bash

# Script de génération APK pour BAG Bot Dashboard Mobile

echo "🚀 Génération de l'APK BAG Bot Dashboard"
echo "========================================"
echo ""

cd /workspace/BagBotApp

echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps

echo ""
echo "✅ Dépendances installées"
echo ""

# Méthode 1: Build Expo (plus simple, sans nécessiter EAS)
echo "📱 Génération de l'APK avec Expo..."
echo ""
echo "Pour générer l'APK, vous avez 2 options:"
echo ""
echo "Option 1 - EAS Build (Recommandé, nécessite un compte Expo):"
echo "  1. Installez EAS CLI: npm install -g eas-cli"
echo "  2. Connectez-vous: eas login"
echo "  3. Configurez: eas build:configure"
echo "  4. Générez l'APK: eas build --platform android --profile production"
echo ""
echo "Option 2 - Expo Build (Ancien, plus simple):"
echo "  1. Lancez: expo build:android"
echo "  2. Choisissez 'apk' comme type de build"
echo "  3. Attendez la fin du build (5-15 minutes)"
echo "  4. Téléchargez l'APK depuis le lien fourni"
echo ""
echo "Option 3 - Build local avec Android Studio:"
echo "  1. Installez Android Studio"
echo "  2. Configurez le SDK Android"
echo "  3. Lancez: npx react-native run-android --variant=release"
echo "  4. L'APK sera dans: android/app/build/outputs/apk/release/"
echo ""
echo "📝 Note: Le build peut prendre 10-20 minutes"
echo "📱 Taille estimée de l'APK: 50-60 MB"
echo ""
echo "✅ Projet prêt pour la génération d'APK!"
