#!/bin/bash

# 🚀 SCRIPT AUTOMATIQUE DE BUILD - UNE SEULE COMMANDE
# Exécutez ce script et suivez les instructions

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 BUILD AUTOMATIQUE - BAG Bot Dashboard Mobile v1.1.0      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Ce script va :"
echo "  1. Vérifier les prérequis"
echo "  2. Vous connecter à Expo"
echo "  3. Lancer le build automatiquement"
echo "  4. Surveiller la progression"
echo "  5. Télécharger l'APK"
echo "  6. Créer la release GitHub"
echo "  7. Vous donner le lien final"
echo ""
read -p "Appuyez sur Entrée pour commencer..."

cd /workspace/BagBotApp

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 1/7 : Vérification${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Vérifier EAS CLI
if command -v eas &> /dev/null; then
    echo -e "${GREEN}✅ EAS CLI installé${NC}"
else
    echo -e "${YELLOW}📦 Installation d'EAS CLI...${NC}"
    npm install -g eas-cli
    echo -e "${GREEN}✅ EAS CLI installé${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 2/7 : Connexion Expo${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Vérifier si déjà connecté
if eas whoami &> /dev/null; then
    EXPO_USER=$(eas whoami)
    echo -e "${GREEN}✅ Déjà connecté en tant que : ${EXPO_USER}${NC}"
else
    echo -e "${YELLOW}🔐 Connexion à Expo requise${NC}"
    echo ""
    echo "Si vous n'avez pas de compte :"
    echo "  1. Allez sur https://expo.dev"
    echo "  2. Créez un compte gratuit (30 secondes)"
    echo "  3. Revenez ici"
    echo ""
    echo "Ensuite, connectez-vous :"
    eas login
    
    if [ $? -eq 0 ]; then
        EXPO_USER=$(eas whoami)
        echo -e "${GREEN}✅ Connecté en tant que : ${EXPO_USER}${NC}"
    else
        echo -e "${RED}❌ Échec de la connexion${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 3/7 : Configuration projet${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Configurer si nécessaire
if grep -q '"projectId"' app.json 2>/dev/null; then
    echo -e "${GREEN}✅ Projet déjà configuré${NC}"
else
    echo -e "${YELLOW}⚙️  Configuration du projet...${NC}"
    eas build:configure
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 4/7 : Lancement du build${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}🚀 Lancement du build Android APK...${NC}"
echo ""

# Lancer le build
eas build --platform android --profile production --non-interactive

BUILD_EXIT=$?

if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build lancé avec succès !${NC}"
else
    echo ""
    echo -e "${RED}❌ Erreur lors du lancement du build${NC}"
    echo ""
    echo "Vérifiez les erreurs ci-dessus et réessayez."
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 5/7 : Surveillance du build${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⏱️  Le build prend généralement 10-20 minutes${NC}"
echo ""
echo "Vous pouvez :"
echo "  • Attendre ici (le script surveille automatiquement)"
echo "  • Aller sur https://expo.dev pour suivre en direct"
echo ""
read -p "Appuyez sur Entrée pour surveiller le build..."

# Surveiller le build
echo ""
echo "Surveillance du build en cours..."
echo ""

while true; do
    # Obtenir le statut du dernier build
    BUILD_STATUS=$(eas build:list --platform android --limit 1 --json 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$BUILD_STATUS" = "finished" ]; then
        echo -e "${GREEN}✅ BUILD TERMINÉ !${NC}"
        break
    elif [ "$BUILD_STATUS" = "errored" ]; then
        echo -e "${RED}❌ Build échoué${NC}"
        echo "Consultez les logs sur https://expo.dev"
        exit 1
    else
        echo -ne "\r⏳ Status: $BUILD_STATUS ... "
        sleep 10
    fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 6/7 : Téléchargement de l'APK${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Télécharger l'APK
APK_FILENAME="bag-bot-dashboard-v1.1.0.apk"
eas build:download --latest --output "./$APK_FILENAME"

if [ -f "$APK_FILENAME" ]; then
    APK_SIZE=$(du -h "$APK_FILENAME" | cut -f1)
    echo -e "${GREEN}✅ APK téléchargé : $APK_FILENAME ($APK_SIZE)${NC}"
else
    echo -e "${RED}❌ Erreur lors du téléchargement${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 7/7 : Création de la release${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Créer le tag
git tag -a v1.1.0 -m "Release v1.1.0 - Chat Staff + Server Monitoring" 2>/dev/null
git push origin v1.1.0 2>/dev/null

# Créer la release GitHub
gh release create v1.1.0 \
    --title "BAG Bot Dashboard Mobile v1.1.0" \
    --notes "## ✨ Nouveautés v1.1.0

- 💬 **Chat Staff** - Communication interne entre membres
- 📊 **Monitoring Serveur** - Stats temps réel + gestion à distance
- 🔄 **Actions** : Redémarrer dashboard, bot, vider cache, reboot serveur
- 🎨 Interface réorganisée avec nouveaux onglets

## 📱 Installation
1. Téléchargez le fichier APK ci-dessous
2. Activez 'Sources inconnues' sur Android
3. Installez l'APK
4. Connectez-vous à votre serveur

## 📊 Changements
- 11 écrans (9 + 2 nouveaux)
- 38 endpoints API (30 + 8 nouveaux)
- 4,700+ lignes de code
- Chat staff fonctionnel
- Monitoring serveur complet

## 🔗 Liens
- Server: http://88.174.155.230:3002
- Documentation: Consultez les fichiers MD du repo" \
    "$APK_FILENAME"

RELEASE_URL=$(gh release view v1.1.0 --json url --jq .url)

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS ! TOUT EST TERMINÉ !${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Build réussi${NC}"
echo -e "${GREEN}✅ APK téléchargé${NC}"
echo -e "${GREEN}✅ Release GitHub créée${NC}"
echo ""
echo -e "${YELLOW}📱 LIEN DE LA RELEASE :${NC}"
echo -e "${BLUE}${RELEASE_URL}${NC}"
echo ""
echo -e "${YELLOW}📦 Lien de téléchargement direct de l'APK :${NC}"
APK_DOWNLOAD=$(gh release view v1.1.0 --json assets --jq '.assets[0].url')
echo -e "${BLUE}${APK_DOWNLOAD}${NC}"
echo ""
echo -e "${YELLOW}📊 Informations :${NC}"
echo "  • Fichier local : ./$APK_FILENAME"
echo "  • Taille : $APK_SIZE"
echo "  • Version : 1.1.0"
echo "  • Package : com.bagbot.dashboard"
echo ""
echo -e "${GREEN}Partagez le lien de la release avec votre équipe !${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
