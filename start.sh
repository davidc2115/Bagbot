#!/bin/bash

# 🚀 Script de Démarrage Rapide - BAG Bot v4.1.0
# Ce script démarre tous les services nécessaires

echo "=========================================="
echo "🚀 BAG Bot - Démarrage des Services"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour vérifier si PM2 est installé
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 n'est pas installé${NC}"
        echo -e "${YELLOW}Installation de PM2...${NC}"
        npm install -g pm2
    else
        echo -e "${GREEN}✅ PM2 est installé${NC}"
    fi
}

# Fonction pour vérifier le fichier .env
check_env() {
    if [ ! -f "/workspace/backend/.env" ]; then
        echo -e "${RED}❌ Fichier .env manquant${NC}"
        echo -e "${YELLOW}Copie de .env.example vers .env${NC}"
        cp /workspace/backend/.env.example /workspace/backend/.env
        echo -e "${YELLOW}⚠️  Veuillez éditer /workspace/backend/.env avec vos tokens${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Fichier .env trouvé${NC}"
    fi
}

# Fonction pour vérifier les dépendances
check_dependencies() {
    if [ ! -d "/workspace/backend/node_modules" ]; then
        echo -e "${YELLOW}📦 Installation des dépendances backend...${NC}"
        cd /workspace/backend
        npm install
    else
        echo -e "${GREEN}✅ Dépendances backend installées${NC}"
    fi

    if [ ! -d "/workspace/node_modules" ]; then
        echo -e "${YELLOW}📦 Installation des dépendances du bot...${NC}"
        cd /workspace
        npm install
    else
        echo -e "${GREEN}✅ Dépendances du bot installées${NC}"
    fi
}

# Fonction pour démarrer le backend
start_backend() {
    echo ""
    echo -e "${BLUE}🌐 Démarrage du Backend API...${NC}"
    cd /workspace/backend
    
    # Vérifier si déjà lancé
    if pm2 list | grep -q "bagbot-backend"; then
        echo -e "${YELLOW}⚠️  Backend déjà en cours d'exécution${NC}"
        echo -e "${YELLOW}Redémarrage...${NC}"
        pm2 restart bagbot-backend
    else
        pm2 start server.js --name bagbot-backend
    fi
    
    echo -e "${GREEN}✅ Backend démarré${NC}"
}

# Fonction pour démarrer le bot
start_bot() {
    echo ""
    echo -e "${BLUE}🤖 Démarrage du Bot Discord...${NC}"
    cd /workspace/src
    
    # Vérifier si déjà lancé
    if pm2 list | grep -q "bagbot"; then
        echo -e "${YELLOW}⚠️  Bot déjà en cours d'exécution${NC}"
        echo -e "${YELLOW}Redémarrage...${NC}"
        pm2 restart bagbot
    else
        pm2 start bot.js --name bagbot
    fi
    
    echo -e "${GREEN}✅ Bot démarré${NC}"
}

# Fonction pour afficher le status
show_status() {
    echo ""
    echo -e "${BLUE}📊 Status des Services${NC}"
    echo "=========================================="
    pm2 list
    echo ""
}

# Fonction pour afficher les logs
show_logs() {
    echo ""
    echo -e "${BLUE}📋 Logs (Ctrl+C pour quitter)${NC}"
    echo "=========================================="
    pm2 logs
}

# Menu principal
main() {
    echo -e "${BLUE}Vérifications préliminaires...${NC}"
    check_pm2
    check_env
    check_dependencies
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Que souhaitez-vous faire ?"
    echo "==========================================${NC}"
    echo "1) Démarrer tous les services"
    echo "2) Démarrer uniquement le backend"
    echo "3) Démarrer uniquement le bot"
    echo "4) Afficher le status"
    echo "5) Afficher les logs"
    echo "6) Arrêter tous les services"
    echo "7) Redémarrer tous les services"
    echo "8) Quitter"
    echo ""
    read -p "Votre choix (1-8): " choice
    
    case $choice in
        1)
            start_backend
            start_bot
            show_status
            read -p "Afficher les logs ? (y/n): " show_logs_choice
            if [ "$show_logs_choice" == "y" ]; then
                show_logs
            fi
            ;;
        2)
            start_backend
            show_status
            ;;
        3)
            start_bot
            show_status
            ;;
        4)
            show_status
            ;;
        5)
            show_logs
            ;;
        6)
            echo -e "${YELLOW}Arrêt des services...${NC}"
            pm2 stop bagbot-backend bagbot
            echo -e "${GREEN}✅ Services arrêtés${NC}"
            show_status
            ;;
        7)
            echo -e "${YELLOW}Redémarrage des services...${NC}"
            pm2 restart bagbot-backend bagbot
            echo -e "${GREEN}✅ Services redémarrés${NC}"
            show_status
            ;;
        8)
            echo -e "${GREEN}Au revoir ! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Choix invalide${NC}"
            exit 1
            ;;
    esac
}

# Lancement
main
