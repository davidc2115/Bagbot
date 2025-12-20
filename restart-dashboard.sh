#!/bin/bash

echo "🔄 Redémarrage du serveur Dashboard V2..."

# Trouver et tuer le processus existant
PID=$(lsof -ti:33002)
if [ ! -z "$PID" ]; then
    echo "⏹️  Arrêt du processus existant (PID: $PID)..."
    kill -9 $PID 2>/dev/null || true
    sleep 2
fi

# Démarrer le nouveau serveur
cd /workspace/dashboard-v2
echo "▶️  Démarrage du serveur..."
nohup node server-v2.js > /tmp/dashboard-v2.log 2>&1 &

NEW_PID=$!
echo "✅ Serveur démarré (PID: $NEW_PID)"
echo "📝 Logs: /tmp/dashboard-v2.log"

# Attendre 3 secondes
sleep 3

# Vérifier que le serveur répond
if curl -s http://localhost:33002 > /dev/null; then
    echo "✅ Serveur accessible sur http://localhost:33002"
else
    echo "❌ Serveur ne répond pas"
    echo "📋 Dernières lignes du log:"
    tail -20 /tmp/dashboard-v2.log
fi
