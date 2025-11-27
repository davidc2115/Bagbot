#!/bin/bash

# Script de déploiement des modifications Dashboard
# À exécuter depuis une machine ayant accès SSH à la Freebox

set -e

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="22222"
FREEBOX_USER="bagbot"
FREEBOX_PASSWORD="bagbot"
REMOTE_DIR="/home/bagbot/Bag-bot"
LOCAL_DIR="/workspace"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DÉPLOIEMENT MODIFICATIONS DASHBOARD FREEBOX          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si sshpass est installé
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}❌ sshpass n'est pas installé${NC}"
    echo -e "${YELLOW}   Installation: sudo apt-get install sshpass${NC}"
    exit 1
fi

echo -e "${YELLOW}📡 Test de connexion à la Freebox...${NC}"
if sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" "echo 'OK'" &> /dev/null; then
    echo -e "${GREEN}✅ Connexion SSH réussie${NC}"
else
    echo -e "${RED}❌ Impossible de se connecter à la Freebox${NC}"
    echo -e "${YELLOW}   Vérifiez l'IP, le port et les credentials${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📦 ÉTAPE 1: Création des sauvegardes sur la Freebox${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << EOF
    cd $REMOTE_DIR
    
    echo "Creating backups with timestamp: $BACKUP_DATE"
    
    # Sauvegardes Bot
    cp src/commands/dashboard.js src/commands/dashboard.js.backup_$BACKUP_DATE
    cp src/utils/discord_gif_downloader.js src/utils/discord_gif_downloader.js.backup_$BACKUP_DATE
    
    # Sauvegardes Dashboard
    cp dashboard-v2/server-v2.js dashboard-v2/server-v2.js.backup_$BACKUP_DATE
    cp dashboard-v2/index.html dashboard-v2/index.html.backup_$BACKUP_DATE
    cp dashboard-v2/auto_download_discord_gifs.js dashboard-v2/auto_download_discord_gifs.js.backup_$BACKUP_DATE
    
    # Sauvegardes Config
    cp deploy-to-freebox.sh deploy-to-freebox.sh.backup_$BACKUP_DATE 2>/dev/null || true
    cp docs/README.md docs/README.md.backup_$BACKUP_DATE 2>/dev/null || true
    cp dashboard-v2/list-cached-gifs.js dashboard-v2/list-cached-gifs.js.backup_$BACKUP_DATE 2>/dev/null || true
    
    echo "✅ Sauvegardes créées"
    ls -lh src/commands/dashboard.js.backup_$BACKUP_DATE
EOF

echo -e "${GREEN}✅ Sauvegardes créées sur la Freebox${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📤 ÉTAPE 2: Transfert des fichiers modifiés${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Fonction pour transférer un fichier
transfer_file() {
    local local_file=$1
    local remote_file=$2
    
    echo -e "${YELLOW}   Transfert: $local_file${NC}"
    
    if [ -f "$local_file" ]; then
        sshpass -p "$FREEBOX_PASSWORD" scp -o StrictHostKeyChecking=no -P "$FREEBOX_PORT" \
            "$local_file" "$FREEBOX_USER@$FREEBOX_IP:$remote_file"
        echo -e "${GREEN}   ✅ OK${NC}"
    else
        echo -e "${RED}   ❌ Fichier non trouvé: $local_file${NC}"
    fi
}

# Transfert des fichiers Bot
transfer_file "$LOCAL_DIR/src/commands/dashboard.js" "$REMOTE_DIR/src/commands/dashboard.js"
transfer_file "$LOCAL_DIR/src/utils/discord_gif_downloader.js" "$REMOTE_DIR/src/utils/discord_gif_downloader.js"

# Transfert des fichiers Dashboard
transfer_file "$LOCAL_DIR/dashboard-v2/server-v2.js" "$REMOTE_DIR/dashboard-v2/server-v2.js"
transfer_file "$LOCAL_DIR/dashboard-v2/index.html" "$REMOTE_DIR/dashboard-v2/index.html"
transfer_file "$LOCAL_DIR/dashboard-v2/auto_download_discord_gifs.js" "$REMOTE_DIR/dashboard-v2/auto_download_discord_gifs.js"

# Transfert des fichiers Config
transfer_file "$LOCAL_DIR/deploy-to-freebox.sh" "$REMOTE_DIR/deploy-to-freebox.sh"
transfer_file "$LOCAL_DIR/docs/README.md" "$REMOTE_DIR/docs/README.md"
transfer_file "$LOCAL_DIR/dashboard-v2/list-cached-gifs.js" "$REMOTE_DIR/dashboard-v2/list-cached-gifs.js"

echo -e "${GREEN}✅ Tous les fichiers ont été transférés${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🔄 ÉTAPE 3: Redémarrage des services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'EOF'
    cd /home/bagbot/Bag-bot
    
    echo "Arrêt des services..."
    pm2 stop bag-bot dashboard 2>/dev/null || true
    
    echo "Démarrage des services..."
    pm2 restart bag-bot dashboard
    
    sleep 2
    
    echo ""
    echo "État des services:"
    pm2 status
    
    echo ""
    echo "Logs récents du bot:"
    pm2 logs bag-bot --lines 10 --nostream
EOF

echo ""
echo -e "${GREEN}✅ Services redémarrés${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Modifications appliquées avec succès!${NC}"
echo ""
echo -e "${YELLOW}🔍 Prochaines étapes:${NC}"
echo "   1. Testez la commande /dashboard sur Discord"
echo "   2. Vérifiez que le lien pointe vers: http://88.174.155.230:3002"
echo "   3. Accédez au dashboard via votre navigateur"
echo ""
echo -e "${YELLOW}💾 Sauvegardes créées:${NC}"
echo "   Les sauvegardes ont le suffixe: .backup_$BACKUP_DATE"
echo ""
echo -e "${YELLOW}🔙 Pour restaurer (si nécessaire):${NC}"
echo "   ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
echo "   cd $REMOTE_DIR"
echo "   ./restore_backup_$BACKUP_DATE.sh"
echo ""
