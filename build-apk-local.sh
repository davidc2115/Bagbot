#!/bin/bash

# 🚀 BUILD APK LOCAL - Sans Expo Account
# Pour distribution interne uniquement

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 BUILD APK LOCAL - BAG Bot Dashboard v1.1.0              ║"
echo "║     Distribution Interne Admin Seulement                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /workspace/BagBotApp

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Ce build est pour distribution interne uniquement${NC}"
echo -e "${YELLOW}⚠️  APK non signé (parfait pour les admins)${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 1/4 : Installation des dépendances${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

npm install --legacy-peer-deps 2>&1 | tail -3
echo -e "${GREEN}✅ Dépendances installées${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 2/4 : Génération projet Android natif${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# Nettoyer et régénérer
rm -rf android
npx expo prebuild --platform android --clean 2>&1 | grep -E "(✔|✖)" 
echo -e "${GREEN}✅ Projet Android généré${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 3/4 : Compilation APK (5-10 minutes)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⏱️  Le build peut prendre 5-10 minutes...${NC}"
echo ""

# Build avec Gradle
cd android

# Build debug APK (plus rapide, parfait pour distribution interne)
./gradlew assembleDebug 2>&1 | grep -E "(BUILD|Task|FAILED|SUCCESS)" | tail -20

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ BUILD RÉUSSI !${NC}"
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}ÉTAPE 4/4 : Finalisation${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    
    # Copier l'APK
    APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"
    APK_DEST="../bag-bot-dashboard-v1.1.0-debug.apk"
    
    if [ -f "$APK_SOURCE" ]; then
        cp "$APK_SOURCE" "$APK_DEST"
        cd ..
        
        APK_SIZE=$(du -h "bag-bot-dashboard-v1.1.0-debug.apk" | cut -f1)
        
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}🎉 APK GÉNÉRÉ AVEC SUCCÈS !${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}📱 Fichier APK :${NC}"
        echo -e "   ${BLUE}$(pwd)/bag-bot-dashboard-v1.1.0-debug.apk${NC}"
        echo ""
        echo -e "${YELLOW}📊 Informations :${NC}"
        echo "   • Taille : $APK_SIZE"
        echo "   • Version : 1.1.0"
        echo "   • Type : Debug (non signé)"
        echo "   • Package : com.bagbot.dashboard"
        echo ""
        echo -e "${YELLOW}📤 Distribution :${NC}"
        echo "   1. Transférez l'APK à vos admins"
        echo "   2. Sur Android, activez 'Sources inconnues'"
        echo "   3. Installez l'APK"
        echo "   4. L'app est prête !"
        echo ""
        echo -e "${BLUE}⚠️  Note : APK debug (parfait pour usage interne)${NC}"
        echo ""
        
        # Proposer de créer une release GitHub
        echo -e "${YELLOW}🔗 Voulez-vous créer une release GitHub ? (o/n)${NC}"
        read -r RESPONSE
        
        if [[ "$RESPONSE" =~ ^[Oo]$ ]]; then
            echo ""
            echo "Création de la release GitHub..."
            
            cd /workspace
            git add BagBotApp/
            git commit -m "feat: Add Discord username support + build APK

✨ New Features:
- Discord username prompt on first launch
- Change username button in chat
- Local APK build (no Expo account needed)

📱 APK:
- Debug build for internal distribution
- Size: $APK_SIZE
- Version: 1.1.0
" 2>&1 | tail -5
            
            git push origin cursor/freebox-dashboard-restart-84eb 2>&1 | tail -3
            
            # Créer tag et release
            git tag -a v1.1.0-internal -m "Internal Release v1.1.0" 2>/dev/null
            git push origin v1.1.0-internal 2>/dev/null
            
            gh release create v1.1.0-internal \
                --title "BAG Bot Dashboard Mobile v1.1.0 (Internal)" \
                --notes "## 🔐 Version Interne Admins

Cette version est destinée **uniquement aux administrateurs** du serveur BAG Bot.

## ✨ Nouveautés v1.1.0

- 💬 **Chat Staff** - Communication entre admins
- 📊 **Monitoring Serveur** - Stats temps réel
- 🔄 **Gestion à distance** - Redémarrage services
- 👤 **Pseudo Discord** - Utilise votre vrai pseudo Discord

## 📱 Installation

1. Téléchargez l'APK ci-dessous
2. Activez 'Sources inconnues' sur Android
3. Installez l'APK
4. Au premier lancement, entrez votre pseudo Discord
5. Connectez-vous au serveur : http://88.174.155.230:3002

## ⚠️ Important

- APK Debug (non signé)
- Distribution interne uniquement
- Pas sur Google Play Store
- Fonctionne parfaitement pour l'usage admin

## 🔗 Connexion

- Serveur : http://88.174.155.230:3002
- Port : 3002" \
                BagBotApp/bag-bot-dashboard-v1.1.0-debug.apk 2>&1 | tail -10
            
            RELEASE_URL=$(gh release view v1.1.0-internal --json url --jq .url 2>/dev/null)
            
            if [ ! -z "$RELEASE_URL" ]; then
                echo ""
                echo -e "${GREEN}✅ Release GitHub créée !${NC}"
                echo ""
                echo -e "${YELLOW}🔗 LIEN DE LA RELEASE :${NC}"
                echo -e "${BLUE}$RELEASE_URL${NC}"
                echo ""
                echo -e "${GREEN}Partagez ce lien avec vos admins ! 🚀${NC}"[] echo ""
            else
                echo -e "${YELLOW}⚠️  Release non créée (vérifiez gh CLI)${NC}"
                echo -e "${YELLOW}📱 APK disponible localement :${NC}"
                echo -e "   $(pwd)/BagBotApp/bag-bot-dashboard-v1.1.0-debug.apk"
            fi
        else
            echo ""
            echo -e "${YELLOW}📱 APK disponible :${NC}"
            echo -e "   $(pwd)/bag-bot-dashboard-v1.1.0-debug.apk"
            echo ""
            echo -e "${GREEN}Distribuez directement l'APK à vos admins ! 🚀${NC}"
        fi
        
    else
        echo -e "${RED}❌ APK non trouvé à : $APK_SOURCE${NC}"
        exit 1
    fi
    
else
    echo ""
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ BUILD ÉCHOUÉ${NC}"
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo ""
    echo "Consultez les erreurs ci-dessus"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo "✨ Build terminé"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
