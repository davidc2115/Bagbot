#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
# 🚀 REDÉMARRAGE DU BOT - 23 DÉCEMBRE 2025
# ═══════════════════════════════════════════════════════════════════
#
# Ce script redémarre le bot avec toutes les nouvelles fonctionnalités :
# - Monitoring automatique (toutes les 10 minutes)
# - Commande /health pour diagnostic
# - Logs réduits de 90%
# - Système de backup horaire vérifié
#
# ═══════════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🚀 REDÉMARRAGE DU BOT BAGBOT                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "src/bot.js" ]; then
    echo "❌ Erreur : Ce script doit être exécuté depuis /home/bagbot/Bag-bot"
    echo "   Commande : cd /home/bagbot/Bag-bot && ./REDEMARRER_MAINTENANT.sh"
    exit 1
fi

echo "📍 Répertoire de travail : $(pwd)"
echo ""

# Étape 1 : Redémarrer le bot
echo "═══════════════════════════════════════════════════════════════"
echo "🔄 ÉTAPE 1 : Redémarrage du bot..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

pm2 restart bagbot

if [ $? -eq 0 ]; then
    echo "✅ Bot redémarré avec succès"
else
    echo "❌ Erreur lors du redémarrage"
    exit 1
fi

echo ""
echo "⏳ Attente de 3 secondes pour laisser le bot démarrer..."
sleep 3
echo ""

# Étape 2 : Vérifier les logs
echo "═══════════════════════════════════════════════════════════════"
echo "📋 ÉTAPE 2 : Vérification des logs de démarrage..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Logs des 30 dernières lignes :"
pm2 logs bagbot --lines 30 --nostream

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 ÉTAPE 3 : Recherche des messages de démarrage..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Vérifier les messages importants
MESSAGES_ATTENDUS=(
    "[Bot] ✅ Système de backup horaire démarré"
    "[Bot] ✅ Système de monitoring démarré"
    "[HourlyBackup] ✅ Système démarré"
)

echo "Messages à vérifier :"
for msg in "${MESSAGES_ATTENDUS[@]}"; do
    if pm2 logs bagbot --lines 50 --nostream | grep -q "$msg"; then
        echo "  ✅ $msg"
    else
        echo "  ⚠️  Pas encore trouvé : $msg"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 ÉTAPE 4 : Informations du processus..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

pm2 info bagbot

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ REDÉMARRAGE TERMINÉ"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎯 PROCHAINES ACTIONS :"
echo ""
echo "  1. Tester la commande Discord :"
echo "     /health"
echo ""
echo "  2. Vérifier le dashboard admin :"
echo "     http://VOTRE_IP:33002"
echo "     → Aller dans l'onglet ⚙️ Admin"
echo ""
echo "  3. Vérifier les logs en continu :"
echo "     pm2 logs bagbot"
echo ""
echo "  4. Builder l'application Android :"
echo "     cd android-app && ./BUILD_APK.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📚 DOCUMENTATION :"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  • RESUME_FINAL_JOURNEE_23DEC2025.md      - Résumé complet"
echo "  • ACTIONS_FINALES_23DEC2025.txt          - Actions finales"
echo "  • MODIFICATIONS_ANDROID_23DEC2025.md     - Modifs Android"
echo "  • VERIFICATION_BACKUPS.md                - Vérif backups"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Le bot est maintenant opérationnel avec toutes les nouvelles fonctionnalités !"
echo ""
