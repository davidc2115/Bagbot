#!/bin/bash

# Script automatisé pour builder l'APK et créer la release GitHub
# Sans compte Expo requis !

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 BUILD APK + RELEASE GITHUB - v1.1.0                      ║"
echo "║     Sans compte Expo !                                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /workspace/BagBotApp

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

VERSION="1.1.0"
APK_NAME="bag-bot-dashboard-v${VERSION}.apk"

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 1/5 : Nettoyage${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

rm -rf android
echo -e "${GREEN}✅ Projet Android nettoyé${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 2/5 : Génération projet Android${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

npx expo prebuild --platform android --clean 2>&1 | grep -E "(✔|✖)"
echo -e "${GREEN}✅ Projet Android généré${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 3/5 : Build APK (5-10 min)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

cd android
./gradlew assembleDebug --no-daemon 2>&1 | grep -E "(BUILD|Task :app|SUCCESS)" | tail -20

if [ $? -eq 0 ] && [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo -e "${GREEN}✅ APK build avec succès !${NC}"
    
    # Renommer l'APK
    cp app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/debug/${APK_NAME}
    
    APK_SIZE=$(du -h app/build/outputs/apk/debug/${APK_NAME} | cut -f1)
    echo ""
    echo -e "${GREEN}📱 APK généré : ${APK_SIZE}${NC}"
    
else
    echo -e "${RED}❌ Build APK échoué${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 4/5 : Création Release GitHub${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

cd /workspace

# Vérifier si le tag existe
if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Tag v${VERSION} existe déjà${NC}"
    echo -e "${YELLOW}Suppression...${NC}"
    git tag -d "v${VERSION}"
    git push origin ":refs/tags/v${VERSION}" 2>/dev/null
fi

# Créer le tag
git tag -a "v${VERSION}" -m "BAG Bot Dashboard Mobile v${VERSION}

✨ Nouveautés :
- Récupération automatique des pseudos Discord
- Modification du pseudo à tout moment
- Chat staff avec vrais pseudos Discord
- Monitoring serveur en temps réel
- Gestion à distance (redémarrage, cache)
"

git push origin "v${VERSION}"

echo -e "${GREEN}✅ Tag v${VERSION} créé et poussé${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ÉTAPE 5/5 : Upload APK sur GitHub${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# Supprimer la release si elle existe
gh release delete "v${VERSION}" --yes 2>/dev/null

# Créer la release
gh release create "v${VERSION}" \
    --title "BAG Bot Dashboard Mobile v${VERSION}" \
    --notes "## 🎉 BAG Bot Dashboard Mobile v${VERSION}

### ✨ Nouvelles Fonctionnalités

- 👤 **Récupération automatique des pseudos Discord** au premier lancement
- ✏️ **Modification du pseudo** à tout moment via le bouton crayon
- 💬 **Chat staff avec vrais pseudos Discord**
- 📊 **Monitoring serveur** en temps réel (CPU, RAM, Disque, Uptime)
- 🔄 **Gestion à distance** (Redémarrage dashboard/bot, vidage cache, reboot serveur)

### 📱 Installation

1. **Téléchargez l'APK** ci-dessous
2. **Activez \"Sources inconnues\"** sur Android :
   - Paramètres → Sécurité → Sources inconnues (ON)
3. **Installez l'APK**
4. **Au premier lancement** : entrez votre pseudo Discord (ex: \"Admin#1234\")
5. **Connectez-vous** au serveur : \`http://88.174.155.230:3002\`

### 🔐 Connexion

- **Login :** \`admin\`
- **Password :** \`bagbot2024\`

### 💬 Chat Staff

- Messages avec vos vrais pseudos Discord
- Bouton ✏️ pour modifier votre pseudo
- Rafraîchissement auto toutes les 3 secondes
- Effacement du chat possible

### 📊 Monitoring

- Uptime, CPU, RAM, Disque
- État Dashboard & Bot (actif/inactif)
- Taille du cache
- Rafraîchissement auto toutes les 10 secondes

### 🔧 Actions Disponibles

- 🔄 Redémarrer Dashboard
- 🤖 Redémarrer Bot
- 🗑️ Vider le Cache
- ⚠️ Reboot Serveur (avec confirmation)

---

**⚠️ Distribution interne uniquement - Réservé aux admins du serveur BAG Bot**

**📱 Type :** APK Debug (non signé, parfait pour distribution interne)  
**🔗 Build :** Local (sans compte Expo)  
**📦 Taille :** ${APK_SIZE}" \
    "BagBotApp/android/app/build/outputs/apk/debug/${APK_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Release créée avec succès !${NC}"
    
    RELEASE_URL=$(gh release view "v${VERSION}" --json url --jq .url)
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 BUILD ET RELEASE TERMINÉS !${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}📱 APK :${NC}"
    echo -e "   ${BLUE}$(pwd)/BagBotApp/android/app/build/outputs/apk/debug/${APK_NAME}${NC}"
    echo ""
    echo -e "${YELLOW}📦 Taille : ${APK_SIZE}${NC}"
    echo ""
    echo -e "${YELLOW}🔗 LIEN DE LA RELEASE :${NC}"
    echo -e "   ${BLUE}${RELEASE_URL}${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Partagez ce lien avec vos admins ! 🚀${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
else
    echo -e "${RED}❌ Erreur lors de la création de la release${NC}"
    exit 1
fi
