#!/bin/bash

# 🚀 BUILD APK avec EAS - Simple et Efficace
# Distribution interne uniquement

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 BUILD APK - BAG Bot Dashboard v1.1.0                    ║"
echo "║     avec pseudo Discord + Distribution Interne               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /workspace/BagBotApp

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}✨ Nouveauté v1.1.0 : Récupération automatique des pseudos Discord !${NC}"
echo ""

# Vérifier si EAS CLI est installé
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}📦 Installation d'EAS CLI...${NC}"
    npm install -g eas-cli
fi

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 1/3 : Connexion Expo${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Vous devez vous connecter à votre compte Expo${NC}"
echo -e "${YELLOW}   (Appuyez sur Entrée pour continuer)${NC}"
read

eas whoami 2>/dev/null || eas login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Connexion Expo échouée${NC}"
    exit 1
fi

EXPO_USER=$(eas whoami 2>/dev/null)
echo -e "${GREEN}✅ Connecté en tant que: $EXPO_USER${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 2/3 : Lancement du build APK${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⏱️  Le build prendra environ 10-15 minutes...${NC}"
echo -e "${YELLOW}   Vous pouvez suivre la progression sur : https://expo.dev${NC}"
echo ""

# Lancer le build
eas build --platform android --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ BUILD LANCÉ AVEC SUCCÈS !${NC}"
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}ÉTAPE 3/3 : Attente et téléchargement${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}📊 Suivi du build :${NC}"
    
    # Attendre que le build se termine
    BUILD_ID=$(eas build:list --platform android --limit 1 --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$BUILD_ID" ]; then
        echo "   • Build ID : $BUILD_ID"
        echo "   • URL : https://expo.dev/accounts/$EXPO_USER/projects/bagbot-dashboard/builds/$BUILD_ID"
        echo ""
        echo -e "${YELLOW}⏳ Attente de la fin du build...${NC}"
        
        # Boucle d'attente
        while true; do
            STATUS=$(eas build:view $BUILD_ID --json 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            case "$STATUS" in
                "finished")
                    echo -e "${GREEN}✅ BUILD TERMINÉ !${NC}"
                    
                    # Télécharger l'APK
                    echo ""
                    echo -e "${YELLOW}📥 Téléchargement de l'APK...${NC}"
                    
                    APK_URL=$(eas build:view $BUILD_ID --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
                    
                    if [ ! -z "$APK_URL" ]; then
                        wget -O bag-bot-dashboard-v1.1.0.apk "$APK_URL" 2>&1 | grep -E "(saved|Saving)"
                        
                        if [ -f "bag-bot-dashboard-v1.1.0.apk" ]; then
                            APK_SIZE=$(du -h bag-bot-dashboard-v1.1.0.apk | cut -f1)
                            
                            echo ""
                            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
                            echo -e "${GREEN}🎉 APK GÉNÉRÉ AVEC SUCCÈS !${NC}"
                            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
                            echo ""
                            echo -e "${YELLOW}📱 Fichier APK :${NC}"
                            echo -e "   ${BLUE}$(pwd)/bag-bot-dashboard-v1.1.0.apk${NC}"
                            echo ""
                            echo -e "${YELLOW}📊 Informations :${NC}"
                            echo "   • Taille : $APK_SIZE"
                            echo "   • Version : 1.1.0"
                            echo "   • Package : com.bagbot.dashboard"
                            echo "   • Build : Production (signé)"
                            echo ""
                            echo -e "${YELLOW}✨ Nouveautés :${NC}"
                            echo "   • 👤 Récupération pseudo Discord au 1er lancement"
                            echo "   • ✏️  Modification du pseudo à tout moment"
                            echo "   • 💬 Chat staff avec vrais pseudos Discord"
                            echo ""
                            
                            # Proposer de créer une release GitHub
                            echo -e "${YELLOW}🔗 Créer une release GitHub ? (o/n)${NC}"
                            read -r RESPONSE
                            
                            if [[ "$RESPONSE" =~ ^[Oo]$ ]]; then
                                echo ""
                                echo "Création de la release GitHub..."
                                
                                cd /workspace
                                
                                # Commit et push
                                git add BagBotApp/
                                git commit -m "feat(v1.1.0): Add Discord username support

✨ New Features:
- Discord username prompt on first launch
- Change username button in staff chat  
- Real Discord usernames in chat messages
- Improved user experience

📱 APK:
- Production build (signed)
- Size: $APK_SIZE
- Version: 1.1.0
- Ready for internal distribution
" 2>&1 | tail -5
                                
                                git push origin cursor/freebox-dashboard-restart-84eb 2>&1 | tail -3
                                
                                # Créer tag et release
                                git tag -a v1.1.0 -m "BAG Bot Dashboard v1.1.0 - Discord Usernames" 2>/dev/null
                                git push origin v1.1.0 2>/dev/null
                                
                                # Créer la release avec l'APK
                                gh release create v1.1.0 \
                                    --title "BAG Bot Dashboard Mobile v1.1.0 🎉" \
                                    --notes "## 🎉 Version 1.1.0 - Pseudos Discord

### ✨ Nouveautés

#### 👤 Récupération des Pseudos Discord
- **Demande automatique** au premier lancement de l'app
- **Saisie manuelle** de votre pseudo Discord (ex: \"Admin#1234\")
- **Sauvegarde persistante** du pseudo
- **Modification possible** à tout moment via le bouton ✏️

#### 💬 Chat Staff Amélioré
- Utilise vos **vrais pseudos Discord**
- Plus besoin de pseudos génériques \"Staff123\"
- **Identification claire** de chaque membre
- Modification du pseudo via l'icône crayon

### 📱 Fonctionnalités Complètes

- **Dashboard** - Vue d'ensemble du serveur Discord
- **Chat Staff** - Communication entre admins avec pseudos Discord
- **Monitoring** - Stats serveur en temps réel
- **Gestion** - Redémarrage services, vidage cache

### 🔐 Installation

1. Téléchargez l'APK ci-dessous
2. Activez 'Sources inconnues' sur Android
3. Installez l'APK
4. **Au 1er lancement : entrez votre pseudo Discord**
5. Connectez-vous au serveur

### 🌐 Configuration Serveur

- URL : \`http://88.174.155.230:3002\`
- Login : \`admin\`
- Password : \`bagbot2024\`

### 📊 Détails Techniques

- **Version** : 1.1.0
- **Build** : Production (signé)
- **Package** : com.bagbot.dashboard
- **Taille** : $APK_SIZE
- **Android** : 6.0+ (API 23+)

### ⚠️ Distribution Interne

APK pour distribution interne aux admins uniquement.
Pas disponible sur Google Play Store.

---

**Nouvelle fonctionnalité phare : Utilisez vos vrais pseudos Discord ! 🎉**" \
                                    BagBotApp/bag-bot-dashboard-v1.1.0.apk 2>&1 | tail -10
                                
                                RELEASE_URL=$(gh release view v1.1.0 --json url --jq .url 2>/dev/null)
                                
                                if [ ! -z "$RELEASE_URL" ]; then
                                    echo ""
                                    echo -e "${GREEN}✅ Release GitHub créée !${NC}"
                                    echo ""
                                    echo -e "${YELLOW}🔗 LIEN DE LA RELEASE :${NC}"
                                    echo -e "${BLUE}$RELEASE_URL${NC}"
                                    echo ""
                                    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
                                    echo -e "${GREEN}🚀 Partagez ce lien avec vos admins !${NC}"
                                    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
                                    echo ""
                                else
                                    echo -e "${YELLOW}⚠️  Release non créée${NC}"
                                    echo -e "${YELLOW}📱 APK disponible localement${NC}"
                                fi
                            else
                                echo ""
                                echo -e "${YELLOW}📱 APK prêt pour distribution :${NC}"
                                echo -e "   $(pwd)/bag-bot-dashboard-v1.1.0.apk"
                                echo ""
                                echo -e "${GREEN}Distribuez directement l'APK à vos admins ! 🚀${NC}"
                            fi
                            
                        else
                            echo -e "${RED}❌ Erreur lors du téléchargement de l'APK${NC}"
                            echo -e "${YELLOW}📥 Téléchargez manuellement depuis :${NC}"
                            echo -e "   ${BLUE}$APK_URL${NC}"
                        fi
                    fi
                    break
                    ;;
                "errored"|"failed")
                    echo -e "${RED}❌ BUILD ÉCHOUÉ${NC}"
                    echo ""
                    echo "Consultez les logs sur : https://expo.dev"
                    exit 1
                    ;;
                "in-progress"|"pending"|"in-queue")
                    echo -n "."
                    sleep 30
                    ;;
                *)
                    echo -n "."
                    sleep 30
                    ;;
            esac
        done
    else
        echo -e "${YELLOW}⚠️  Impossible de récupérer l'ID du build${NC}"
        echo ""
        echo -e "${YELLOW}📊 Suivez votre build sur :${NC}"
        echo "   https://expo.dev/accounts/$EXPO_USER/projects/bagbot-dashboard/builds"
        echo ""
        echo -e "${YELLOW}📥 Une fois terminé, téléchargez l'APK depuis le site Expo${NC}"
    fi
    
else
    echo ""
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ ERREUR DE BUILD${NC}"
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo ""
    echo "Vérifiez votre connexion et réessayez"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo "✨ Process terminé"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
