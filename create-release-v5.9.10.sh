#!/bin/bash

# 🚀 Script de Création de Release v5.9.10
# Ce script crée un tag Git et le pousse pour déclencher le workflow GitHub Actions

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo "🚀 CRÉATION DE LA RELEASE v5.9.10"
echo "=================================="
echo ""

VERSION="v5.9.10"
COMMIT_MESSAGE="Release v5.9.10 - Fixes URL placeholder & JsonObject error

✅ Correction du placeholder URL (33002 → 33003)
✅ Fix de l'erreur JsonObject dans la configuration Mot-Caché
✅ Nouvelle fonction strOrId() pour gérer les deux formats API
✅ Mise à jour de la version (5.9.9 → 5.9.10)

Fichiers modifiés:
- android-app/app/src/main/java/com/bagbot/manager/App.kt
- android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt
- android-app/app/build.gradle.kts
- .github/workflows/build-android.yml"

log "Vérification du statut Git..."
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Ce répertoire n'est pas un dépôt Git"
    exit 1
fi

success "Dépôt Git détecté"

log "Vérification des modifications non commitées..."
if [[ -n $(git status -s) ]]; then
    warning "Des modifications non commitées ont été détectées"
    echo ""
    git status -s
    echo ""
    read -p "Voulez-vous commiter ces changements ? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        log "Ajout de tous les fichiers modifiés..."
        git add -A
        
        log "Création du commit..."
        git commit -m "$COMMIT_MESSAGE"
        success "Commit créé"
    else
        warning "Changements non commités - ils ne seront pas inclus dans la release"
    fi
else
    success "Aucune modification non commitée"
fi

log "Vérification si le tag $VERSION existe déjà..."
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    error "Le tag $VERSION existe déjà !"
    echo ""
    warning "Pour supprimer le tag existant et en créer un nouveau:"
    echo "  git tag -d $VERSION"
    echo "  git push origin :refs/tags/$VERSION"
    echo "  bash $0"
    exit 1
fi

success "Le tag $VERSION n'existe pas encore"

log "Création du tag annotated $VERSION..."
git tag -a "$VERSION" -m "Release $VERSION

✨ CORRECTIONS MAJEURES v5.9.10 - Stabilité & Fixes !

🚨 Fixes Critiques:
- ✅ URL Placeholder Corrigé: Port 33003 au lieu de 33002
- ✅ Erreur JsonObject Résolue: Fix complet de l'erreur Kotlin reflection
- ✅ Configuration Mot-Caché: Fonctionne sans crash
- ✅ Canaux de Notification: Gestion robuste des formats API

🔧 Améliorations Techniques:
- Nouvelle fonction strOrId() pour la compatibilité API
- Support des réponses en chaîne simple ou objet JSON
- Stabilité accrue dans toute l'application

📋 Fichiers Modifiés:
- App.kt (ligne 3636)
- ConfigDashboardScreen.kt (lignes 271-275, 3483-3484)
- build.gradle.kts (version 5.9.9 → 5.9.10)

📦 Compilation:
- versionCode: 5910
- versionName: 5.9.10
- Target SDK: 34 (Android 14)
- Min SDK: 26 (Android 8.0)
"

success "Tag $VERSION créé"

echo ""
log "Récupération de l'URL du dépôt distant..."
REMOTE_URL=$(git config --get remote.origin.url)
if [[ -z "$REMOTE_URL" ]]; then
    error "Aucun remote 'origin' configuré"
    exit 1
fi

success "Remote: $REMOTE_URL"

echo ""
warning "⚠️  IMPORTANT: Cette opération va pousser vers GitHub et déclencher le workflow"
echo ""
echo "📦 Le workflow GitHub Actions va:"
echo "  1. Compiler l'APK Android (version 5.9.10)"
echo "  2. Créer une release GitHub avec l'APK"
echo "  3. Rendre l'APK téléchargeable publiquement"
echo ""
echo "⏱️  Durée estimée: 5-10 minutes"
echo ""
read -p "Voulez-vous continuer et pousser le tag ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    warning "Opération annulée"
    echo ""
    log "Pour pousser le tag manuellement plus tard:"
    echo "  git push origin $VERSION"
    exit 0
fi

log "Push du tag vers GitHub..."
if git push origin "$VERSION"; then
    echo ""
    success "🎉 Tag $VERSION poussé avec succès !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    success "✨ Le workflow GitHub Actions a été déclenché !"
    echo ""
    echo "📊 Suivi du workflow:"
    
    # Extraire le nom du dépôt
    if [[ $REMOTE_URL =~ github\.com[:/](.+)/(.+)(\.git)?$ ]]; then
        OWNER="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]%.git}"
        
        echo "  🔗 Actions: https://github.com/$OWNER/$REPO/actions"
        echo "  🔗 Releases: https://github.com/$OWNER/$REPO/releases"
        echo ""
        echo "🎯 Dans quelques minutes, la release sera disponible à:"
        echo "  🔗 https://github.com/$OWNER/$REPO/releases/tag/$VERSION"
    else
        echo "  🔗 Consultez les actions GitHub de votre dépôt"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log "Étapes suivantes:"
    echo "  1. ⏳ Attendre ~5-10 minutes que le workflow se termine"
    echo "  2. 🔍 Vérifier la release sur GitHub"
    echo "  3. 📥 Télécharger l'APK depuis la page de release"
    echo "  4. 📲 Distribuer l'APK aux utilisateurs"
    echo ""
else
    error "Échec du push du tag"
    echo ""
    warning "Vérifiez vos permissions GitHub et réessayez"
    exit 1
fi
