#!/bin/bash

# Script de configuration pour l'API Android du BagBot
# Ce script configure automatiquement l'environnement pour l'application mobile

set -e

echo "======================================"
echo "  Configuration API Android BagBot"
echo "======================================"
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher un succès
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Fonction pour afficher une erreur
error() {
    echo -e "${RED}✗${NC} $1"
}

# Fonction pour afficher un avertissement
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    error "Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
fi

success "Répertoire de travail correct"

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    error "Fichier .env non trouvé"
    echo "Création d'un fichier .env de base..."
    touch .env
fi

success "Fichier .env trouvé"

# Vérifier les variables requises
echo ""
echo "Vérification des variables d'environnement..."

check_env_var() {
    VAR_NAME=$1
    if grep -q "^${VAR_NAME}=" .env; then
        success "$VAR_NAME configuré"
        return 0
    else
        warning "$VAR_NAME manquant"
        return 1
    fi
}

MISSING_VARS=0

if ! check_env_var "DISCORD_TOKEN"; then
    ((MISSING_VARS++))
fi

if ! check_env_var "CLIENT_ID"; then
    ((MISSING_VARS++))
fi

if ! check_env_var "DISCORD_CLIENT_SECRET"; then
    echo ""
    warning "DISCORD_CLIENT_SECRET manquant - REQUIS pour l'authentification mobile"
    echo "  1. Allez sur https://discord.com/developers/applications"
    echo "  2. Sélectionnez votre application"
    echo "  3. OAuth2 > General > Client Secret"
    echo "  4. Copiez le secret et ajoutez-le dans .env"
    echo ""
    ((MISSING_VARS++))
fi

if ! check_env_var "API_PORT"; then
    echo "API_PORT=3001" >> .env
    success "API_PORT ajouté (3001)"
fi

if ! check_env_var "API_REDIRECT_URI"; then
    echo ""
    warning "API_REDIRECT_URI manquant"
    echo "Quelle est l'IP de votre serveur ? (ex: 192.168.1.100)"
    read -r SERVER_IP
    
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    
    echo "API_REDIRECT_URI=http://${SERVER_IP}:3001/auth/callback" >> .env
    success "API_REDIRECT_URI ajouté"
fi

echo ""
if [ $MISSING_VARS -gt 0 ]; then
    warning "$MISSING_VARS variable(s) manquante(s) - Configurez-les avant de continuer"
else
    success "Toutes les variables d'environnement sont configurées"
fi

# Vérifier si cors est installé
echo ""
echo "Vérification des dépendances..."

if ! npm list cors &> /dev/null; then
    warning "Package 'cors' manquant"
    echo "Installation de cors..."
    npm install --save cors
    success "cors installé"
else
    success "cors déjà installé"
fi

# Tester la connexion au bot Discord
echo ""
echo "Configuration Discord OAuth2..."
echo ""
warning "N'oubliez pas de configurer les redirects OAuth2 dans le Discord Developer Portal :"
echo "  1. https://discord.com/developers/applications"
echo "  2. Votre application > OAuth2 > Redirects"
echo "  3. Ajoutez les URLs suivantes :"
echo ""

# Extraire l'IP de API_REDIRECT_URI si elle existe
if grep -q "^API_REDIRECT_URI=" .env; then
    REDIRECT_URI=$(grep "^API_REDIRECT_URI=" .env | cut -d '=' -f 2-)
    echo "     - $REDIRECT_URI"
else
    echo "     - http://VOTRE_IP:3001/auth/callback"
fi
echo "     - bagbot://oauth"

echo ""
echo "======================================"
echo "  Résumé de la Configuration"
echo "======================================"

echo ""
echo "📋 Fichiers créés :"
success "  API REST : src/api/server.js"
success "  Application Android : android-app/"

echo ""
echo "🔧 Configuration :"
if grep -q "^API_PORT=" .env; then
    PORT=$(grep "^API_PORT=" .env | cut -d '=' -f 2-)
    success "  Port API : $PORT"
fi

if grep -q "^API_REDIRECT_URI=" .env; then
    URI=$(grep "^API_REDIRECT_URI=" .env | cut -d '=' -f 2-)
    success "  Redirect URI : $URI"
fi

echo ""
echo "📱 Prochaines étapes :"
echo ""
echo "1. Configurez DISCORD_CLIENT_SECRET dans .env"
echo "   (Récupérez-le sur https://discord.com/developers/applications)"
echo ""
echo "2. Configurez les redirects OAuth2 sur Discord Developer Portal"
echo ""
echo "3. Démarrez le bot avec l'API :"
echo "   $ node src/bot.js"
echo "   ou"
echo "   $ pm2 start src/bot.js --name bagbot"
echo ""
echo "4. Testez l'API :"
echo "   $ curl http://localhost:${PORT:-3001}/health"
echo ""
echo "5. Compilez l'application Android :"
echo "   $ cd android-app"
echo "   $ ./gradlew assembleDebug"
echo ""
echo "6. Consultez le guide complet :"
echo "   $ cat ANDROID_APP_GUIDE.md"
echo ""
echo "======================================"
echo ""

if [ $MISSING_VARS -eq 0 ]; then
    success "Configuration terminée ! Vous pouvez démarrer le bot."
else
    warning "Configuration incomplète. Complétez les variables manquantes dans .env"
fi

echo ""
