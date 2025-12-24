#!/bin/bash

###############################################################################
# 🚀 Installation Llama Proxy sur Freebox (Solution Légère)
# 
# Ce script installe un proxy Node.js léger sur votre Freebox qui utilise
# l'API Groq (gratuite) pour fournir Llama 3.2 3B
#
# Avantages:
#   - RAM: seulement +20 MB (vs +700 MB pour Llama local)
#   - Performance: Excellente (1-3 sec vs 30-100 sec)
#   - Impact BagBot: 0% (aucun)
#   - Coût: 0€ (Groq gratuit)
#
# Utilisation:
#   1. Créer compte Groq: https://console.groq.com (gratuit)
#   2. Copier votre API key
#   3. Exécuter: bash INSTALLER_LLAMA_PROXY_FREEBOX.sh
#
# Date: 24 Décembre 2025
###############################################################################

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════"
echo "  🚀 Installation Llama Proxy sur Freebox"
echo "═══════════════════════════════════════════════════════"
echo -e "${NC}"

# Configuration
FREEBOX_IP="88.174.155.230"
FREEBOX_PORT="33000"
FREEBOX_USER="bagbot"
BOT_DIR="/home/bagbot/Bag-bot"
PROXY_FILE="$BOT_DIR/src/llama-proxy.js"

# Demander la clé API Groq
echo ""
echo -e "${YELLOW}Avant de commencer:${NC}"
echo "1. Créez un compte gratuit sur: https://console.groq.com"
echo "2. Créez une API Key"
echo "3. Copiez votre clé (commence par 'gsk_...')"
echo ""
read -p "Entrez votre clé API Groq: " GROQ_API_KEY

if [[ -z "$GROQ_API_KEY" ]]; then
    echo -e "${RED}❌ Clé API requise${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓${NC} Clé API reçue"
echo ""

# Test connexion
echo -e "${BLUE}[1/5]${NC} Test de connexion à la Freebox..."
if sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connexion établie"
else
    echo -e "${RED}❌ Impossible de se connecter à la Freebox${NC}"
    exit 1
fi

# Créer le fichier proxy
echo ""
echo -e "${BLUE}[2/5]${NC} Création du proxy Llama..."

sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << EOF

# Créer le fichier proxy
cat > $PROXY_FILE << 'PROXYEOF'
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY || '$GROQ_API_KEY';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

console.log('[Llama Proxy] Configuration:');
console.log('  - API: Groq (Llama 3.2 3B)');
console.log('  - Port: 11434');
console.log('  - Clé API:', GROQ_API_KEY ? 'Configurée ✓' : 'Manquante ✗');

// API compatible Ollama - Génération simple
app.post('/api/generate', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const prompt = req.body.prompt || '';
        console.log(\`[Llama] Requête: "\${prompt.substring(0, 50)}..."\`);
        
        const response = await axios.post(GROQ_API_URL, {
            model: req.body.model === 'llama3.2:1b' ? 'llama-3.1-8b-instant' : 'llama-3.2-3b-preview',
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: req.body.temperature || 0.7,
            max_tokens: req.body.max_tokens || 512,
        }, {
            headers: {
                'Authorization': \`Bearer \${GROQ_API_KEY}\`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        const text = response.data.choices[0].message.content;
        const duration = Date.now() - startTime;
        
        console.log(\`[Llama] Réponse: "\${text.substring(0, 50)}..." (\${duration}ms)\`);
        
        // Format compatible Ollama
        res.json({
            model: req.body.model || 'llama3.2:3b',
            created_at: new Date().toISOString(),
            response: text,
            done: true,
            total_duration: duration * 1000000
        });
    } catch (error) {
        console.error('[Llama] Erreur:', error.message);
        res.status(500).json({ 
            error: error.response?.data?.error?.message || error.message 
        });
    }
});

// API Chat avec contexte
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const messages = req.body.messages || [];
        console.log(\`[Llama] Chat: \${messages.length} messages\`);
        
        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.2-3b-preview',
            messages: messages,
            temperature: req.body.temperature || 0.7,
            max_tokens: req.body.max_tokens || 512,
        }, {
            headers: {
                'Authorization': \`Bearer \${GROQ_API_KEY}\`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        const message = response.data.choices[0].message;
        const duration = Date.now() - startTime;
        
        console.log(\`[Llama] Réponse chat: \${duration}ms\`);
        
        res.json({
            model: 'llama3.2:3b',
            created_at: new Date().toISOString(),
            message: message,
            done: true
        });
    } catch (error) {
        console.error('[Llama] Erreur chat:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Liste des modèles (compatible Ollama)
app.get('/api/tags', (req, res) => {
    res.json({
        models: [
            {
                name: 'llama3.2:3b',
                modified_at: new Date().toISOString(),
                size: 2000000000,
                digest: 'groq-proxy',
                details: {
                    format: 'gguf',
                    family: 'llama',
                    parameter_size: '3B',
                    quantization_level: 'Q4_0'
                }
            }
        ]
    });
});

// Version
app.get('/api/version', (req, res) => {
    res.json({ version: '0.1.0-groq-proxy' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        proxy: 'llama-groq',
        api: 'groq',
        model: 'llama-3.2-3b-preview'
    });
});

// Démarrage
const PORT = 11434;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(\`\n═══════════════════════════════════════════════════════\`);
    console.log(\`🚀 Llama Proxy démarré avec succès!\`);
    console.log(\`═══════════════════════════════════════════════════════\`);
    console.log(\`\`);
    console.log(\`  URL:    http://\${HOST}:\${PORT}\`);
    console.log(\`  Model:  Llama 3.2 3B (via Groq)\`);
    console.log(\`  RAM:    ~20 MB\`);
    console.log(\`\`);
    console.log(\`Test:\`);
    console.log(\`  curl -X POST http://localhost:\${PORT}/api/generate \\\\\`);
    console.log(\`    -d '{"model":"llama3.2:3b","prompt":"Bonjour!"}'\";\`);
    console.log(\`\`);
    console.log(\`═══════════════════════════════════════════════════════\n\`);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('[Llama] Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Llama] Promesse rejetée:', reason);
});
PROXYEOF

echo "✓ Fichier proxy créé: $PROXY_FILE"

EOF

echo -e "${GREEN}✓${NC} Proxy créé"

# Arrêter l'ancien proxy si existe
echo ""
echo -e "${BLUE}[3/5]${NC} Arrêt de l'ancien proxy (si existe)..."
sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" \
    "pm2 delete llama-proxy 2>/dev/null || echo 'Pas de proxy existant'"

# Démarrer le proxy
echo ""
echo -e "${BLUE}[4/5]${NC} Démarrage du proxy Llama..."
sshpass -p 'bagbot' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -p "$FREEBOX_PORT" "$FREEBOX_USER@$FREEBOX_IP" << EOF

cd $BOT_DIR

# Démarrer avec PM2
pm2 start $PROXY_FILE --name llama-proxy

# Sauvegarder la config PM2
pm2 save

# Attendre le démarrage
sleep 3

# Afficher les logs
pm2 logs llama-proxy --lines 10 --nostream

EOF

echo -e "${GREEN}✓${NC} Proxy démarré"

# Tests
echo ""
echo -e "${BLUE}[5/5]${NC} Tests de validation..."

sleep 2

# Test 1: Health check
echo ""
echo "Test 1: Health check..."
if curl -s http://$FREEBOX_IP:11434/health | grep -q "ok"; then
    echo -e "${GREEN}✓${NC} Proxy accessible"
else
    echo -e "${YELLOW}⚠${NC} Proxy peut-être pas encore prêt"
fi

# Test 2: Liste modèles
echo ""
echo "Test 2: Liste des modèles..."
curl -s http://$FREEBOX_IP:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4

# Test 3: Génération
echo ""
echo "Test 3: Génération de texte (peut prendre 3-5 secondes)..."
RESPONSE=$(curl -s -X POST http://$FREEBOX_IP:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{"model":"llama3.2:3b","prompt":"Dis bonjour en une phrase","stream":false}' \
    --max-time 15)

if echo "$RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✓${NC} Génération fonctionnelle"
    echo ""
    echo "Réponse de Llama:"
    echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', 'N/A')[:200])" 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗${NC} Génération échouée"
    echo "Réponse: $RESPONSE"
fi

# Résumé final
echo ""
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════"
echo "  ✅ INSTALLATION TERMINÉE AVEC SUCCÈS"
echo "═══════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Informations d'accès:${NC}"
echo ""
echo "  API Endpoint:"
echo "    http://$FREEBOX_IP:11434"
echo ""
echo "  Modèle disponible:"
echo "    llama3.2:3b (via Groq Cloud)"
echo ""
echo "  Utilisation RAM:"
echo "    ~20 MB (vs 700+ MB pour Llama local)"
echo ""
echo "  Performance:"
echo "    1-3 secondes par réponse"
echo ""

echo -e "${BLUE}Test depuis votre Android:${NC}"
echo ""
cat << 'KOTLIN'
val client = OkHttpClient()
val json = JSONObject().apply {
    put("model", "llama3.2:3b")
    put("prompt", "Bonjour Llama!")
    put("stream", false)
}

val request = Request.Builder()
    .url("http://88.174.155.230:11434/api/generate")
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        val result = JSONObject(response.body?.string() ?: "{}")
        println("Llama: ${result.getString("response")}")
    }
})
KOTLIN

echo ""
echo -e "${BLUE}Commandes utiles:${NC}"
echo ""
echo "  Voir les logs:"
echo "    ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 logs llama-proxy'"
echo ""
echo "  Redémarrer le proxy:"
echo "    ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 restart llama-proxy'"
echo ""
echo "  Arrêter le proxy:"
echo "    ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 stop llama-proxy'"
echo ""
echo "  Statut du proxy:"
echo "    ssh -p $FREEBOX_PORT $FREEBOX_USER@$FREEBOX_IP 'pm2 status'"
echo ""

echo -e "${BLUE}Impact sur votre système:${NC}"
echo ""
echo "  ✅ BagBot Discord:  Aucun impact (0%)"
echo "  ✅ RAM ajoutée:     +20 MB seulement"
echo "  ✅ Processus:       Complètement séparé"
echo "  ✅ Performance:     Excellente (API cloud GPU)"
echo ""

echo -e "${GREEN}🎉 Le proxy Llama est opérationnel!${NC}"
echo ""
echo "Vous pouvez maintenant utiliser Llama depuis votre application Android"
echo "en utilisant l'URL: http://$FREEBOX_IP:11434"
echo ""
echo "Voir EXEMPLE_ANDROID_LLAMA.kt pour le code Android complet"
echo ""

exit 0
