#!/bin/bash

# 🚀 SCRIPT DE DÉPLOIEMENT RAPIDE
# Déploie automatiquement les commandes Discord manquantes

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}⚡${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

clear
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "          🚀 DÉPLOIEMENT RAPIDE - v5.9.10"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"

echo "📍 Cible: $FREEBOX_IP:$FREEBOX_PORT"
echo ""

log "Connexion à la Freebox..."
echo ""

ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'ENDSSH'
set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}⚡${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

cd /home/bagbot/Bag-bot

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "          📊 ANALYSE DES COMMANDES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log "Comptage des fichiers de commandes..."
TOTAL_FILES=$(ls -1 src/commands/*.js 2>/dev/null | grep -v backup | grep -v disabled | grep -v ".old" | grep -v ".broken" | wc -l)
echo "  📦 Fichiers de commandes: $TOTAL_FILES"
echo ""

log "Vérification des commandes déployées..."
echo ""

# Script de vérification rapide
node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;

(async () => {
  try {
    const global = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log('  🌐 Commandes déployées: ' + global.length);
    console.log('  ❌ Commandes manquantes: ' + ($TOTAL_FILES - global.length));
    console.log('');
    
    // Chercher mot-cache
    const motCache = global.find(c => c.name === 'mot-cache');
    if (motCache) {
      console.log('  ✅ /mot-cache est déployée');
    } else {
      console.log('  ❌ /mot-cache est MANQUANTE');
    }
  } catch (e) {
    console.error('Erreur:', e.message);
  }
})();
" 2>&1 || echo "  ⚠️  Impossible de vérifier (erreur API)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "          🚀 DÉPLOIEMENT EN COURS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log "Déploiement de TOUTES les commandes..."
echo ""

node deploy-commands.js

DEPLOY_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $DEPLOY_EXIT -eq 0 ]]; then
    echo ""
    success "🎉 DÉPLOIEMENT RÉUSSI !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "          ✅ VÉRIFICATION POST-DÉPLOIEMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    log "Vérification des commandes déployées..."
    echo ""
    
    if [[ -f "verify-commands.js" ]]; then
        node verify-commands.js
    else
        warning "Script de vérification non trouvé"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "          ⏰ SYNCHRONISATION DISCORD"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    warning "Les commandes peuvent prendre 5-10 minutes pour apparaître"
    echo ""
    echo "📝 Pour tester:"
    echo "  1. Attendez 10 minutes"
    echo "  2. Redémarrez Discord (Ctrl+R ou relancer l'app)"
    echo "  3. Tapez /mot-cache dans un canal"
    echo "  4. La commande devrait apparaître dans l'autocomplétion"
    echo ""
else
    error "Échec du déploiement (code: $DEPLOY_EXIT)"
    exit 1
fi

ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
success "✅ Script terminé !"
echo ""
echo "🔗 Liens utiles:"
echo "  • GitHub Actions: https://github.com/mel805/Bagbot/actions"
echo "  • Release v5.9.10: https://github.com/mel805/Bagbot/releases/tag/v5.9.10"
echo ""
