#!/bin/bash

# 🚀 Script de Build APK en Un Clic
# Il suffit de lancer ce script et de taper "y" quand demandé

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🚀 BUILD APK - BAG BOT DASHBOARD MOBILE                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration..."
echo ""

cd /workspace/BagBotApp
export EXPO_TOKEN="JKlsDNXifNh8IXoQdRlnxKI3hDjw0IQs522q5S0f"

echo "✅ Token configuré"
echo "✅ Projet : https://expo.dev/accounts/jormungand/projects/bagbotapp"
echo ""
echo "🏗️  Lancement du build..."
echo ""
echo "⚠️  IMPORTANT : Quand demandé, tapez 'y' puis Entrée"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

eas build --platform android --profile production

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Build lancé !"
echo ""
echo "📥 Récupérer l'APK :"
echo "   • Email : douvdouv21@gmail.com (dans 10-15 min)"
echo "   • Web   : https://expo.dev/accounts/jormungand/projects/bagbotapp/builds"
echo "   • CLI   : eas build:list"
echo ""
echo "⏱️  Le build prend 10-15 minutes"
echo ""
