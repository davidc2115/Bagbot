#!/bin/bash
# Script pour compiler l'APK Bagbot Manager
# Version 6.0.0

echo "🤖 Bagbot Manager - Build APK v6.0.0"
echo "======================================"
echo ""

# Vérifier que nous sommes dans le bon dossier
if [ ! -f "build.gradle.kts" ]; then
    echo "❌ Erreur : Ce script doit être exécuté depuis le dossier android-app/"
    exit 1
fi

# Vérifier Java
echo "📋 Vérification de Java..."
if ! command -v java &> /dev/null; then
    echo "❌ Java n'est pas installé. Installez Java 17 ou supérieur."
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
echo "✅ Java version: $JAVA_VERSION"

# Clean build
echo ""
echo "🧹 Nettoyage des builds précédents..."
./gradlew clean

# Build APK de debug (non signé)
echo ""
echo "🔨 Compilation de l'APK de debug..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK de debug créé avec succès !"
    echo "📦 Fichier: app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    
    # Afficher la taille
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
        echo "📊 Taille: $SIZE"
    fi
else
    echo ""
    echo "❌ Erreur lors de la compilation de l'APK de debug"
    exit 1
fi

# Build APK de release (signé)
echo ""
echo "🔨 Compilation de l'APK de release (signé)..."
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK de release créé avec succès !"
    echo "📦 Fichier: app/build/outputs/apk/release/app-release.apk"
    echo ""
    
    # Afficher la taille
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
        echo "📊 Taille: $SIZE"
    fi
    
    # Renommer avec numéro de version
    echo ""
    echo "📝 Création de BagBot-Manager-v6.0.3-android.apk..."
    mkdir -p ../BagBot-Manager-APK
    cp app/build/outputs/apk/release/app-release.apk ../BagBot-Manager-APK/BagBot-Manager-v6.0.3-android.apk
    echo "✅ Fichier final: BagBot-Manager-APK/BagBot-Manager-v6.0.3-android.apk"
    
else
    echo ""
    echo "❌ Erreur lors de la compilation de l'APK de release"
    echo "ℹ️  L'APK de debug est disponible dans app/build/outputs/apk/debug/"
    exit 1
fi

echo ""
echo "🎉 Build terminé avec succès !"
echo ""
echo "📱 Version v6.0.0:"
echo "   - 🎯 Nouvelle version majeure 6.0.0"
echo "   - 🧹 Interface simplifiée et épurée"
echo "   - ✅ Autocomplétion @ fonctionnelle"
echo "   - ✅ Conversations privées fonctionnelles"
echo ""
echo "📲 Installation:"
echo "   adb install -r ../BagBot-Manager-APK/BagBot-Manager-v6.0.0-android.apk"
echo ""
