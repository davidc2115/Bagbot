#!/bin/bash
# Script pour mettre à jour le dashboard sur la Freebox

echo "🔄 Mise à jour du dashboard..."

# Se connecter à la Freebox et mettre à jour le fichier
sshpass -p 'bagbot' scp /workspace/dashboard-v2/server-v2.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/dashboard-v2/server-v2.js

if [ $? -eq 0 ]; then
    echo "✅ Fichier copié avec succès"
    
    # Redémarrer le dashboard
    echo "🔄 Redémarrage du dashboard..."
    sshpass -p 'bagbot' ssh bagbot@88.174.155.230 "cd /home/bagbot/Bag-bot && pm2 restart dashboard"
    
    if [ $? -eq 0 ]; then
        echo "✅ Dashboard redémarré avec succès !"
        echo ""
        echo "🌐 Le dashboard est accessible sur : http://88.174.155.230:33000"
        echo ""
        echo "✅ CORRECTIONS APPLIQUÉES :"
        echo "   - Affichage de TOUS les comptes economy (pas seulement les membres actuels)"
        echo "   - Vous verrez maintenant les ~400 comptes"
        echo "   - Les pseudos seront affichés dès que le bot Discord est connecté"
    else
        echo "❌ Erreur lors du redémarrage"
    fi
else
    echo "❌ Erreur lors de la copie du fichier"
    echo "   Raison probable : connexion SSH impossible"
fi
