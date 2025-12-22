#!/bin/bash

# 🚀 Script de Déploiement des Commandes Discord sur Freebox
# Avec credentials automatiques

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
echo "     🚀 DÉPLOIEMENT COMMANDES DISCORD - FREEBOX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
FREEBOX_PASS="bagbot"
BOT_DIR="/home/bagbot/Bag-bot"

info "Configuration"
echo "  📍 Serveur: $FREEBOX_IP:$FREEBOX_PORT"
echo "  👤 Utilisateur: $FREEBOX_USER"
echo "  📂 Répertoire: $BOT_DIR"
echo ""

log "Connexion à la Freebox via SSH..."
echo ""

# Créer un script expect pour automatiser la connexion
cat > /tmp/deploy-ssh.exp << 'EXPECTEOF'
#!/usr/bin/expect -f

set timeout 120
set host [lindex $argv 0]
set port [lindex $argv 1]
set user [lindex $argv 2]
set pass [lindex $argv 3]
set botdir [lindex $argv 4]

spawn ssh -p $port -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$host

expect {
    "password:" {
        send "$pass\r"
        exp_continue
    }
    "$ " {
        send "cd $botdir\r"
    }
    timeout {
        puts "Timeout lors de la connexion"
        exit 1
    }
}

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo '     📊 ANALYSE PRÉ-DÉPLOIEMENT'\r"

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "echo '⚡ Répertoire actuel:'\r"

expect "$ "
send "pwd\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "echo '📦 Fichiers de commandes:'\r"

expect "$ "
send "ls -1 src/commands/*.js 2>/dev/null | wc -l\r"

expect "$ "
send "echo ' commandes dans le code source'\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo '     🚀 DÉPLOIEMENT'\r"

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "echo '⚡ Déploiement en cours...'\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "node deploy-commands.js\r"

expect {
    "✅ Toutes les commandes déployées en GLOBAL" {
        send "echo ''\r"
        exp_continue
    }
    "process.exit" {
        send "echo ''\r"
        exp_continue
    }
    "$ " {
        send "echo ''\r"
    }
    timeout {
        puts "Timeout lors du déploiement"
        exit 1
    }
}

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo '     ✅ VÉRIFICATION POST-DÉPLOIEMENT'\r"

expect "$ "
send "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "if \[ -f verify-commands.js \]; then node verify-commands.js; else echo '⚠️  Script de vérification non trouvé'; fi\r"

expect "$ "
send "echo ''\r"

expect "$ "
send "exit\r"

expect eof
EXPECTEOF

chmod +x /tmp/deploy-ssh.exp

# Exécuter le script expect
if /tmp/deploy-ssh.exp "$FREEBOX_IP" "$FREEBOX_PORT" "$FREEBOX_USER" "$FREEBOX_PASS" "$BOT_DIR"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    success "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "     ⏰ SYNCHRONISATION DISCORD"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    warning "Les commandes peuvent prendre 5-10 minutes pour apparaître sur Discord"
    echo ""
    info "📝 Pour tester:"
    echo "  1. Attendez 10 minutes"
    echo "  2. Redémarrez Discord (Ctrl+R ou relancer l'app)"
    echo "  3. Tapez /mot-cache dans un canal"
    echo "  4. Tapez /daily dans un MP avec le bot"
    echo "  5. Les commandes devraient apparaître ✅"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "     📊 CORRECTIONS APPLIQUÉES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    success "14 commandes ont été corrigées:"
    echo ""
    echo "  ✅ Serveur uniquement (dmPermission: false):"
    echo "     • /config"
    echo ""
    echo "  ✅ Serveur + MP (dmPermission: true):"
    echo "     • /confess, /crime, /daily, /danser, /flirter"
    echo "     • /localisation, /niveau, /pecher, /proche, /rose"
    echo "     • /seduire, /solde, /travailler"
    echo ""
else
    echo ""
    error "Échec du déploiement"
    echo ""
    warning "Vous pouvez essayer manuellement:"
    echo "  ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
    echo "  cd $BOT_DIR"
    echo "  node deploy-commands.js"
    echo ""
    exit 1
fi

# Nettoyer
rm -f /tmp/deploy-ssh.exp

echo ""
success "✅ Script terminé"
echo ""
