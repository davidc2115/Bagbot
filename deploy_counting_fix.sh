#!/bin/bash
# Script de déploiement des correctifs du système de comptage
# À exécuter sur la Freebox

set -e  # Arrêter en cas d'erreur

echo "🔧 Déploiement des correctifs du système de comptage - BagBot"
echo "=============================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Déterminer le répertoire du bot
BOT_DIR="${BOT_DIR:-/home/bagbot/BagBot}"

if [ ! -d "$BOT_DIR" ]; then
    log_error "Répertoire du bot non trouvé: $BOT_DIR"
    echo "Spécifiez le bon chemin: BOT_DIR=/path/to/bot ./deploy_counting_fix.sh"
    exit 1
fi

log_info "Répertoire du bot: $BOT_DIR"
cd "$BOT_DIR"

# 1. Créer une sauvegarde complète
log_info "Création de la sauvegarde..."
BACKUP_DIR="backups/before_counting_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/"
log_info "✅ Sauvegarde créée: $BACKUP_DIR"

# 2. Vérifier si le bot tourne
log_info "Vérification du statut du bot..."
BOT_PID=$(ps aux | grep "[n]ode.*src/bot.js" | awk '{print $2}' | head -1)

if [ -n "$BOT_PID" ]; then
    log_warn "Bot détecté (PID: $BOT_PID)"
    read -p "Voulez-vous arrêter le bot pour appliquer les correctifs ? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        log_info "Arrêt du bot..."
        kill -15 "$BOT_PID"
        sleep 3
        
        # Vérifier si le processus est toujours là
        if ps -p "$BOT_PID" > /dev/null 2>&1; then
            log_warn "Le bot ne s'est pas arrêté proprement, force kill..."
            kill -9 "$BOT_PID"
            sleep 1
        fi
        log_info "✅ Bot arrêté"
        RESTART_BOT=true
    else
        log_warn "⚠️ Le bot continuera de tourner. Les modifications prendront effet au prochain redémarrage."
        RESTART_BOT=false
    fi
else
    log_info "Le bot n'est pas en cours d'exécution"
    RESTART_BOT=false
fi

# 3. Appliquer les correctifs depuis le workspace local
log_info "Application des correctifs..."

# Copier les fichiers modifiés
if [ -f "/workspace/src/storage/jsonStore.js" ]; then
    cp /workspace/src/storage/jsonStore.js "$BOT_DIR/src/storage/jsonStore.js"
    log_info "✅ jsonStore.js mis à jour"
else
    log_error "Fichier source non trouvé: /workspace/src/storage/jsonStore.js"
    exit 1
fi

if [ -f "/workspace/src/bot.js" ]; then
    cp /workspace/src/bot.js "$BOT_DIR/src/bot.js"
    log_info "✅ bot.js mis à jour"
else
    log_error "Fichier source non trouvé: /workspace/src/bot.js"
    exit 1
fi

# 4. Vérifier la syntaxe
log_info "Vérification de la syntaxe..."
if command -v node &> /dev/null; then
    if node -c "$BOT_DIR/src/bot.js" && node -c "$BOT_DIR/src/storage/jsonStore.js"; then
        log_info "✅ Syntaxe validée"
    else
        log_error "Erreur de syntaxe détectée !"
        log_warn "Restauration de la sauvegarde..."
        cp -r "$BACKUP_DIR/src/"* "$BOT_DIR/src/"
        log_info "✅ Sauvegarde restaurée"
        exit 1
    fi
else
    log_warn "Node.js non trouvé, impossible de vérifier la syntaxe"
fi

# 5. Redémarrer le bot si nécessaire
if [ "$RESTART_BOT" = true ]; then
    log_info "Redémarrage du bot..."
    cd "$BOT_DIR"
    
    # Chercher un script de démarrage
    if [ -f "start.sh" ]; then
        nohup ./start.sh > /dev/null 2>&1 &
    elif [ -f "restart-bot-now.sh" ]; then
        nohup ./restart-bot-now.sh > /dev/null 2>&1 &
    else
        # Démarrage manuel
        nohup node src/bot.js > bot.log 2>&1 &
    fi
    
    sleep 3
    NEW_PID=$(ps aux | grep "[n]ode.*src/bot.js" | awk '{print $2}' | head -1)
    
    if [ -n "$NEW_PID" ]; then
        log_info "✅ Bot redémarré (PID: $NEW_PID)"
    else
        log_error "Échec du redémarrage du bot"
        log_warn "Vérifiez les logs: tail -f $BOT_DIR/bot.log"
        exit 1
    fi
fi

# 6. Afficher le résumé
echo ""
echo "=============================================================="
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo "=============================================================="
echo ""
echo "📦 Sauvegarde: $BACKUP_DIR"
echo ""
echo "📝 Modifications appliquées:"
echo "  • Support de channels multiples indépendants"
echo "  • Suppression automatique des messages invalides"
echo "  • Protection contre les pertes de données"
echo ""
echo "📖 Documentation complète:"
echo "  • $BOT_DIR/CORRECTIFS_COMPTAGE_03JAN2026.md"
echo "  • $BOT_DIR/ANALYSE_BUGS_COMPTAGE_03JAN2026.md"
echo ""
echo "🧪 Tests à effectuer:"
echo "  1. Configurer 2 channels de comptage"
echo "  2. Vérifier qu'ils comptent séparément"
echo "  3. Tester la suppression des messages invalides"
echo ""
echo "⚠️  En cas de problème, restaurez la sauvegarde:"
echo "    cp -r $BACKUP_DIR/src/* $BOT_DIR/src/"
echo "    # Puis redémarrez le bot"
echo ""
