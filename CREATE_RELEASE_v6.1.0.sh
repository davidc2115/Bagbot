#!/bin/bash

# Script pour créer le release v6.1.0 avec le système de tribunal

VERSION="v6.1.0"

echo "🎯 Création du release $VERSION"

# Vérifier que nous sommes sur la bonne branche
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Branche actuelle: $CURRENT_BRANCH"

# Créer le tag
echo "🏷️ Création du tag $VERSION..."
git tag -a "$VERSION" -m "Release $VERSION - Système de Tribunal + Nouveau Splash Screen

✨ Nouvelles fonctionnalités:
- ⚖️ Système de tribunal complet (/tribunal, /fermer-tribunal)
- 🎨 Nouveau splash screen personnalisé
- 📱 Configuration tribunal dans l'app Android

🔧 Améliorations:
- Handlers tribunal intégrés dans bot.js
- Rôles automatiques (Accusé, Avocat, Juge)
- Catégorie dédiée aux tribunaux
- Interface Android améliorée

📦 Version:
- Bot Discord: Commandes tribunal ajoutées
- Application Android: v6.1.0 (versionCode 6100)

🔒 Sécurité:
- Système de permissions complet
- Validations pour éviter les conflits
- Logs détaillés pour débogage"

# Pousser le tag
echo "🚀 Push du tag vers GitHub..."
git push origin "$VERSION"

echo ""
echo "✅ Tag $VERSION créé et poussé avec succès!"
echo ""
echo "🤖 GitHub Actions va automatiquement:"
echo "   1. Compiler l'APK Android"
echo "   2. Créer une release GitHub"
echo "   3. Uploader l'APK dans la release"
echo ""
echo "📦 L'APK sera disponible à:"
echo "   https://github.com/VOTRE_REPO/releases/tag/$VERSION"
echo ""
echo "🔗 Surveillez le workflow:"
echo "   https://github.com/VOTRE_REPO/actions"
echo ""

# Créer la release sur GitHub avec gh CLI (si disponible)
if command -v gh &> /dev/null; then
    echo "📝 Création de la release GitHub..."
    gh release create "$VERSION" \
        --title "BagBot Manager $VERSION - Système de Tribunal" \
        --notes-file RELEASE_NOTES_v6.1.0.md \
        --latest
    
    echo "✅ Release créée sur GitHub!"
else
    echo "ℹ️ GitHub CLI (gh) non disponible."
    echo "   La release sera créée automatiquement par GitHub Actions."
fi

echo ""
echo "🎉 Processus de release lancé avec succès!"
