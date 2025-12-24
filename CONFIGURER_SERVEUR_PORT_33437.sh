#!/bin/bash
# Script à exécuter sur la Freebox pour configurer Ollama sur port 33437

echo "════════════════════════════════════════════════════════════════"
echo "🔧 CONFIGURATION OLLAMA SUR PORT 33437"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "⚠️ IMPORTANT: Ce script doit être exécuté SUR LA FREEBOX"
echo ""
echo "Connexion requise: ssh root@88.174.155.230"
echo "Mot de passe: root bagbot"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Arrêt d'Ollama
echo "1️⃣ Arrêt d'Ollama..."
systemctl stop ollama
sleep 2

# Configuration du port 33437
echo "2️⃣ Configuration pour le port 33437..."
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:33437"
EOF

# Rechargement
echo "3️⃣ Rechargement systemd..."
systemctl daemon-reload

# Démarrage
echo "4️⃣ Démarrage d'Ollama sur port 33437..."
systemctl start ollama
sleep 3

# Activation au boot
echo "5️⃣ Activation au démarrage..."
systemctl enable ollama

# Vérifications
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 VÉRIFICATIONS"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "6️⃣ Status d'Ollama:"
systemctl status ollama | head -15
echo ""

echo "7️⃣ Port 33437 ouvert:"
netstat -tlnp | grep 33437
echo ""

echo "8️⃣ Test API locale:"
curl -s http://localhost:33437/api/tags
echo ""
echo ""

echo "9️⃣ Test API externe (depuis internet):"
echo "   Teste depuis ton téléphone ou un autre PC:"
echo "   curl http://88.174.155.230:33437/api/tags"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ CONFIGURATION TERMINÉE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Si le port 33437 est visible dans netstat, c'est bon!"
echo "L'application Android pourra se connecter."
echo ""
