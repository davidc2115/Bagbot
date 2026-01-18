#!/bin/bash
# Script de déploiement SÉCURISÉ sur Freebox avec sauvegarde complète
# Exécute les modifications directement sur la Freebox sans toucher au reste

set -e

echo "🔐 Déploiement SÉCURISÉ sur Freebox - BagBot Comptage + Thread"
echo "================================================================"
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
FREEBOX_PASS="bagbot"
BOT_DIR="/home/bagbot/BagBot"  # Chemin par défaut

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

# Vérifier sshpass
if ! command -v sshpass &> /dev/null; then
    log_error "sshpass n'est pas installé"
    echo ""
    echo "Installation requise :"
    echo "  Ubuntu/Debian : sudo apt-get install sshpass"
    echo "  Mac : brew install hudochenkov/sshpass/sshpass"
    echo ""
    exit 1
fi

# Test de connexion
log_step "Test de connexion à la Freebox..."
if sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=10 $FREEBOX_USER@$FREEBOX_IP "echo 'OK'" &>/dev/null; then
    log_info "Connexion réussie"
else
    log_error "Impossible de se connecter à la Freebox"
    echo ""
    echo "Vérifiez :"
    echo "  • IP : $FREEBOX_IP"
    echo "  • Port : $FREEBOX_PORT"
    echo "  • User : $FREEBOX_USER"
    echo "  • Password : $FREEBOX_PASS"
    exit 1
fi

# Déterminer le chemin du bot
log_step "Recherche du répertoire du bot..."
DETECTED_PATH=$(sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "
    if [ -d '/home/bagbot/BagBot' ]; then
        echo '/home/bagbot/BagBot'
    elif [ -d '/home/bagbot/bagbot' ]; then
        echo '/home/bagbot/bagbot'
    elif [ -d '/var/bot' ]; then
        echo '/var/bot'
    else
        find /home -name 'bot.js' -path '*/src/bot.js' 2>/dev/null | head -1 | xargs dirname | xargs dirname
    fi
" 2>/dev/null | tr -d '\r')

if [ -n "$DETECTED_PATH" ]; then
    BOT_DIR="$DETECTED_PATH"
    log_info "Bot trouvé : $BOT_DIR"
else
    log_warn "Impossible de détecter automatiquement le chemin"
    read -p "Entrez le chemin complet du bot sur la Freebox : " BOT_DIR
fi

# Vérification finale du chemin
log_step "Vérification du répertoire..."
if ! sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "test -f '$BOT_DIR/src/bot.js' && test -f '$BOT_DIR/src/storage/jsonStore.js'"; then
    log_error "Fichiers du bot non trouvés dans $BOT_DIR"
    exit 1
fi
log_info "Répertoire validé"

# ÉTAPE 1 : SAUVEGARDE COMPLÈTE
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ÉTAPE 1/5 : Sauvegarde complète du bot"
echo "═══════════════════════════════════════════════════════════"
echo ""

log_step "Création de la sauvegarde sur la Freebox..."
BACKUP_NAME="backup_complete_$(date +%Y%m%d_%H%M%S)"

sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "
    cd '$BOT_DIR'
    mkdir -p backups
    mkdir -p 'backups/$BACKUP_NAME'
    
    # Sauvegarder le code source complet
    cp -r src 'backups/$BACKUP_NAME/'
    
    # Sauvegarder les données si elles existent
    if [ -f '/var/data/config.json' ]; then
        mkdir -p 'backups/$BACKUP_NAME/data'
        cp /var/data/config.json 'backups/$BACKUP_NAME/data/' 2>/dev/null || true
        cp /var/data/td_state.json 'backups/$BACKUP_NAME/data/' 2>/dev/null || true
    fi
    
    # Sauvegarder package.json et autres configs
    cp package.json 'backups/$BACKUP_NAME/' 2>/dev/null || true
    cp .env 'backups/$BACKUP_NAME/' 2>/dev/null || true
    
    echo 'Sauvegarde créée le $(date)' > 'backups/$BACKUP_NAME/README.txt'
    echo 'Backup avant déploiement des correctifs comptage + thread' >> 'backups/$BACKUP_NAME/README.txt'
    
    echo '$BACKUP_NAME'
"

log_info "✅ Sauvegarde complète créée : $BACKUP_NAME"

# ÉTAPE 2 : VÉRIFIER SI LE BOT TOURNE
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ÉTAPE 2/5 : Vérification du bot"
echo "═══════════════════════════════════════════════════════════"
echo ""

log_step "Vérification du statut du bot..."
BOT_PID=$(sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "ps aux | grep '[n]ode.*src/bot.js' | awk '{print \$2}' | head -1" 2>/dev/null | tr -d '\r')

RESTART_BOT=false
if [ -n "$BOT_PID" ]; then
    log_warn "Bot détecté (PID: $BOT_PID)"
    echo ""
    read -p "Arrêter le bot pour appliquer les correctifs ? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        log_step "Arrêt du bot..."
        sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "kill -15 $BOT_PID"
        sleep 3
        log_info "Bot arrêté"
        RESTART_BOT=true
    else
        log_warn "⚠️ Les modifications prendront effet au prochain redémarrage"
    fi
else
    log_info "Le bot n'est pas en cours d'exécution"
fi

# ÉTAPE 3 : TRANSFÉRER LES FICHIERS MODIFIÉS
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ÉTAPE 3/5 : Transfert des fichiers modifiés"
echo "═══════════════════════════════════════════════════════════"
echo ""

log_step "Transfert de bot.js..."
sshpass -p "$FREEBOX_PASS" scp -P $FREEBOX_PORT /workspace/src/bot.js $FREEBOX_USER@$FREEBOX_IP:$BOT_DIR/src/bot.js
log_info "bot.js transféré"

log_step "Transfert de jsonStore.js..."
sshpass -p "$FREEBOX_PASS" scp -P $FREEBOX_PORT /workspace/src/storage/jsonStore.js $FREEBOX_USER@$FREEBOX_IP:$BOT_DIR/src/storage/jsonStore.js
log_info "jsonStore.js transféré"

# ÉTAPE 4 : VÉRIFICATION DE LA SYNTAXE
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ÉTAPE 4/5 : Vérification de la syntaxe"
echo "═══════════════════════════════════════════════════════════"
echo ""

log_step "Vérification de la syntaxe JavaScript..."
SYNTAX_CHECK=$(sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "
    cd '$BOT_DIR'
    node -c src/bot.js && node -c src/storage/jsonStore.js && echo 'OK'
" 2>&1 | tail -1 | tr -d '\r')

if [ "$SYNTAX_CHECK" = "OK" ]; then
    log_info "✅ Syntaxe validée"
else
    log_error "Erreur de syntaxe détectée !"
    log_warn "Restauration de la sauvegarde..."
    sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "
        cd '$BOT_DIR'
        cp -r backups/$BACKUP_NAME/src/* src/
    "
    log_info "Sauvegarde restaurée"
    exit 1
fi

# ÉTAPE 5 : REDÉMARRAGE DU BOT
if [ "$RESTART_BOT" = true ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ÉTAPE 5/5 : Redémarrage du bot"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    log_step "Redémarrage du bot..."
    sshpass -p "$FREEBOX_PASS" ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "
        cd '$BOT_DIR'
        nohup node src/bot.js > bot.log 2>&1 &
        sleep 3
        ps aux | grep '[n]ode.*src/bot.js' | awk '{print \$2}' | head -1
    " > /tmp/new_pid.txt 2>/dev/null
    
    NEW_PID=$(cat /tmp/new_pid.txt | tr -d '\r')
    if [ -n "$NEW_PID" ]; then
        log_info "✅ Bot redémarré (PID: $NEW_PID)"
    else
        log_error "Échec du redémarrage"
        echo ""
        echo "Vérifiez les logs :"
        echo "  ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'tail -50 $BOT_DIR/bot.log'"
    fi
fi

# RÉSUMÉ
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📦 Sauvegarde : $BOT_DIR/backups/$BACKUP_NAME"
echo ""
echo "✨ Nouvelles fonctionnalités :"
echo "  • Thread automatique en cas d'erreur de comptage"
echo "  • Ping du fautif + dernier bon compteur"
echo "  • Invitation à donner un gage"
echo "  • Suppression auto des messages invalides"
echo "  • Channels multiples indépendants"
echo ""
echo "🧪 Tests à effectuer sur Discord :"
echo "  1. Comptez deux fois d'affilée → Thread créé ✓"
echo "  2. Comptez le mauvais numéro → Thread créé avec ping ✓"
echo "  3. Vérifiez que les channels comptent séparément ✓"
echo ""
echo "🔄 En cas de problème, restaurez :"
echo "  ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
echo "  cd $BOT_DIR"
echo "  cp -r backups/$BACKUP_NAME/src/* src/"
echo "  pkill -f 'node.*bot.js' && nohup node src/bot.js > bot.log 2>&1 &"
echo ""
