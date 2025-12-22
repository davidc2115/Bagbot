#!/bin/bash

# 🔍 Script de Vérification des Commandes Discord Manquantes
# À exécuter pour identifier et déployer les commandes manquantes

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

echo ""
echo "🔍 VÉRIFICATION DES COMMANDES DISCORD"
echo "====================================="
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
BOT_DIR="/home/bagbot/Bag-bot"

log "Configuration"
echo "  📍 Serveur: $FREEBOX_IP:$FREEBOX_PORT"
echo "  👤 Utilisateur: $FREEBOX_USER"
echo "  📂 Répertoire: $BOT_DIR"
echo ""

log "Connexion à la Freebox pour analyser les commandes..."
echo ""

# Connexion SSH et exécution du script d'analyse
ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'ENDSSH'
set -e

# Couleurs pour SSH
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

BOT_DIR="/home/bagbot/Bag-bot"
cd "$BOT_DIR"

log "Répertoire: $BOT_DIR"

# Compter les commandes dans le code source
log "Analyse des fichiers de commandes..."
COMMANDS_IN_CODE=$(ls -1 src/commands/*.js 2>/dev/null | grep -v backup | grep -v disabled | grep -v ".old" | grep -v ".broken" | wc -l)
success "Commandes dans le code: $COMMANDS_IN_CODE fichiers"

echo ""
log "Vérification des commandes déployées sur Discord..."
echo ""

# Créer un script Node.js temporaire pour vérifier les commandes
cat > /tmp/check-commands.js << 'ENDNODE'
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;

(async () => {
  try {
    // Récupérer les commandes déployées
    const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    // Récupérer les commandes dans le code
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath)
      .filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('.old') && !f.includes('.disabled') && !f.includes('.broken'));
    
    const codeCommands = [];
    for (const file of commandFiles) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.data && cmd.data.name) {
          codeCommands.push(cmd.data.name);
        }
      } catch (err) {
        // Ignorer les erreurs de chargement
      }
    }
    
    const deployedNames = globalCommands.map(c => c.name);
    const missingCommands = codeCommands.filter(name => !deployedNames.includes(name));
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 RÉSULTAT DE L\'ANALYSE\n');
    console.log(`✅ Commandes déployées sur Discord: ${globalCommands.length}`);
    console.log(`📦 Commandes dans le code source: ${codeCommands.length}`);
    console.log(`❌ Commandes manquantes: ${missingCommands.length}\n`);
    
    if (missingCommands.length > 0) {
      console.log('🔴 COMMANDES MANQUANTES:');
      console.log('━'.repeat(60));
      missingCommands.sort().forEach((cmd, i) => {
        console.log(`  ${i + 1}. /${cmd}`);
      });
      console.log('');
      
      // Vérifier spécifiquement mot-cache
      if (missingCommands.includes('mot-cache')) {
        console.log('⚠️  LA COMMANDE /mot-cache EST MANQUANTE !');
        console.log('');
      }
    } else {
      console.log('✅ TOUTES LES COMMANDES SONT DÉPLOYÉES !');
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (missingCommands.length > 0) {
      console.log('💡 SOLUTION: Déployer toutes les commandes\n');
      console.log('  Commande: node deploy-commands.js');
      console.log('  Durée: ~2 minutes');
      console.log('  Synchronisation Discord: ~10 minutes supplémentaires');
      console.log('');
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
ENDNODE

# Exécuter le script de vérification
node /tmp/check-commands.js
CHECK_EXIT=$?

# Nettoyer
rm -f /tmp/check-commands.js

if [[ $CHECK_EXIT -ne 0 ]]; then
    echo ""
    warning "⚠️  Des commandes sont manquantes !"
    echo ""
    read -p "Voulez-vous déployer TOUTES les commandes maintenant ? (o/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        echo ""
        log "🚀 Déploiement de toutes les commandes..."
        echo ""
        
        node deploy-commands.js
        
        if [[ $? -eq 0 ]]; then
            echo ""
            success "🎉 Déploiement réussi !"
            echo ""
            warning "⏰ Synchronisation Discord: attendez 10 minutes"
            echo ""
            info "Vérification après déploiement..."
            echo ""
            sleep 2
            node /tmp/check-commands.js 2>/dev/null || true
        else
            error "Échec du déploiement"
            exit 1
        fi
    else
        warning "Déploiement annulé"
        echo ""
        info "Pour déployer manuellement:"
        echo "  ssh -p 33000 bagbot@88.174.155.230"
        echo "  cd /home/bagbot/Bag-bot"
        echo "  node deploy-commands.js"
    fi
else
    success "Toutes les commandes sont déjà déployées !"
fi

ENDSSH

SSH_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $SSH_EXIT -eq 0 ]]; then
    success "✅ Vérification terminée"
    echo ""
else
    error "Problème détecté lors de la vérification"
    echo ""
    info "Vous pouvez aussi vérifier manuellement:"
    echo "  ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
    echo "  cd $BOT_DIR"
    echo "  node verify-commands.js"
    echo ""
fi

echo "🔗 Liens utiles:"
echo "  • Actions GitHub: https://github.com/mel805/Bagbot/actions"
echo "  • Release v5.9.10: https://github.com/mel805/Bagbot/releases/tag/v5.9.10"
echo ""
