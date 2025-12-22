#!/bin/bash

# 🚀 SCRIPT DE DÉPLOIEMENT COMPLET DES COMMANDES DISCORD
# Ce script déploie TOUTES les 93 commandes sur Discord

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}⚡${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

clear
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "     🚀 DÉPLOIEMENT COMPLET DES COMMANDES DISCORD"
echo "          93 commandes à déployer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HOST="88.174.155.230"
PORT="33000"
USER="bagbot"

info "Configuration"
echo "  📍 Serveur: $HOST:$PORT"
echo "  👤 Utilisateur: $USER"
echo "  📂 Répertoire: /home/bagbot/Bag-bot"
echo ""

warning "⚠️  Ce script va déployer TOUTES les 93 commandes Discord"
echo ""
echo "Commandes incluses:"
echo "  • Économie: /solde, /daily, /crime, /travailler, /pecher, etc."
echo "  • Niveaux: /niveau, /topniveaux, etc."
echo "  • Jeux: /mot-cache, /uno, /actionverite, etc."
echo "  • Modération: /ban, /kick, /warn, /mute, etc."
echo "  • Actions sociales: /calin, /embrasser, /caresser, etc."
echo "  • Administration: /config, /backup, /restore, etc."
echo "  • Et 75+ autres commandes..."
echo ""
read -p "Voulez-vous continuer ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    warning "Opération annulée"
    exit 0
fi

echo ""
log "Connexion SSH à la Freebox..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -p "$PORT" "$USER@$HOST" << 'ENDSSH'
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
echo "     📊 ANALYSE PRÉ-DÉPLOIEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log "Comptage des fichiers de commandes..."
CMD_COUNT=$(ls -1 src/commands/*.js 2>/dev/null | grep -v backup | grep -v disabled | grep -v ".old" | grep -v ".broken" | wc -l)
success "Fichiers de commandes dans le code: $CMD_COUNT"

echo ""
log "Vérification des commandes actuellement déployées..."
echo ""

# Vérifier les commandes déployées
node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;
(async () => {
  try {
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log('  📊 Commandes actuellement déployées: ' + commands.length);
    
    // Vérifier les commandes spécifiques
    const testCmds = ['mot-cache', 'solde', 'niveau', 'daily', 'crime', 'config'];
    console.log('\n  🔍 Vérification rapide:');
    testCmds.forEach(name => {
      const found = commands.find(c => c.name === name);
      if (found) {
        console.log('    ✅ /' + name);
      } else {
        console.log('    ❌ /' + name + ' - MANQUANTE');
      }
    });
  } catch(e) {
    console.error('  ❌ Erreur:', e.message);
  }
})();
" 2>&1 | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "     🚀 DÉPLOIEMENT EN COURS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log "Déploiement de TOUTES les commandes..."
echo ""

# Déployer les commandes
node deploy-commands.js

DEPLOY_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $DEPLOY_EXIT -eq 0 ]]; then
    echo ""
    success "🎉 DÉPLOIEMENT RÉUSSI !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "     ✅ VÉRIFICATION POST-DÉPLOIEMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    log "Vérification des commandes déployées..."
    echo ""
    
    node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;
(async () => {
  try {
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log('  ✅ Commandes déployées: ' + commands.length);
    console.log('');
    
    // Afficher quelques exemples
    console.log('  📋 Exemples de commandes déployées:');
    commands.slice(0, 20).forEach((c, i) => {
      console.log('    ' + (i+1) + '. /' + c.name);
    });
    
    if (commands.length > 20) {
      console.log('    ... et ' + (commands.length - 20) + ' autres');
    }
    
    console.log('');
    console.log('  🔍 Vérification des commandes spécifiques:');
    const testCmds = ['mot-cache', 'solde', 'niveau', 'daily', 'crime', 'travailler', 'config'];
    let allFound = true;
    testCmds.forEach(name => {
      const found = commands.find(c => c.name === name);
      if (found) {
        console.log('    ✅ /' + name + ' - Déployée');
      } else {
        console.log('    ❌ /' + name + ' - MANQUANTE');
        allFound = false;
      }
    });
    
    console.log('');
    if (allFound) {
      console.log('  🎉 Toutes les commandes testées sont déployées !');
    } else {
      console.log('  ⚠️  Certaines commandes sont encore manquantes');
    }
  } catch(e) {
    console.error('  ❌ Erreur:', e.message);
  }
})();
" 2>&1
    
    echo ""
else
    error "Échec du déploiement (code: $DEPLOY_EXIT)"
    exit 1
fi

ENDSSH

SSH_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $SSH_EXIT -eq 0 ]]; then
    success "✨ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "     ⏰ SYNCHRONISATION DISCORD"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    warning "Les commandes peuvent prendre 5-10 minutes pour apparaître sur Discord"
    echo ""
    info "📝 Pour tester:"
    echo ""
    echo "  1. Attendez 10 minutes"
    echo "  2. Redémarrez Discord (Ctrl+R ou relancer l'app)"
    echo "  3. Testez quelques commandes:"
    echo ""
    echo "     Sur le serveur:"
    echo "       • /mot-cache"
    echo "       • /config"
    echo "       • /ban"
    echo ""
    echo "     En MP avec le bot:"
    echo "       • /solde"
    echo "       • /daily"
    echo "       • /niveau"
    echo "       • /crime"
    echo "       • /travailler"
    echo ""
else
    error "Échec du déploiement"
    echo ""
    warning "Vous pouvez essayer manuellement:"
    echo "  ssh -p $PORT $USER@$HOST"
    echo "  cd /home/bagbot/Bag-bot"
    echo "  node deploy-commands.js"
    echo ""
    exit 1
fi

echo ""
success "✅ Script terminé !"
echo ""
