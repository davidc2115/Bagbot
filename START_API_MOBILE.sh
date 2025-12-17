#!/bin/bash
# Script de démarrage de l'API mobile pour l'application Android

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     DÉMARRAGE API MOBILE POUR APPLICATION ANDROID        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Vérifier les variables d'environnement
echo "🔍 Vérification de la configuration..."
cd /workspace

if ! grep -q "DISCORD_CLIENT_SECRET" .env || grep -q "YOUR_CLIENT_SECRET_HERE" .env; then
  echo "❌ ERREUR : DISCORD_CLIENT_SECRET manquant ou non configuré"
  echo ""
  echo "📋 Actions requises :"
  echo "1. Obtenir le Client Secret sur https://discord.com/developers/applications"
  echo "2. Éditer /workspace/.env"
  echo "3. Remplacer YOUR_CLIENT_SECRET_HERE par votre vrai secret"
  echo ""
  exit 1
fi

if ! grep -q "DISCORD_TOKEN" .env || grep -q "YOUR_DISCORD_BOT_TOKEN_HERE" .env; then
  echo "❌ ERREUR : DISCORD_TOKEN manquant ou non configuré"
  echo ""
  echo "📋 Actions requises :"
  echo "1. Obtenir le Bot Token sur https://discord.com/developers/applications"
  echo "2. Éditer /workspace/.env"
  echo "3. Remplacer YOUR_DISCORD_BOT_TOKEN_HERE par votre vrai token"
  echo ""
  exit 1
fi

echo "✅ Configuration trouvée"
echo ""

# Vérifier si le bot tourne déjà
if pm2 list | grep -q "bagbot"; then
  echo "⚠️  Le bot est déjà démarré avec PM2"
  echo ""
  echo "Choisissez une action :"
  echo "  1. Redémarrer : pm2 restart bagbot"
  echo "  2. Arrêter :    pm2 stop bagbot"
  echo "  3. Voir logs :  pm2 logs bagbot"
  echo ""
  exit 0
fi

# Démarrer le bot
echo "🚀 Démarrage du bot Discord avec API mobile..."
echo ""

pm2 start src/bot.js --name bagbot
pm2 save

echo ""
echo "⏳ Attente du démarrage..."
sleep 5

# Vérifier que l'API répond
echo ""
echo "🧪 Test de l'API..."
if curl -s http://88.174.155.230:3001/health > /dev/null 2>&1; then
  echo "✅ API mobile opérationnelle !"
  echo ""
  echo "📱 Configuration de l'application Android :"
  echo "   URL : http://88.174.155.230:3001"
  echo ""
  echo "📊 Commandes utiles :"
  echo "   • Logs :     pm2 logs bagbot"
  echo "   • Status :   pm2 status"
  echo "   • Restart :  pm2 restart bagbot"
  echo "   • Stop :     pm2 stop bagbot"
  echo ""
else
  echo "⚠️  L'API ne répond pas encore"
  echo ""
  echo "Vérifier les logs : pm2 logs bagbot"
  echo "L'API peut prendre quelques secondes à démarrer"
  echo ""
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║            L'app Android peut maintenant se connecter !   ║"
echo "╚══════════════════════════════════════════════════════════╝"
