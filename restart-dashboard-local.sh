#!/bin/bash

# 🔄 Script de Redémarrage du Dashboard - RÉSEAU LOCAL
# Usage: ./restart-dashboard-local.sh

set -e

# Configuration pour réseau local
FREEBOX_IP="192.168.1.15"
FREEBOX_PORT="22"
FREEBOX_USER="bagbot"
FREEBOX_PASSWORD="bagbot"
DASHBOARD_DIR="/home/bagbot/Bag-bot/dashboard-v2"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🔄 REDÉMARRAGE DASHBOARD (LOCAL)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Test connexion
log "Connexion à $FREEBOX_IP:$FREEBOX_PORT..."
if ! sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" "echo OK" &>/dev/null; then
    error "Connexion impossible à $FREEBOX_IP"
    echo ""
    warning "Vérifiez que :"
    echo "  1. Vous êtes sur le même réseau que la Freebox"
    echo "  2. L'IP $FREEBOX_IP est correcte"
    echo "  3. Le mot de passe 'bagbot' est correct"
    exit 1
fi
success "Connecté à la Freebox"

# Vérifier l'état actuel
log "Vérification de l'état du dashboard..."
echo ""
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'EOF'
echo "📊 État actuel du dashboard:"
echo "----------------------------"

# Processus Node.js
echo "🔍 Processus server-v2.js:"
ps aux | grep "[s]erver-v2.js" || echo "  Aucun processus trouvé"

echo ""
echo "🔍 Port 3002:"
netstat -tlnp 2>/dev/null | grep ":3002" || ss -tlnp 2>/dev/null | grep ":3002" || echo "  Port 3002 non utilisé"

echo ""
echo "🔍 PM2:"
if command -v pm2 &> /dev/null; then
    pm2 list 2>/dev/null | grep -i dashboard || echo "  Pas de dashboard dans PM2"
else
    echo "  PM2 non installé"
fi
echo ""
EOF

# Arrêter le dashboard
log "Arrêt du dashboard..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'EOF'
# Arrêter PM2 si présent
if command -v pm2 &> /dev/null; then
    pm2 stop dashboard-v2 2>/dev/null || true
    pm2 delete dashboard-v2 2>/dev/null || true
fi

# Tuer les processus sur le port 3002
PID=$(lsof -ti:3002 2>/dev/null || fuser 3002/tcp 2>/dev/null | awk '{print $1}')
if [ ! -z "$PID" ]; then
    echo "Arrêt du processus $PID sur le port 3002"
    kill -9 $PID 2>/dev/null || true
fi

# Tuer tous les processus server-v2
pkill -9 -f "server-v2.js" 2>/dev/null || true

sleep 2
echo "✅ Dashboard arrêté"
EOF
success "Dashboard arrêté"

# Démarrer le dashboard
echo ""
log "Démarrage du dashboard..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'EOF'
DASHBOARD_DIR="/home/bagbot/Bag-bot/dashboard-v2"

cd "$DASHBOARD_DIR" || { echo "❌ Répertoire $DASHBOARD_DIR introuvable"; exit 1; }

echo "📁 Répertoire: $(pwd)"

# Vérifier que server-v2.js existe
if [ ! -f "server-v2.js" ]; then
    echo "❌ Fichier server-v2.js introuvable !"
    ls -la *.js 2>/dev/null
    exit 1
fi

# Démarrer avec PM2 si disponible
if command -v pm2 &> /dev/null; then
    echo "🚀 Démarrage avec PM2..."
    pm2 start server-v2.js --name dashboard-v2 --time
    sleep 3
    
    echo ""
    pm2 list | grep dashboard
    
    echo ""
    echo "📋 Logs récents:"
    pm2 logs dashboard-v2 --lines 10 --nostream
else
    echo "🚀 Démarrage en arrière-plan..."
    nohup node server-v2.js > /tmp/dashboard-v2.log 2>&1 &
    DASHBOARD_PID=$!
    echo "Dashboard démarré (PID: $DASHBOARD_PID)"
    
    sleep 3
    
    if ps -p $DASHBOARD_PID > /dev/null; then
        echo "✅ Dashboard actif"
    else
        echo "❌ Le dashboard s'est arrêté"
        echo "Logs:"
        tail -20 /tmp/dashboard-v2.log
        exit 1
    fi
fi

# Vérifier le port
echo ""
echo "🌐 Vérification du port 3002..."
sleep 2
if netstat -tlnp 2>/dev/null | grep -q ":3002" || ss -tlnp 2>/dev/null | grep -q ":3002"; then
    echo "✅ Dashboard en écoute sur le port 3002"
else
    echo "⚠️  Le dashboard démarre peut-être encore..."
fi
EOF

success "Dashboard démarré"

echo ""
echo -e "${BLUE}========================================${NC}"
success "🎉 REDÉMARRAGE TERMINÉ !"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "📊 Dashboard accessible sur:"
echo "  • http://192.168.1.15:3002"
echo "  • http://82.67.65.98:3002 (si port forwarding actif)"
echo ""
echo "📋 Commandes utiles:"
echo "  • Voir les logs  : ssh bagbot@192.168.1.15 'pm2 logs dashboard-v2'"
echo "  • Statut PM2     : ssh bagbot@192.168.1.15 'pm2 status'"
echo "  • Arrêter        : ssh bagbot@192.168.1.15 'pm2 stop dashboard-v2'"
echo ""
