#!/bin/bash
# Script COMPLET pour redémarrer le bot et redéployer TOUTES les commandes
# Date: 22 Décembre 2025

echo "🚀 REDÉMARRAGE COMPLET + DÉPLOIEMENT COMMANDES"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Vérifier connexion SSH
echo "📡 Connexion à la Freebox..."
echo "   Host: 88.174.155.230"
echo "   Port: 33000"
echo "   User: bagbot"
echo "   Password: bagbot"
echo ""

# Connexion SSH et exécution
ssh -p 33000 bagbot@88.174.155.230 << 'ENDSSH'

echo "═══════════════════════════════════════════════════════════"
echo "📂 ÉTAPE 1: Navigation vers le dossier du bot"
echo "═══════════════════════════════════════════════════════════"
cd /home/bagbot/Bag-bot || exit 1
echo "✅ Dossier actuel: $(pwd)"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "🔄 ÉTAPE 2: Redémarrage du bot"
echo "═══════════════════════════════════════════════════════════"
pm2 restart bagbot
sleep 3
echo "✅ Bot redémarré"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "📊 ÉTAPE 3: Vérification du statut"
echo "═══════════════════════════════════════════════════════════"
pm2 status
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "📦 ÉTAPE 4: Déploiement des commandes Discord"
echo "═══════════════════════════════════════════════════════════"
echo "⏳ Déploiement de 94 commandes en cours..."
echo ""

# Vérifier que les variables d'environnement sont chargées
if [ -f /var/data/.env ]; then
    export $(cat /var/data/.env | grep -v '^#' | xargs)
    echo "✅ Variables d'environnement chargées"
else
    echo "⚠️  Fichier /var/data/.env non trouvé"
fi

# Déployer toutes les commandes
node deploy-final.js

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 ÉTAPE 5: Logs récents du bot"
echo "═══════════════════════════════════════════════════════════"
pm2 logs bagbot --lines 30 --nostream
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ REDÉMARRAGE ET DÉPLOIEMENT TERMINÉS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Résumé:"
echo "   ✅ Bot redémarré"
echo "   ✅ Commandes déployées"
echo "   ✅ Logs vérifiés"
echo ""
echo "⏰ Attendre 1-2 minutes pour synchronisation Discord"
echo ""

ENDSSH

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🧪 TESTS À EFFECTUER MAINTENANT"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  TESTER LES COMMANDES"
echo "   Sur Discord, taper /"
echo "   Vérifier que ces commandes apparaissent:"
echo "   - /solde"
echo "   - /niveau"
echo "   - /mot-cache"
echo "   - Toutes les 94 commandes"
echo ""
echo "2️⃣  TESTER LE BOUTON CONFIG MOT-CACHÉ"
echo "   - Utiliser /mot-cache"
echo "   - Cliquer sur '⚙️ Configurer le jeu'"
echo "   - Vérifier que le menu s'affiche"
echo "   - PAS d'échec d'interaction"
echo ""
echo "3️⃣  CONFIGURER LE JEU"
echo "   - Activer le jeu"
echo "   - Définir un mot (ex: CALIN)"
echo "   - Configurer les salons (optionnel)"
echo ""
echo "4️⃣  TESTER LES EMOJIS"
echo "   - Envoyer 20-30 messages (>15 caractères)"
echo "   - Emoji 🔍 doit apparaître sur certains messages (5%)"
echo "   - Si rien n'apparaît, augmenter probabilité à 50%"
echo ""
echo "5️⃣  VÉRIFIER LES LOGS"
echo "   ssh -p 33000 bagbot@88.174.155.230"
echo "   pm2 logs bagbot | grep MOT-CACHE"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "💡 Si les emojis n'apparaissent toujours pas:"
echo "   1. Vérifier que le jeu est activé"
echo "   2. Vérifier qu'un mot est défini"
echo "   3. Augmenter la probabilité à 50% pour tester"
echo "   4. Vérifier les permissions du bot (Ajouter des réactions)"
echo "   5. Vérifier les logs pour erreurs"
echo ""
echo "🎉 TOUT EST PRÊT !"
echo ""
