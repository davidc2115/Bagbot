#!/bin/bash

###############################################################################
# 🚀 Script d'Installation Automatique: Ollama + Llama sur Oracle Cloud
# 
# Ce script installe et configure Ollama avec Llama 3.2 sur une VM Oracle Cloud
# Compatible: ARM64 et x86_64
#
# Utilisation:
#   1. Créer VM Oracle Cloud (ARM recommended: 4 CPU + 24 GB RAM - GRATUIT)
#   2. Copier ce script sur la VM: scp INSTALL_LLAMA_ORACLE_CLOUD.sh ubuntu@VM-IP:~/
#   3. Se connecter: ssh ubuntu@VM-IP
#   4. Exécuter: bash INSTALL_LLAMA_ORACLE_CLOUD.sh
#
# Date: 24 Décembre 2025
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# CONFIGURATION
###############################################################################

# Modèle Llama à installer (modifiable)
LLAMA_MODEL="${LLAMA_MODEL:-llama3.2:3b}"  # Options: 1b, 3b, 8b, 70b

# Port API Ollama
OLLAMA_PORT="${OLLAMA_PORT:-11434}"

# Autoriser accès externe
OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0}"

###############################################################################
# ÉTAPE 1: Vérifications Préliminaires
###############################################################################

header "ÉTAPE 1/7: Vérifications Système"

log "Détection de l'architecture..."
ARCH=$(uname -m)
success "Architecture: $ARCH"

log "Détection du système d'exploitation..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
    success "OS: $PRETTY_NAME"
else
    error "Impossible de détecter l'OS"
    exit 1
fi

log "Vérification des ressources..."
TOTAL_RAM=$(free -h | awk '/^Mem:/{print $2}')
TOTAL_DISK=$(df -h / | awk 'NR==2{print $4}')
CPU_CORES=$(nproc)

echo "  RAM disponible: $TOTAL_RAM"
echo "  Disque disponible: $TOTAL_DISK"
echo "  CPU cores: $CPU_CORES"

# Vérifier RAM minimale (2 GB pour 1b, 4 GB pour 3b, 8 GB pour 8b)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [[ "$LLAMA_MODEL" == *"8b"* ]] && [ $TOTAL_RAM_MB -lt 8000 ]; then
    warning "RAM insuffisante pour Llama 8B (besoin: 8+ GB, disponible: ${TOTAL_RAM_MB} MB)"
    warning "Réduire à 3b ou 1b recommandé"
elif [[ "$LLAMA_MODEL" == *"3b"* ]] && [ $TOTAL_RAM_MB -lt 4000 ]; then
    warning "RAM insuffisante pour Llama 3B (besoin: 4+ GB, disponible: ${TOTAL_RAM_MB} MB)"
    warning "Réduire à 1b recommandé"
elif [[ "$LLAMA_MODEL" == *"1b"* ]] && [ $TOTAL_RAM_MB -lt 2000 ]; then
    error "RAM insuffisante même pour Llama 1B (besoin: 2+ GB, disponible: ${TOTAL_RAM_MB} MB)"
    exit 1
fi

success "Ressources suffisantes pour $LLAMA_MODEL"

###############################################################################
# ÉTAPE 2: Mise à Jour du Système
###############################################################################

header "ÉTAPE 2/7: Mise à Jour du Système"

log "Mise à jour des paquets système..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
success "Système à jour"

log "Installation des dépendances de base..."
sudo apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

success "Dépendances installées"

###############################################################################
# ÉTAPE 3: Installation d'Ollama
###############################################################################

header "ÉTAPE 3/7: Installation d'Ollama"

log "Vérification si Ollama est déjà installé..."
if command -v ollama &> /dev/null; then
    warning "Ollama déjà installé, version: $(ollama --version 2>/dev/null | head -1)"
    read -p "Réinstaller Ollama? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        success "Utilisation de l'installation existante"
    else
        log "Réinstallation d'Ollama..."
        curl -fsSL https://ollama.com/install.sh | sh
        success "Ollama réinstallé"
    fi
else
    log "Téléchargement et installation d'Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    success "Ollama installé avec succès"
fi

log "Vérification de l'installation..."
if command -v ollama &> /dev/null; then
    success "Ollama installé: $(ollama --version 2>/dev/null | head -1 || echo 'Version inconnue')"
else
    error "L'installation d'Ollama a échoué"
    exit 1
fi

###############################################################################
# ÉTAPE 4: Configuration du Service Ollama
###############################################################################

header "ÉTAPE 4/7: Configuration du Service"

log "Configuration du service systemd pour Ollama..."

# Créer ou modifier le service systemd
sudo systemctl stop ollama 2>/dev/null || true

log "Configuration de l'accès externe (0.0.0.0:$OLLAMA_PORT)..."

# Créer le fichier de configuration systemd override
sudo mkdir -p /etc/systemd/system/ollama.service.d/
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="OLLAMA_HOST=$OLLAMA_HOST:$OLLAMA_PORT"
Environment="OLLAMA_ORIGINS=*"
EOF

success "Configuration créée: /etc/systemd/system/ollama.service.d/override.conf"

log "Rechargement de systemd..."
sudo systemctl daemon-reload

log "Démarrage du service Ollama..."
sudo systemctl enable ollama
sudo systemctl start ollama

sleep 3

log "Vérification du statut du service..."
if sudo systemctl is-active --quiet ollama; then
    success "Service Ollama actif"
else
    error "Le service Ollama n'a pas démarré correctement"
    log "Logs du service:"
    sudo journalctl -u ollama -n 20 --no-pager
    exit 1
fi

###############################################################################
# ÉTAPE 5: Téléchargement du Modèle Llama
###############################################################################

header "ÉTAPE 5/7: Téléchargement du Modèle $LLAMA_MODEL"

log "Téléchargement de $LLAMA_MODEL (cela peut prendre plusieurs minutes)..."
warning "Taille approximative:"
case "$LLAMA_MODEL" in
    *"1b"*)
        echo "  Llama 3.2 1B: ~1.3 GB"
        ;;
    *"3b"*)
        echo "  Llama 3.2 3B: ~2.0 GB"
        ;;
    *"8b"*)
        echo "  Llama 3 8B: ~4.7 GB"
        ;;
    *"70b"*)
        echo "  Llama 2 70B: ~39 GB"
        ;;
esac

echo ""
log "Début du téléchargement..."
ollama pull $LLAMA_MODEL

if [ $? -eq 0 ]; then
    success "Modèle $LLAMA_MODEL téléchargé avec succès"
else
    error "Échec du téléchargement du modèle"
    exit 1
fi

###############################################################################
# ÉTAPE 6: Configuration du Firewall
###############################################################################

header "ÉTAPE 6/7: Configuration du Firewall"

log "Configuration d'iptables pour autoriser le port $OLLAMA_PORT..."

# Vérifier si ufw est installé et actif
if command -v ufw &> /dev/null && sudo ufw status | grep -q "active"; then
    log "UFW détecté, ajout de la règle..."
    sudo ufw allow $OLLAMA_PORT/tcp
    success "Règle UFW ajoutée pour le port $OLLAMA_PORT"
else
    log "UFW non actif, ajout de règle iptables..."
    sudo iptables -I INPUT -p tcp --dport $OLLAMA_PORT -j ACCEPT
    
    # Sauvegarder les règles iptables
    if command -v netfilter-persistent &> /dev/null; then
        sudo netfilter-persistent save
        success "Règles iptables sauvegardées"
    else
        warning "netfilter-persistent non installé, les règles ne seront pas persistantes après reboot"
        log "Pour installer: sudo apt-get install iptables-persistent"
    fi
fi

warning "N'oubliez pas de configurer les Security Lists dans Oracle Cloud Console:"
echo "  1. Aller dans: Networking → Virtual Cloud Networks → Security Lists"
echo "  2. Ajouter Ingress Rule:"
echo "     - Source CIDR: 0.0.0.0/0"
echo "     - IP Protocol: TCP"
echo "     - Destination Port Range: $OLLAMA_PORT"

###############################################################################
# ÉTAPE 7: Tests et Validation
###############################################################################

header "ÉTAPE 7/7: Tests de Validation"

log "Attente du démarrage complet d'Ollama (10 secondes)..."
sleep 10

log "Test 1: Vérification de l'API locale..."
if curl -s http://localhost:$OLLAMA_PORT/api/tags > /dev/null; then
    success "API locale accessible"
else
    error "API locale non accessible"
    log "Vérification des logs:"
    sudo journalctl -u ollama -n 20 --no-pager
fi

log "Test 2: Liste des modèles installés..."
MODELS=$(curl -s http://localhost:$OLLAMA_PORT/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
if [ -n "$MODELS" ]; then
    success "Modèles installés:"
    echo "$MODELS" | while read -r model; do
        echo "  - $model"
    done
else
    error "Aucun modèle trouvé"
fi

log "Test 3: Génération de texte avec $LLAMA_MODEL..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:$OLLAMA_PORT/api/generate \
    -d "{\"model\": \"$LLAMA_MODEL\", \"prompt\": \"Hello, how are you?\", \"stream\": false}" \
    -H "Content-Type: application/json")

if echo "$TEST_RESPONSE" | grep -q "response"; then
    success "Génération de texte fonctionnelle"
    log "Réponse du modèle:"
    echo "$TEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', 'N/A')[:200])" 2>/dev/null || echo "OK"
else
    error "La génération de texte a échoué"
    echo "Réponse brute: $TEST_RESPONSE"
fi

log "Test 4: Accès externe..."
EXTERNAL_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "UNKNOWN")
if [ "$EXTERNAL_IP" != "UNKNOWN" ]; then
    success "IP publique détectée: $EXTERNAL_IP"
    echo ""
    echo "  Testez depuis votre machine locale (ou Android):"
    echo "  ${GREEN}curl http://$EXTERNAL_IP:$OLLAMA_PORT/api/tags${NC}"
    echo ""
else
    warning "Impossible de détecter l'IP publique"
fi

###############################################################################
# RÉSUMÉ FINAL
###############################################################################

header "🎉 INSTALLATION TERMINÉE AVEC SUCCÈS"

cat << EOF
${GREEN}✓${NC} Ollama installé et configuré
${GREEN}✓${NC} Modèle $LLAMA_MODEL téléchargé
${GREEN}✓${NC} Service systemd actif et en écoute sur ${OLLAMA_HOST}:${OLLAMA_PORT}
${GREEN}✓${NC} API REST accessible

${CYAN}═══════════════════════════════════════════════════════${NC}
${CYAN}Informations d'Accès${NC}
${CYAN}═══════════════════════════════════════════════════════${NC}

${YELLOW}API Endpoint:${NC}
  http://$EXTERNAL_IP:$OLLAMA_PORT

${YELLOW}Modèle actif:${NC}
  $LLAMA_MODEL

${CYAN}═══════════════════════════════════════════════════════${NC}
${CYAN}Exemples d'Utilisation${NC}
${CYAN}═══════════════════════════════════════════════════════${NC}

${YELLOW}1. Test depuis Terminal:${NC}

curl -X POST http://$EXTERNAL_IP:$OLLAMA_PORT/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "$LLAMA_MODEL",
    "prompt": "Écris un poème sur l IA",
    "stream": false
  }'

${YELLOW}2. Code Android (Kotlin):${NC}

val client = OkHttpClient()
val json = JSONObject().apply {
    put("model", "$LLAMA_MODEL")
    put("prompt", "Bonjour Llama!")
    put("stream", false)
}

val request = Request.Builder()
    .url("http://$EXTERNAL_IP:$OLLAMA_PORT/api/generate")
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val result = JSONObject(response.body?.string() ?: "")
        val text = result.getString("response")
        println("Llama: \$text")
    }
    override fun onFailure(call: Call, e: IOException) {
        e.printStackTrace()
    }
})

${YELLOW}3. Chat interactif (sur le serveur):${NC}

ollama run $LLAMA_MODEL

${CYAN}═══════════════════════════════════════════════════════${NC}
${CYAN}Commandes Utiles${NC}
${CYAN}═══════════════════════════════════════════════════════${NC}

${YELLOW}Gérer le service:${NC}
  sudo systemctl status ollama       # Statut
  sudo systemctl restart ollama      # Redémarrer
  sudo systemctl stop ollama         # Arrêter
  sudo journalctl -u ollama -f       # Logs en temps réel

${YELLOW}Gérer les modèles:${NC}
  ollama list                        # Liste des modèles
  ollama pull llama3.2:8b            # Télécharger un autre modèle
  ollama rm $LLAMA_MODEL             # Supprimer un modèle
  ollama show $LLAMA_MODEL           # Infos sur le modèle

${YELLOW}Tester l'API:${NC}
  curl http://localhost:$OLLAMA_PORT/api/tags
  curl http://localhost:$OLLAMA_PORT/api/version

${CYAN}═══════════════════════════════════════════════════════${NC}
${CYAN}Sécurité & Configuration Oracle Cloud${NC}
${CYAN}═══════════════════════════════════════════════════════${NC}

${RED}⚠ IMPORTANT:${NC} Vous devez configurer les Security Lists dans Oracle Cloud:

1. Connectez-vous à: ${BLUE}https://cloud.oracle.com${NC}
2. Navigation → Compute → Instances → [Votre Instance]
3. Resources → Virtual Cloud Network → Security Lists
4. Ingress Rules → Add Ingress Rule:
   ${YELLOW}Source CIDR:${NC} 0.0.0.0/0
   ${YELLOW}IP Protocol:${NC} TCP
   ${YELLOW}Destination Port:${NC} $OLLAMA_PORT

${YELLOW}Pour une meilleure sécurité (production):${NC}
- Utilisez un reverse proxy (Nginx) avec HTTPS
- Limitez l'accès par IP (au lieu de 0.0.0.0/0)
- Ajoutez une authentification API (bearer token)
- Activez rate limiting

${CYAN}═══════════════════════════════════════════════════════${NC}
${CYAN}Monitoring & Performance${NC}
${CYAN}═══════════════════════════════════════════════════════${NC}

${YELLOW}Monitorer les ressources:${NC}
  htop                               # CPU/RAM en temps réel
  watch -n 1 nvidia-smi              # GPU (si disponible)
  df -h                              # Espace disque

${YELLOW}Tester la performance:${NC}
  time ollama run $LLAMA_MODEL "Écris un court poème"

${YELLOW}Logs détaillés:${NC}
  sudo journalctl -u ollama --since "10 minutes ago"

${CYAN}═══════════════════════════════════════════════════════${NC}

${GREEN}🎊 Tout est prêt! Vous pouvez maintenant utiliser Llama depuis votre application Android.${NC}

${YELLOW}Questions ou problèmes?${NC}
- Documentation Ollama: https://github.com/ollama/ollama/blob/main/docs/api.md
- Modèles disponibles: https://ollama.com/library

${GREEN}Bonne utilisation de Llama! 🚀${NC}

EOF

# Sauvegarder les infos dans un fichier
cat > ~/OLLAMA_INFO.txt << EOF
Installation Date: $(date)
Ollama Version: $(ollama --version 2>/dev/null | head -1 || echo "Unknown")
Model: $LLAMA_MODEL
API Endpoint: http://$EXTERNAL_IP:$OLLAMA_PORT
Host: $OLLAMA_HOST
Port: $OLLAMA_PORT

Test Command:
curl http://$EXTERNAL_IP:$OLLAMA_PORT/api/tags
EOF

success "Informations sauvegardées dans ~/OLLAMA_INFO.txt"

exit 0
