#!/bin/bash

# 📊 Script de Surveillance de la Compilation GitHub Actions

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}⚡${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⏳${NC} $1"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

clear
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "          📊 SURVEILLANCE DE LA COMPILATION"
echo "          GitHub Actions - BagBot Manager v5.9.10"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REPO="mel805/Bagbot"
RELEASE_TAG="v5.9.10"

info "Dépôt: $REPO"
info "Tag: $RELEASE_TAG"
echo ""

log "Vérification du workflow..."
echo ""

# Boucle de surveillance
CHECKS=0
MAX_CHECKS=30  # 30 checks * 20 secondes = 10 minutes max

while [[ $CHECKS -lt $MAX_CHECKS ]]; do
    CHECKS=$((CHECKS + 1))
    
    # Récupérer le statut du dernier workflow
    WORKFLOW_STATUS=$(gh run list --repo "$REPO" --limit 1 --json status,conclusion,name,displayTitle,workflowName 2>&1)
    
    if [[ $? -eq 0 ]]; then
        STATUS=$(echo "$WORKFLOW_STATUS" | jq -r '.[0].status' 2>/dev/null)
        CONCLUSION=$(echo "$WORKFLOW_STATUS" | jq -r '.[0].conclusion' 2>/dev/null)
        WORKFLOW_NAME=$(echo "$WORKFLOW_STATUS" | jq -r '.[0].workflowName' 2>/dev/null)
        DISPLAY_TITLE=$(echo "$WORKFLOW_STATUS" | jq -r '.[0].displayTitle' 2>/dev/null)
        
        echo -ne "\r\033[K"  # Effacer la ligne
        
        if [[ "$STATUS" == "in_progress" ]] || [[ "$STATUS" == "queued" ]]; then
            warning "En cours... ($CHECKS/$MAX_CHECKS) - $WORKFLOW_NAME"
            sleep 20
        elif [[ "$STATUS" == "completed" ]]; then
            echo ""
            if [[ "$CONCLUSION" == "success" ]]; then
                success "🎉 COMPILATION RÉUSSIE !"
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                success "La release v5.9.10 a été créée avec succès !"
                echo ""
                echo "🔗 Lien de la release:"
                echo "   https://github.com/$REPO/releases/tag/$RELEASE_TAG"
                echo ""
                echo "📥 Téléchargement direct de l'APK:"
                echo "   https://github.com/$REPO/releases/download/$RELEASE_TAG/BagBot-Manager-$RELEASE_TAG.apk"
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                exit 0
            else
                error "La compilation a échoué"
                echo ""
                echo "Conclusion: $CONCLUSION"
                echo ""
                echo "🔗 Voir les logs:"
                echo "   https://github.com/$REPO/actions"
                echo ""
                exit 1
            fi
        else
            warning "Statut inconnu: $STATUS"
            sleep 20
        fi
    else
        warning "Impossible de récupérer le statut (tentative $CHECKS/$MAX_CHECKS)"
        sleep 20
    fi
done

echo ""
warning "⏰ Temps d'attente maximal atteint (10 minutes)"
echo ""
info "Le workflow peut toujours être en cours. Vérifiez manuellement:"
echo "  https://github.com/$REPO/actions"
echo ""
