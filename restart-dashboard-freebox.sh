#!/bin/bash

# 🔄 Script de Redémarrage du Dashboard V2 - Freebox
# Usage: ./restart-dashboard-freebox.sh

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FREEBOX_IP="82.67.65.98"
FREEBOX_PORT="40000"
FREEBOX_USER="bagbot"
FREEBOX_PASSWORD="bagbot"
DASHBOARD_PORT="3002"
DASHBOARD_DIR="/home/bagbot/Bag-bot/dashboard-v2"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🔄 REDÉMARRAGE DASHBOARD FREEBOX${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Fonction pour afficher les logs
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Test de connexion SSH
log "Test de connexion SSH à la Freebox..."
if sshpass -p "$FREEBOX_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" "echo 'OK'" &>/dev/null; then
    success "Connexion SSH établie"
else
    error "Impossible de se connecter à la Freebox"
    echo ""
    warning "Vérifications à faire:"
    echo "  1. Êtes-vous sur le même réseau que la Freebox ?"
    echo "  2. L'IP est correcte : $FREEBOX_IP"
    echo "  3. Le port SSH est correct : $FREEBOX_PORT"
    echo "  4. Le mot de passe est correct : $FREEBOX_PASSWORD"
    echo ""
    warning "Si vous êtes sur le réseau local, essayez avec l'IP locale:"
    echo "  FREEBOX_IP='192.168.1.15' ./restart-dashboard-freebox.sh"
    exit 1
fi

# Vérifier l'état actuel du dashboard
log "Vérification de l'état du dashboard..."
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'CHECK_SCRIPT'
echo "📊 Processus Node.js en cours:"
ps aux | grep -i "node.*server-v2" | grep -v grep || echo "  Aucun processus dashboard trouvé"

echo ""
echo "📊 Processus PM2 en cours:"
if command -v pm2 &> /dev/null; then
    pm2 list 2>/dev/null || echo "  PM2 non démarré"
else
    echo "  PM2 non installé"
fi

echo ""
echo "📊 Ports en écoute:"
netstat -tlnp 2>/dev/null | grep ":3002" || ss -tlnp 2>/dev/null | grep ":3002" || echo "  Port 3002 non en écoute"
CHECK_SCRIPT

echo ""
log "Arrêt du dashboard..."

# Arrêter le dashboard (plusieurs méthodes)
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'STOP_SCRIPT'
set -e

echo "Tentative d'arrêt avec PM2..."
if command -v pm2 &> /dev/null; then
    pm2 stop dashboard-v2 2>/dev/null && echo "✅ Dashboard PM2 arrêté" || echo "ℹ️  Pas de dashboard PM2 actif"
    pm2 delete dashboard-v2 2>/dev/null || true
fi

echo ""
echo "Tentative d'arrêt des processus Node.js sur port 3002..."
# Trouver et tuer les processus sur le port 3002
PID=$(lsof -ti:3002 2>/dev/null || fuser 3002/tcp 2>/dev/null | awk '{print $1}' || echo "")
if [ ! -z "$PID" ]; then
    kill -9 $PID 2>/dev/null && echo "✅ Processus $PID arrêté" || echo "⚠️  Impossible d'arrêter le processus $PID"
else
    echo "ℹ️  Aucun processus sur le port 3002"
fi

echo ""
echo "Tentative d'arrêt de tous les processus server-v2.js..."
pkill -f "node.*server-v2" 2>/dev/null && echo "✅ Processus server-v2 arrêtés" || echo "ℹ️  Aucun processus server-v2"

sleep 2
STOP_SCRIPT

success "Dashboard arrêté"

echo ""
log "Démarrage du dashboard..."

# Démarrer le dashboard
sshpass -p "$FREEBOX_PASSWORD" ssh -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << 'START_SCRIPT'
set -e

DASHBOARD_DIR="/home/bagbot/Bag-bot/dashboard-v2"

cd "$DASHBOARD_DIR" || { echo "❌ Répertoire $DASHBOARD_DIR introuvable"; exit 1; }

echo "📁 Répertoire actuel: $(pwd)"
echo "📝 Fichiers disponibles:"
ls -la server-v2.js 2>/dev/null || echo "  ⚠️  server-v2.js introuvable!"

# Vérifier si PM2 est installé
if command -v pm2 &> /dev/null; then
    echo ""
    echo "🚀 Démarrage avec PM2..."
    pm2 start server-v2.js --name dashboard-v2 --time 2>/dev/null || pm2 restart dashboard-v2 2>/dev/null
    
    sleep 3
    
    echo ""
    echo "📊 Statut PM2:"
    pm2 list
    
    echo ""
    echo "📋 Logs récents:"
    pm2 logs dashboard-v2 --lines 15 --nostream
else
    echo ""
    echo "🚀 Démarrage en arrière-plan (PM2 non disponible)..."
    nohup node server-v2.js > /tmp/dashboard-v2.log 2>&1 &
    DASHBOARD_PID=$!
    
    echo "✅ Dashboard démarré avec PID: $DASHBOARD_PID"
    
    sleep 3
    
    # Vérifier si le processus tourne toujours
    if ps -p $DASHBOARD_PID > /dev/null; then
        echo "✅ Dashboard actif"
    else
        echo "❌ Le dashboard s'est arrêté, voici les logs:"
        tail -20 /tmp/dashboard-v2.log
        exit 1
    fi
fi

echo ""
echo "🌐 Vérification du port 3002..."
sleep 2
if netstat -tlnp 2>/dev/null | grep -q ":3002" || ss -tlnp 2>/dev/null | grep -q ":3002"; then
    echo "✅ Dashboard en écoute sur le port 3002"
else
    echo "⚠️  Port 3002 non détecté, le dashboard met peut-être du temps à démarrer..."
fi
START_SCRIPT

success "Dashboard redémarré"

echo ""
echo -e "${BLUE}========================================${NC}"
success "🎉 REDÉMARRAGE TERMINÉ AVEC SUCCÈS!"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "📊 Informations:"
echo "  • Dashboard URL : http://$FREEBOX_IP:$DASHBOARD_PORT"
echo "  • Répertoire    : $DASHBOARD_DIR"
echo ""
echo "📋 Commandes utiles:"
echo "  • Voir les logs PM2    : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 logs dashboard-v2'"
echo "  • Statut PM2           : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 status'"
echo "  • Arrêter le dashboard : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 stop dashboard-v2'"
echo "  • Redémarrer           : ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 restart dashboard-v2'"
echo ""
success "Dashboard accessible sur: http://$FREEBOX_IP:$DASHBOARD_PORT"
