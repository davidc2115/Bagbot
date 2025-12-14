#!/bin/bash

# Génération du keystore pour signature APK
# Ce script génère un keystore pour signer l'APK en mode release

KEYSTORE_DIR="./BagBotApp/android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/release.keystore"

echo "🔐 Génération du keystore pour signature APK..."

# Vérifier si le keystore existe déjà
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Le keystore existe déjà : $KEYSTORE_FILE"
    echo "Suppression pour régénération..."
    rm "$KEYSTORE_FILE"
fi

# Générer le keystore
keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -alias bagbot-key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass bagbot2024 \
    -keypass bagbot2024 \
    -dname "CN=BAG Bot, OU=Admin, O=BAG Bot, L=Paris, ST=IDF, C=FR"

if [ $? -eq 0 ]; then
    echo "✅ Keystore généré avec succès : $KEYSTORE_FILE"
    echo ""
    echo "📋 Informations du keystore :"
    echo "   Alias : bagbot-key"
    echo "   Password : bagbot2024"
    echo "   Validité : 10000 jours (~27 ans)"
else
    echo "❌ Erreur lors de la génération du keystore"
    exit 1
fi
