#!/bin/bash
set -e

echo "🏷️  Création du tag v6.1.1..."
git tag -a v6.1.1 -m "Release v6.1.1 - Correctifs Android (Inactivité, Gestion Accès, Splash)"

echo "🚀 Push du tag..."
git push origin v6.1.1

echo "✅ Tag v6.1.1 créé et poussé!"
echo "🔄 GitHub Actions va maintenant construire l'APK..."
echo "📦 APK disponible dans ~10 minutes dans les artifacts"
echo ""
echo "🔗 Workflow: https://github.com/mel805/Bagbot/actions"
