#!/bin/bash
# Script de transfert des fichiers corrigés vers la Freebox
# À exécuter depuis VOTRE MACHINE LOCALE (pas la Freebox)

echo "📦 Transfert des correctifs vers la Freebox"
echo "==========================================="
echo ""

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
FREEBOX_PATH="/home/bagbot/BagBot"  # ⚠️ AJUSTEZ ce chemin si nécessaire

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Vérification de la connexion
echo "🔍 Test de connexion à la Freebox..."
if ssh -p $FREEBOX_PORT -o ConnectTimeout=5 -o StrictHostKeyChecking=no $FREEBOX_USER@$FREEBOX_IP "echo 'OK'" &>/dev/null; then
    log_info "Connexion SSH réussie"
else
    log_error "Impossible de se connecter à la Freebox"
    echo ""
    echo "Vérifiez :"
    echo "  • IP : $FREEBOX_IP"
    echo "  • Port : $FREEBOX_PORT"
    echo "  • User : $FREEBOX_USER"
    echo "  • Mot de passe : bagbot"
    echo ""
    exit 1
fi

# Vérification du chemin distant
echo ""
echo "🔍 Vérification du répertoire distant..."
if ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "test -d $FREEBOX_PATH" &>/dev/null; then
    log_info "Répertoire trouvé : $FREEBOX_PATH"
else
    log_error "Répertoire non trouvé : $FREEBOX_PATH"
    echo ""
    read -p "Entrez le chemin correct du bot sur la Freebox : " NEW_PATH
    FREEBOX_PATH="$NEW_PATH"
    
    if ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP "test -d $FREEBOX_PATH"; then
        log_info "Répertoire trouvé : $FREEBOX_PATH"
    else
        log_error "Le répertoire $FREEBOX_PATH n'existe toujours pas"
        exit 1
    fi
fi

# Transfert des fichiers
echo ""
echo "📤 Transfert des fichiers..."

FILES=(
    "src/bot.js:$FREEBOX_PATH/src/bot.js"
    "src/storage/jsonStore.js:$FREEBOX_PATH/src/storage/jsonStore.js"
    "deploy_counting_fix.sh:$FREEBOX_PATH/deploy_counting_fix.sh"
    "CORRECTIFS_COMPTAGE_03JAN2026.md:$FREEBOX_PATH/CORRECTIFS_COMPTAGE_03JAN2026.md"
    "ANALYSE_BUGS_COMPTAGE_03JAN2026.md:$FREEBOX_PATH/ANALYSE_BUGS_COMPTAGE_03JAN2026.md"
    "GUIDE_DEPLOIEMENT_FREEBOX.md:$FREEBOX_PATH/GUIDE_DEPLOIEMENT_FREEBOX.md"
)

SUCCESS=0
FAILED=0

for FILE_PAIR in "${FILES[@]}"; do
    SRC="${FILE_PAIR%%:*}"
    DEST="${FILE_PAIR##*:}"
    
    if [ ! -f "$SRC" ]; then
        log_warn "Fichier non trouvé localement : $SRC (ignoré)"
        continue
    fi
    
    echo -n "  • $(basename $SRC)... "
    
    if scp -P $FREEBOX_PORT -q "$SRC" "$FREEBOX_USER@$FREEBOX_IP:$DEST" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
done

echo ""
echo "==========================================="
if [ $FAILED -eq 0 ]; then
    log_info "Transfert terminé : $SUCCESS fichier(s) transféré(s)"
else
    log_warn "Transfert partiel : $SUCCESS OK, $FAILED échec(s)"
fi
echo ""

# Instructions suivantes
if [ $FAILED -eq 0 ]; then
    echo "✅ Prochaine étape : Exécuter le script de déploiement sur la Freebox"
    echo ""
    echo "Connectez-vous à la Freebox :"
    echo "  ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP"
    echo ""
    echo "Puis exécutez :"
    echo "  cd $FREEBOX_PATH"
    echo "  chmod +x deploy_counting_fix.sh"
    echo "  ./deploy_counting_fix.sh"
    echo ""
    
    # Proposer de se connecter directement
    read -p "Voulez-vous vous connecter maintenant à la Freebox ? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        echo ""
        echo "🔗 Connexion à la Freebox..."
        ssh -p $FREEBOX_PORT -t $FREEBOX_USER@$FREEBOX_IP "cd $FREEBOX_PATH && bash"
    fi
else
    log_error "Certains fichiers n'ont pas été transférés"
    echo "Réessayez ou effectuez le transfert manuellement."
fi
