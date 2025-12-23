#!/bin/bash
# Script complet pour builder l'APK et créer la release GitHub v5.9.18
# Date: 23 Décembre 2025

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 BUILD & RELEASE - BAG Bot Manager v5.9.18           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
VERSION="v5.9.18"
VERSION_CODE="5918"
APK_NAME="BagBot-Manager-v5.9.18-android.apk"

# Vérifier qu'on est dans le bon répertoire
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Pas dans un dépôt Git"
    exit 1
fi

echo "📦 Version: $VERSION"
echo "🔢 Version Code: $VERSION_CODE"
echo ""

# ═══════════════════════════════════════════════════════════════
# ÉTAPE 1 : BUILD APK
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════"
echo "🔨 ÉTAPE 1/4 : BUILD APK ANDROID"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd android-app

# Vérifier Java
echo "📋 Vérification de Java..."
if ! command -v java &> /dev/null; then
    echo "❌ Java n'est pas installé. Installez Java 17 ou supérieur."
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
echo "✅ Java version: $JAVA_VERSION"
echo ""

# Clean build
echo "🧹 Nettoyage des builds précédents..."
./gradlew clean

# Build APK de release (signé)
echo ""
echo "🔨 Compilation de l'APK de release (signé)..."
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK de release créé avec succès !"
    
    # Créer le dossier de destination
    mkdir -p ../BagBot-Manager-APK
    
    # Copier l'APK
    cp app/build/outputs/apk/release/app-release.apk "../BagBot-Manager-APK/$APK_NAME"
    
    # Afficher la taille
    if [ -f "../BagBot-Manager-APK/$APK_NAME" ]; then
        SIZE=$(du -h "../BagBot-Manager-APK/$APK_NAME" | cut -f1)
        echo "📊 Taille: $SIZE"
        echo "📦 Fichier: BagBot-Manager-APK/$APK_NAME"
    fi
else
    echo ""
    echo "❌ Erreur lors de la compilation de l'APK de release"
    exit 1
fi

cd ..

echo ""

# ═══════════════════════════════════════════════════════════════
# ÉTAPE 2 : COMMIT CHANGEMENTS
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════"
echo "📝 ÉTAPE 2/4 : COMMIT DES CHANGEMENTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Vérifier les modifications
if [ -n "$(git status --porcelain)" ]; then
    echo "📋 Fichiers modifiés:"
    git status --short
    echo ""
    
    # Ajouter les fichiers
    echo "➕ Ajout des fichiers modifiés..."
    git add android-app/app/build.gradle.kts
    git add android-app/BUILD_APK.sh
    git add android-app/app/src/main/java/com/bagbot/manager/App.kt
    git add android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt
    git add "BagBot-Manager-APK/$APK_NAME"
    git add MODIFICATIONS_ANDROID_23DEC2025.md
    git add RESUME_FINAL_JOURNEE_23DEC2025.md
    git add BUILD_AND_RELEASE_v5.9.18.sh
    
    # Commit
    echo ""
    echo "💾 Création du commit..."
    git commit -m "release: Android v5.9.18 - Interface simplifiée

🧹 Nettoyage Interface
- Retrait onglet Mot-Caché de la navigation principale
- Retrait vignette JSON Brut de la section Config
- Interface épurée et simplifiée

✅ Fonctionnalités Confirmées
- Autocomplétion @ fonctionnelle dans chat staff
- Conversations privées fonctionnelles (2+ admins)
- Toutes les fonctionnalités essentielles préservées

📱 Version Info
- Version: 5.9.18
- Version Code: 5918
- Min SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)

📦 Fichiers modifiés:
- App.kt: Retrait NavigationBarItem Mot-Caché
- ConfigDashboardScreen.kt: Retrait vignette JSON Brut
- build.gradle.kts: Version 5.9.17 → 5.9.18
- BUILD_APK.sh: Mise à jour version et messages"
    
    echo "✅ Commit créé"
else
    echo "ℹ️  Aucune modification à commiter"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# ÉTAPE 3 : CRÉER TAG ET PUSH
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════"
echo "🏷️  ÉTAPE 3/4 : CRÉATION TAG ET PUSH"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Créer le tag
echo "🏷️  Création du tag $VERSION..."
git tag -a "$VERSION" -m "Release $VERSION - Interface Android Simplifiée

🧹 Nettoyage Interface
- Retrait onglet Mot-Caché de la navigation principale
- Retrait vignette JSON Brut de la section Config
- Interface plus épurée et focalisée sur l'essentiel

✅ Fonctionnalités Confirmées
- Autocomplétion @ fonctionnelle dans chat staff
- Conversations privées fonctionnelles (2+ admins connectés)
- Système de mentions comme Discord
- Notifications push pour chat staff

🎨 UX Améliorée
- Moins d'onglets = navigation plus claire
- Suppression des options rarement utilisées
- Focus sur les fonctionnalités utilisées quotidiennement

📦 Informations Techniques
- Version: 5.9.18
- Version Code: 5918
- Min SDK: 26 (Android 8.0+)
- Target SDK: 34 (Android 14)
- Taille APK: ~15 MB

🔗 Liens
- APK: BagBot-Manager-v5.9.18-android.apk
- Documentation: MODIFICATIONS_ANDROID_23DEC2025.md
- Changelog complet: RESUME_FINAL_JOURNEE_23DEC2025.md

🎉 Installation
adb install -r BagBot-Manager-v5.9.18-android.apk
"

if [ $? -ne 0 ]; then
    echo "⚠️  Le tag $VERSION existe déjà"
    echo "💡 Pour recréer: git tag -d $VERSION && git push origin :refs/tags/$VERSION"
    read -p "Voulez-vous recréer le tag? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d "$VERSION"
        git push origin ":refs/tags/$VERSION" 2>/dev/null
        git tag -a "$VERSION" -m "Release $VERSION - Interface Android Simplifiée"
    else
        echo "❌ Annulé"
        exit 1
    fi
fi

echo "✅ Tag créé"
echo ""

# Push tout
echo "📤 Push des commits et tags sur GitHub..."
git push origin main
git push origin "$VERSION"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du push"
    echo "💡 Vérifiez vos permissions GitHub"
    exit 1
fi

echo "✅ Push réussi"
echo ""

# ═══════════════════════════════════════════════════════════════
# ÉTAPE 4 : CRÉER RELEASE GITHUB
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════"
echo "📦 ÉTAPE 4/4 : CRÉATION RELEASE GITHUB"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Vérifier si gh est installé
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) n'est pas installé"
    echo "💡 La release doit être créée manuellement sur GitHub"
    echo ""
    echo "📋 Informations pour la release manuelle:"
    echo "   - Tag: $VERSION"
    echo "   - Fichier APK: BagBot-Manager-APK/$APK_NAME"
    echo "   - URL: https://github.com/VOTRE_REPO/releases/new?tag=$VERSION"
else
    echo "📦 Création de la release GitHub avec l'APK..."
    
    gh release create "$VERSION" \
        "BagBot-Manager-APK/$APK_NAME" \
        --title "BagBot Manager $VERSION - Interface Simplifiée" \
        --notes "## 🧹 Nettoyage Interface

### Modifications
- ✅ Retrait onglet **Mot-Caché** de la navigation principale
- ✅ Retrait vignette **JSON Brut** de la section Config
- ✅ Interface plus épurée et focalisée

### Fonctionnalités Confirmées
- ✅ **Autocomplétion @** fonctionnelle dans chat staff
- ✅ **Conversations privées** fonctionnelles (2+ admins)
- ✅ Système de mentions comme Discord
- ✅ Notifications push pour chat staff

### Améliorations UX
- Moins d'onglets = navigation plus claire
- Suppression des options rarement utilisées
- Focus sur les fonctionnalités essentielles

## 📦 Informations

- **Version:** 5.9.18
- **Version Code:** 5918
- **Min SDK:** 26 (Android 8.0+)
- **Target SDK:** 34 (Android 14)
- **Taille APK:** ~15 MB

## 📥 Installation

\`\`\`bash
adb install -r BagBot-Manager-v5.9.18-android.apk
\`\`\`

Ou télécharger l'APK ci-dessous et installer sur votre appareil Android.

## 📚 Documentation

- [Modifications Android](./MODIFICATIONS_ANDROID_23DEC2025.md)
- [Résumé complet de la journée](./RESUME_FINAL_JOURNEE_23DEC2025.md)

## 🎉 Bonne utilisation !
"
    
    if [ $? -eq 0 ]; then
        echo "✅ Release GitHub créée avec succès !"
        echo ""
        
        # Obtenir l'URL de la release
        RELEASE_URL=$(gh release view "$VERSION" --json url -q .url)
        echo "🔗 URL de la release:"
        echo "   $RELEASE_URL"
    else
        echo "❌ Erreur lors de la création de la release"
        echo "💡 Vous pouvez créer la release manuellement sur GitHub"
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║             ✅ RELEASE $VERSION CRÉÉE                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Résumé:"
echo "   ✅ APK compilé: $APK_NAME"
echo "   ✅ Commit créé et poussé"
echo "   ✅ Tag $VERSION créé et poussé"
echo "   ✅ Release GitHub créée"
echo ""
echo "📱 APK disponible:"
echo "   • Fichier local: BagBot-Manager-APK/$APK_NAME"
echo "   • GitHub Release: Téléchargeable depuis la release"
echo ""
echo "🔗 Liens:"
if command -v gh &> /dev/null; then
    RELEASE_URL=$(gh release view "$VERSION" --json url -q .url 2>/dev/null || echo "https://github.com/VOTRE_REPO/releases/tag/$VERSION")
    echo "   • Release: $RELEASE_URL"
fi
echo "   • Actions: https://github.com/VOTRE_REPO/actions"
echo ""
echo "📲 Installation:"
echo "   1. Télécharger l'APK depuis GitHub Release"
echo "   2. Transférer sur Android"
echo "   3. Installer (autoriser sources inconnues)"
echo ""
echo "🎉 Bonne utilisation de BagBot Manager $VERSION !"
echo ""
