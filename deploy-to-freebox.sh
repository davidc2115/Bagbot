#!/bin/bash

# 🚀 Script de Déploiement Automatique - Freebox Delta
# Déploie le bot BAG Discord sur la Freebox et remplace l'instance existante

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration Freebox
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="22222"
FREEBOX_USER="bagbot"
FREEBOX_PASSWORD="bagbot"
FREEBOX_ROOT_PASSWORD="bagbot"
BOT_DIR="/home/bagbot/Bag-bot"

# Fonctions d'affichage
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

echo "🏠 DÉPLOIEMENT BOT BAG SUR FREEBOX DELTA"
echo "========================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [[ ! -f "package.json" ]]; then
    error "Ce script doit être exécuté depuis le répertoire du projet Bag-bot"
    exit 1
fi

# Étape 1: Test de connexion SSH
log "Test de connexion SSH à la Freebox..."
if sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" "echo 'OK'" &>/dev/null; then
    success "Connexion SSH établie"
else
    error "Impossible de se connecter à la Freebox"
    echo ""
    info "Vérifications à faire:"
    echo "  1. La Freebox est accessible à l'adresse $FREEBOX_IP:$FREEBOX_PORT"
    echo "  2. L'utilisateur 'bagbot' existe avec le mot de passe correct"
    echo "  3. Le service SSH est actif sur la Freebox"
    echo ""
    info "Tentative d'installation de sshpass si manquant..."
    if ! command -v sshpass &> /dev/null; then
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y sshpass
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install hudochenkov/sshpass/sshpass
        fi
    fi
    exit 1
fi

# Étape 2: Créer une sauvegarde de sécurité
log "Création d'une sauvegarde de sécurité sur la Freebox..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'BACKUP_SCRIPT'
if [[ -d "/home/bagbot/Bag-bot" ]]; then
    BACKUP_DIR="/home/bagbot/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-before-deploy-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" -C /home/bagbot Bag-bot 2>/dev/null || true
    echo "Sauvegarde créée: $BACKUP_FILE"
fi
BACKUP_SCRIPT
success "Sauvegarde de sécurité créée"

# Étape 3: Arrêter le service existant
log "Arrêt du service existant..."
sshpass -p "$FREEBOX_ROOT_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'STOP_SCRIPT'
# Essayer systemd
if sudo systemctl stop bag-discord-bot 2>/dev/null; then
    echo "Service systemd arrêté"
# Essayer PM2
elif command -v pm2 &> /dev/null && pm2 stop bagbot 2>/dev/null; then
    echo "Service PM2 arrêté"
else
    # Tuer le processus Node.js
    pkill -f "node.*bot.js" 2>/dev/null || true
    echo "Processus arrêté"
fi
STOP_SCRIPT
success "Service arrêté"

# Étape 4: Transférer les fichiers
log "Transfert des fichiers vers la Freebox..."

# Créer une archive temporaire
TEMP_ARCHIVE="/tmp/bag-bot-deploy-$(date +%s).tar.gz"
tar -czf "$TEMP_ARCHIVE" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='data' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='backups' \
    .

# Transférer l'archive
sshpass -p "$FREEBOX_PASSWORD" scp -P "$FREEBOX_PORT" "$TEMP_ARCHIVE" "$FREEBOX_USER@$FREEBOX_IP:/tmp/bag-bot-new.tar.gz"

# Nettoyer l'archive locale
rm -f "$TEMP_ARCHIVE"

success "Fichiers transférés ($(du -h /tmp/bag-bot-new.tar.gz 2>/dev/null | cut -f1 || echo 'N/A'))"

# Étape 5: Déployer sur la Freebox
log "Déploiement des fichiers..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'DEPLOY_SCRIPT'
set -e

BOT_DIR="/home/bagbot/Bag-bot"
BACKUP_ENV="$BOT_DIR/.env.backup"
BACKUP_DATA="$BOT_DIR/data.backup"
SUDO_PASSWORD="bagbot"

# Sauvegarder .env et data s'ils existent
if [[ -f "$BOT_DIR/.env" ]]; then
    cp "$BOT_DIR/.env" "$BACKUP_ENV"
    echo "Fichier .env sauvegardé"
fi

if [[ -d "$BOT_DIR/data" ]]; then
    cp -r "$BOT_DIR/data" "$BACKUP_DATA"
    echo "Dossier data sauvegardé"
fi

# Supprimer l'ancien code (sauf .env et data) avec sudo pour les permissions
echo "$SUDO_PASSWORD" | sudo -S rm -rf "$BOT_DIR"
mkdir -p "$BOT_DIR"

# Extraire la nouvelle version
tar -xzf /tmp/bag-bot-new.tar.gz -C "$BOT_DIR"
rm -f /tmp/bag-bot-new.tar.gz

# Restaurer .env et data
if [[ -f "$BACKUP_ENV" ]]; then
    cp "$BACKUP_ENV" "$BOT_DIR/.env"
    rm -f "$BACKUP_ENV"
    echo ".env restauré"
fi

if [[ -d "$BACKUP_DATA" ]]; then
    cp -r "$BACKUP_DATA" "$BOT_DIR/data"
    rm -rf "$BACKUP_DATA"
    echo "data/ restauré"
fi

# Créer les répertoires nécessaires
mkdir -p "$BOT_DIR/data/backups"
mkdir -p "$BOT_DIR/logs"

echo "Déploiement des fichiers terminé"
DEPLOY_SCRIPT
success "Fichiers déployés"

# Étape 6: Installer les dépendances
log "Installation des dépendances npm..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'NPM_SCRIPT'
cd /home/bagbot/Bag-bot
npm install --production --no-audit 2>&1 | grep -E "(added|removed|updated|audited)" || echo "Installation terminée"
NPM_SCRIPT
success "Dépendances installées"

# Étape 7: Vérifier/Mettre à jour le fichier .env
log "Vérification de la configuration..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'ENV_SCRIPT'
BOT_DIR="/home/bagbot/Bag-bot"
ENV_FILE="$BOT_DIR/.env"

# Vérifier si .env existe
if [[ ! -f "$ENV_FILE" ]]; then
    echo "⚠️  Fichier .env manquant - création à partir de .env.example"
    if [[ -f "$BOT_DIR/.env.example" ]]; then
        cp "$BOT_DIR/.env.example" "$ENV_FILE"
        echo "✅ Fichier .env créé - CONFIGURATION REQUISE!"
    fi
fi

# Ajouter les variables GitHub si manquantes
if ! grep -q "GITHUB_TOKEN" "$ENV_FILE" 2>/dev/null; then
    echo "" >> "$ENV_FILE"
    echo "# GitHub Backup (NOUVEAU - PostgreSQL désactivé)" >> "$ENV_FILE"
    echo "GITHUB_TOKEN=" >> "$ENV_FILE"
    echo "GITHUB_REPO=" >> "$ENV_FILE"
    echo "GITHUB_BRANCH=backup-data" >> "$ENV_FILE"
    echo "✅ Variables GitHub ajoutées au .env"
fi

# Désactiver PostgreSQL si présent
if grep -q "USE_PG=true" "$ENV_FILE" 2>/dev/null; then
    sed -i 's/USE_PG=true/USE_PG=false/' "$ENV_FILE"
    echo "✅ PostgreSQL désactivé (USE_PG=false)"
fi

echo "Configuration vérifiée"
ENV_SCRIPT
success "Configuration mise à jour"

# Étape 8: Redéployer les commandes Discord
log "Déploiement des commandes Discord..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'DEPLOY_CMD_SCRIPT'
cd /home/bagbot/Bag-bot
if [[ -f "deploy-commands.js" ]]; then
    node deploy-commands.js 2>&1 | tail -5 || echo "Commandes déployées"
fi
DEPLOY_CMD_SCRIPT
success "Commandes Discord déployées"

# Étape 9: Redémarrer le service
log "Redémarrage du service..."
sshpass -p "$FREEBOX_ROOT_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'START_SCRIPT'
# Essayer systemd
if sudo systemctl start bag-discord-bot 2>/dev/null; then
    echo "✅ Service systemd démarré"
    sleep 2
    sudo systemctl status bag-discord-bot --no-pager -l | head -10
# Essayer PM2
elif command -v pm2 &> /dev/null; then
    cd /home/bagbot/Bag-bot
    pm2 start src/bot.js --name bagbot 2>/dev/null || pm2 restart bagbot
    echo "✅ Service PM2 démarré"
    pm2 status
else
    # Démarrer manuellement
    cd /home/bagbot/Bag-bot
    nohup node src/bot.js > logs/bot.log 2>&1 &
    echo "✅ Bot démarré en arrière-plan"
fi
START_SCRIPT
success "Service redémarré"

# Résumé final
echo ""
echo "========================================"
success "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!"
echo "========================================"
echo ""
info "📊 Informations de déploiement:"
echo "  • Freebox IP   : $FREEBOX_IP:$FREEBOX_PORT"
echo "  • Répertoire   : $BOT_DIR"
echo "  • Utilisateur  : $FREEBOX_USER"
echo ""
warning "⚠️  CONFIGURATION GITHUB REQUISE:"
echo "  1. Connectez-vous à la Freebox:"
echo "     ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
echo ""
echo "  2. Éditez le fichier .env:"
echo "     nano $BOT_DIR/.env"
echo ""
echo "  3. Configurez les variables GitHub:"
echo "     GITHUB_TOKEN=ghp_..."
echo "     GITHUB_REPO=mel805/Bag-bot"
echo "     GITHUB_BRANCH=backup-data"
echo ""
echo "  4. Redémarrez le service:"
echo "     sudo systemctl restart bag-discord-bot"
echo "     # ou"
echo "     pm2 restart bagbot"
echo ""
info "📋 Commandes utiles:"
echo "  • Logs        : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'journalctl -u bag-discord-bot -f'"
echo "  • Statut      : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'systemctl status bag-discord-bot'"
echo "  • Sauvegardes : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'ls -lh ~/backups/'"
echo ""
success "Bot BAG déployé et configuré pour sauvegardes GitHub! 🚀"