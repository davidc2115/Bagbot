#!/bin/bash

###############################################################################
# 🚀 Commandes Rapides: Déploiement Llama sur Oracle Cloud
#
# Ce fichier contient toutes les commandes nécessaires pour déployer
# rapidement Llama sur Oracle Cloud depuis votre machine locale
#
# Date: 24 Décembre 2025
###############################################################################

# ============================================================================
# ÉTAPE 1: CRÉER VM ORACLE CLOUD (depuis l'interface web)
# ============================================================================
# 1. Aller sur: https://cloud.oracle.com/free
# 2. Créer compte (gratuit, carte requise mais non débitée)
# 3. Console → Compute → Instances → Create Instance
# 4. Configuration:
#    - Shape: VM.Standard.A1.Flex
#    - OCPU: 4
#    - Memory: 24 GB
#    - Image: Ubuntu 22.04 ARM
#    - Generate SSH key pair (télécharger la clé)
# 5. Noter l'IP publique: ___________________

# ============================================================================
# ÉTAPE 2: CONFIGURER SECURITY LIST (depuis l'interface web)
# ============================================================================
# Console → Networking → VCN → Security Lists → Default
# → Ingress Rules → Add:
#    Source CIDR: 0.0.0.0/0
#    Protocol: TCP
#    Port: 11434

# ============================================================================
# ÉTAPE 3: VARIABLES À CONFIGURER
# ============================================================================

# ⚠️ IMPORTANT: Remplacez ces valeurs par les vôtres
ORACLE_VM_IP="YOUR-ORACLE-VM-IP"           # IP publique de votre VM Oracle
SSH_KEY_PATH="~/Downloads/ssh-key.key"     # Chemin vers votre clé SSH privée
LLAMA_MODEL="llama3.2:3b"                  # Modèle à installer (1b, 3b, 8b)

# ============================================================================
# ÉTAPE 4: TEST DE CONNEXION SSH
# ============================================================================

echo "🔍 Test de connexion à la VM Oracle Cloud..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$ORACLE_VM_IP "echo 'Connexion réussie!'" || {
    echo "❌ Erreur de connexion"
    echo "Vérifiez:"
    echo "  1. IP correcte: $ORACLE_VM_IP"
    echo "  2. Clé SSH correcte: $SSH_KEY_PATH"
    echo "  3. Permissions clé: chmod 600 $SSH_KEY_PATH"
    exit 1
}

# ============================================================================
# ÉTAPE 5: COPIER LE SCRIPT D'INSTALLATION SUR LA VM
# ============================================================================

echo "📤 Copie du script d'installation sur la VM..."
scp -i "$SSH_KEY_PATH" INSTALL_LLAMA_ORACLE_CLOUD.sh ubuntu@$ORACLE_VM_IP:~/

# ============================================================================
# ÉTAPE 6: EXÉCUTER L'INSTALLATION
# ============================================================================

echo "🚀 Lancement de l'installation d'Ollama + Llama..."
ssh -i "$SSH_KEY_PATH" ubuntu@$ORACLE_VM_IP << 'REMOTE_INSTALL'

# Rendre le script exécutable
chmod +x ~/INSTALL_LLAMA_ORACLE_CLOUD.sh

# Exécuter l'installation (prend 5-10 minutes)
bash ~/INSTALL_LLAMA_ORACLE_CLOUD.sh

REMOTE_INSTALL

# ============================================================================
# ÉTAPE 7: TESTS DE VALIDATION
# ============================================================================

echo ""
echo "🧪 Tests de validation..."
echo ""

# Test 1: Vérifier si Ollama est accessible
echo "Test 1: API Ollama..."
if curl -s http://$ORACLE_VM_IP:11434/api/tags > /dev/null; then
    echo "✅ API Ollama accessible"
else
    echo "❌ API Ollama non accessible"
    echo "   Vérifiez les Security Lists Oracle Cloud"
fi

# Test 2: Liste des modèles
echo ""
echo "Test 2: Modèles installés..."
curl -s http://$ORACLE_VM_IP:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4

# Test 3: Génération de texte
echo ""
echo "Test 3: Génération de texte..."
RESPONSE=$(curl -s -X POST http://$ORACLE_VM_IP:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"$LLAMA_MODEL\", \"prompt\": \"Bonjour!\", \"stream\": false}")

if echo "$RESPONSE" | grep -q "response"; then
    echo "✅ Génération de texte fonctionnelle"
    echo ""
    echo "Réponse de Llama:"
    echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', 'N/A')[:200])" 2>/dev/null
else
    echo "❌ Génération de texte échouée"
fi

# ============================================================================
# ÉTAPE 8: AFFICHER LES INFORMATIONS D'ACCÈS
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🎉 INSTALLATION TERMINÉE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📡 API Endpoint:"
echo "   http://$ORACLE_VM_IP:11434"
echo ""
echo "🤖 Modèle actif:"
echo "   $LLAMA_MODEL"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📱 Code Android (Kotlin)"
echo "═══════════════════════════════════════════════════════"
echo ""
cat << KOTLIN_CODE
val client = OkHttpClient()
val json = JSONObject().apply {
    put("model", "$LLAMA_MODEL")
    put("prompt", "Votre question")
    put("stream", false)
}

val request = Request.Builder()
    .url("http://$ORACLE_VM_IP:11434/api/generate")
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val result = JSONObject(response.body?.string() ?: "{}")
        val text = result.getString("response")
        println("Llama: \$text")
    }
    override fun onFailure(call: Call, e: IOException) {
        e.printStackTrace()
    }
})
KOTLIN_CODE

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔧 Commandes Utiles"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Se connecter à la VM:"
echo "  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP"
echo ""
echo "Redémarrer Ollama:"
echo "  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP 'sudo systemctl restart ollama'"
echo ""
echo "Voir les logs:"
echo "  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP 'sudo journalctl -u ollama -f'"
echo ""
echo "Liste des modèles:"
echo "  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP 'ollama list'"
echo ""
echo "Télécharger un autre modèle:"
echo "  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP 'ollama pull llama3.2:8b'"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✅ Tout est prêt pour votre application Android!"
echo "📄 Voir EXEMPLE_ANDROID_LLAMA.kt pour le code complet"
echo ""

# ============================================================================
# COMMANDES BONUS
# ============================================================================

cat << 'EOF' > /tmp/llama_commands.txt

═══════════════════════════════════════════════════════════
🛠️  COMMANDES BONUS
═══════════════════════════════════════════════════════════

# Monitorer les ressources de la VM
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'htop'

# Vérifier l'espace disque
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'df -h'

# Vérifier la RAM disponible
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'free -h'

# Tester depuis terminal local
curl -X POST http://VOTRE-IP:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Écris un poème court sur l IA",
    "stream": false
  }'

# Chat interactif (depuis la VM)
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'ollama run llama3.2:3b'

# Télécharger tous les modèles Llama 3.2
ssh -i VOTRE-CLE ubuntu@VOTRE-IP << 'MODELS'
ollama pull llama3.2:1b
ollama pull llama3.2:3b
ollama pull llama3:8b
MODELS

# Vérifier version d'Ollama
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'ollama --version'

# Redémarrer la VM (si nécessaire)
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'sudo reboot'

═══════════════════════════════════════════════════════════
🐛 DÉPANNAGE
═══════════════════════════════════════════════════════════

# Si "Connection refused" depuis Internet:
# → Vérifier Security Lists Oracle Cloud (port 11434 ouvert)

# Si Ollama ne démarre pas:
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'sudo systemctl status ollama'
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'sudo journalctl -u ollama -n 50'

# Si "Out of memory":
# → Utiliser un modèle plus petit (1b au lieu de 3b)
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'ollama pull llama3.2:1b'

# Si génération très lente:
# → Vérifier que vous utilisez bien 4 CPU (pas 1 ou 2)
ssh -i VOTRE-CLE ubuntu@VOTRE-IP 'nproc'

═══════════════════════════════════════════════════════════
📚 DOCUMENTATION
═══════════════════════════════════════════════════════════

Ollama API:
  https://github.com/ollama/ollama/blob/main/docs/api.md

Modèles disponibles:
  https://ollama.com/library

Oracle Cloud:
  https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm

═══════════════════════════════════════════════════════════

EOF

echo "📄 Commandes bonus sauvegardées dans: /tmp/llama_commands.txt"
echo ""

# ============================================================================
# SAUVEGARDE DES INFORMATIONS
# ============================================================================

cat > /tmp/llama_oracle_info.txt << INFO
═══════════════════════════════════════════════════════════
INFORMATIONS INSTALLATION LLAMA SUR ORACLE CLOUD
═══════════════════════════════════════════════════════════

Date Installation: $(date)

VM Oracle Cloud:
  IP Publique:     $ORACLE_VM_IP
  SSH Key:         $SSH_KEY_PATH
  User:            ubuntu

Ollama:
  API Endpoint:    http://$ORACLE_VM_IP:11434
  Modèle:          $LLAMA_MODEL
  Port:            11434

Tests:
  curl http://$ORACLE_VM_IP:11434/api/tags
  curl -X POST http://$ORACLE_VM_IP:11434/api/generate \\
    -d '{"model":"$LLAMA_MODEL","prompt":"Hello!","stream":false}'

Connexion SSH:
  ssh -i $SSH_KEY_PATH ubuntu@$ORACLE_VM_IP

Fichiers Utiles:
  - ANALYSE_LLAMA_FREEBOX_VM.md
  - INSTALL_LLAMA_ORACLE_CLOUD.sh
  - EXEMPLE_ANDROID_LLAMA.kt
  - GUIDE_DEMARRAGE_RAPIDE_LLAMA.md
  - REPONSE_FINALE_LLAMA_FREEBOX.md
  - COMMANDES_RAPIDES_LLAMA.sh (ce fichier)

═══════════════════════════════════════════════════════════
INFO

echo "💾 Informations sauvegardées dans: /tmp/llama_oracle_info.txt"
echo ""
echo "✅ Installation terminée avec succès!"
echo ""
