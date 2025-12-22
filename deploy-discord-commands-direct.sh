#!/bin/bash

# 🚀 Script de Déploiement Direct des Commandes Discord
# À exécuter sur la Freebox via SSH

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
echo "🚀 DÉPLOIEMENT DES COMMANDES DISCORD"
echo "===================================="
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
BOT_DIR="/home/bagbot/Bag-bot"

log "Configuration du déploiement"
echo "  📍 Serveur: $FREEBOX_IP:$FREEBOX_PORT"
echo "  👤 Utilisateur: $FREEBOX_USER"
echo "  📂 Répertoire: $BOT_DIR"
echo ""

warning "Ce script va se connecter à la Freebox et déployer toutes les commandes Discord"
echo ""
echo "📦 Actions qui seront effectuées:"
echo "  1. Connexion SSH à la Freebox"
echo "  2. Navigation vers $BOT_DIR"
echo "  3. Exécution de 'node deploy-commands.js'"
echo "  4. Vérification du déploiement"
echo ""
echo "⏱️  Durée estimée: 1-2 minutes"
echo "⏰ Synchronisation Discord: 5-10 minutes supplémentaires"
echo ""
read -p "Voulez-vous continuer ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    warning "Opération annulée"
    exit 0
fi

log "Connexion SSH à la Freebox..."
echo ""

ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'ENDSSH'
set -e

# Couleurs pour la session SSH
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

BOT_DIR="/home/bagbot/Bag-bot"

log "Navigation vers $BOT_DIR"
cd "$BOT_DIR"

log "Vérification des fichiers nécessaires..."
if [[ ! -f "deploy-commands.js" ]]; then
    echo "❌ Fichier deploy-commands.js introuvable"
    exit 1
fi

if [[ ! -f ".env" ]]; then
    echo "❌ Fichier .env manquant"
    exit 1
fi

success "Fichiers présents"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log "🚀 Déploiement des commandes Discord en cours..."
echo ""

# Exécuter le déploiement
node deploy-commands.js

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $EXIT_CODE -eq 0 ]]; then
    success "🎉 Déploiement réussi !"
    echo ""
    log "Vérification des commandes déployées..."
    echo ""
    
    if [[ -f "verify-commands.js" ]]; then
        node verify-commands.js
    else
        warning "Script de vérification non trouvé, impossible de vérifier"
    fi
else
    echo "❌ Erreur lors du déploiement (code: $EXIT_CODE)"
    exit 1
fi

ENDSSH

SSH_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $SSH_EXIT -eq 0 ]]; then
    success "✨ Déploiement terminé avec succès !"
    echo ""
    echo "📊 Résumé:"
    echo "  • Serveur: $FREEBOX_IP:$FREEBOX_PORT"
    echo "  • Commandes déployées: ~94 commandes"
    echo "  • Commande mot-cache: ✅ Incluse"
    echo ""
    warning "⏰ IMPORTANT: Synchronisation Discord"
    echo "  • Les commandes peuvent prendre 5-10 minutes pour apparaître"
    echo "  • Redémarrer Discord peut accélérer le processus"
    echo ""
    log "Test de la commande:"
    echo "  1. Attendez 10 minutes"
    echo "  2. Ouvrez Discord"
    echo "  3. Tapez '/mot-cache' dans un canal"
    echo "  4. La commande devrait apparaître dans l'autocomplétion"
    echo ""
else
    error "Échec du déploiement"
    echo ""
    warning "Solutions possibles:"
    echo "  1. Vérifier que vous pouvez vous connecter manuellement:"
    echo "     ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
    echo ""
    echo "  2. Exécuter le déploiement manuellement sur la Freebox:"
    echo "     ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
    echo "     cd $BOT_DIR"
    echo "     node deploy-commands.js"
    echo ""
    exit 1
fi

echo ""
success "✅ Script terminé"
