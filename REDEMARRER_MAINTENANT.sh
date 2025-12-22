#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🔍 REDÉMARRAGE BOT + DEBUG MOT-CACHÉ                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logs détaillés ajoutés:"
echo "   • Détection boutons dans bot.js"
echo "   • Traitement dans mot-cache-buttons.js"
echo "   • Chaque étape du bouton Config"
echo "   • Erreurs complètes avec stack trace"
echo ""
echo "🔑 Mot de passe: bagbot"
echo ""
echo "⏳ Connexion..."
echo ""

ssh -p 33000 bagbot@88.174.155.230 << 'EOF'
echo "📂 Navigation vers le dossier..."
cd /home/bagbot/Bag-bot

echo ""
echo "📥 Récupération des modifications..."
git pull origin cursor/command-deployment-and-emoji-issue-1db6

echo ""
echo "🔄 Redémarrage du bot..."
pm2 restart bagbot

echo ""
echo "⏳ Attente (3 secondes)..."
sleep 3

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                    ✅ BOT REDÉMARRÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Logs récents:"
echo ""
pm2 logs bagbot --lines 50 --nostream | tail -30

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                 🔍 MAINTENANT, TESTER:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Ouvrir terminal pour logs en temps réel:"
echo "    ssh -p 33000 bagbot@88.174.155.230"
echo "    pm2 logs bagbot | grep \"MOT-CACHE\""
echo ""
echo "2️⃣  Sur Discord:"
echo "    /mot-cache"
echo "    Cliquer '⚙️ Config'"
echo ""
echo "3️⃣  OBSERVER LES LOGS - Vous verrez:"
echo "    [MOT-CACHE] Bouton détecté: motcache_open_config"
echo "    [MOT-CACHE-HANDLER] Bouton reçu: motcache_open_config"
echo "    [MOT-CACHE-HANDLER] Traitement bouton: motcache_open_config"
echo "    [MOT-CACHE-HANDLER] Bouton config détecté"
echo "    [MOT-CACHE-HANDLER] Construction de l'embed config"
echo "    [MOT-CACHE-HANDLER] Tentative d'update du message"
echo "    [MOT-CACHE-HANDLER] Update réussi"
echo ""
echo "❌ Si ça échoue, les logs diront EXACTEMENT pourquoi"
echo ""
echo "════════════════════════════════════════════════════════════════"
EOF

echo ""
echo "✅ Script terminé!"
echo ""
echo "📖 Documentation complète: DEBUG_MOT_CACHE.md"
echo ""
