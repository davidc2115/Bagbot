# 🔍 Analyse: Installer Llama sur la MÊME VM Freebox

**Date:** 24 Décembre 2025  
**Question révisée:** Est-il possible d'installer Llama sur la même VM Freebox que le bot Discord, mais avec des processus complètement séparés (pas d'interaction) ?

---

## 📊 Ressources Actuelles de la Freebox

### Mémoire Disponible

```
RAM Physique:
  Total:        964 MB
  Utilisée:     403 MB
  Libre:        48 MB
  Disponible:   560 MB

SWAP:
  Total:        1.0 GB (1,048 MB)
  Utilisé:      524 KB
  Disponible:   1,048 MB

TOTAL MÉMOIRE VIRTUELLE:
  RAM + SWAP:   ~2,012 MB (2 GB)
```

### Consommation Actuelle

| Application | RAM | % |
|-------------|-----|---|
| Bot Discord | 156 MB | 15.7% |
| API Server | 97 MB | 9.8% |
| Dashboard | 66 MB | 6.7% |
| PM2 | 69 MB | 7.0% |
| Système | 15 MB | 1.5% |
| **TOTAL** | **403 MB** | **40.7%** |
| **Disponible** | **560 MB** | **59.3%** |

---

## 🤔 Faisabilité Technique

### Option 1: Modèle Ultra-Léger (TinyLlama)

**TinyLlama 1.1B:**
- Taille du modèle: ~600 MB
- RAM nécessaire en fonctionnement: 800-1,000 MB
- RAM disponible actuellement: 560 MB

**Calcul avec TinyLlama:**
```
État actuel:
  BagBot + Services:    403 MB
  Système:              ~50 MB
  TinyLlama:            800 MB (minimum)
  ─────────────────────────────
  TOTAL BESOIN:       1,253 MB

Disponible:
  RAM:                  964 MB
  DÉFICIT:             -289 MB

Avec SWAP (1 GB):
  RAM + SWAP:         2,012 MB
  MARGE:              +759 MB  ✅ Techniquement possible
```

**VERDICT: Techniquement POSSIBLE avec SWAP**

### ⚠️ MAIS avec des Conséquences Importantes

#### 1. Performance Catastrophique

**Sans swap (impossible):**
- RAM insuffisante → Crash immédiat

**Avec swap (possible mais très lent):**
- Modèle chargé partiellement en RAM, partiellement sur disque
- Chaque génération de texte = lecture/écriture disque intensive
- **Performance attendue:** 0.5-2 tokens/seconde (vs 50-100 sur serveur dédié)
- **Temps de réponse:** 30-120 secondes pour 100 tokens
- **Expérience utilisateur:** Inacceptable pour une app mobile

#### 2. Impact sur BagBot Discord

**Scénario d'utilisation simultanée:**

```
Utilisateur utilise l'app Android → Llama génère du texte
   ↓
Llama lit/écrit massivement sur le swap (disque)
   ↓
I/O disque saturée (SSD/eMMC limité)
   ↓
BagBot Discord ralenti (base de données, logs, etc.)
   ↓
Latence Discord augmente: 50ms → 500ms+
   ↓
Expérience utilisateurs Discord dégradée
```

**Impact estimé:**
- Latence BagBot: +300-500ms pendant génération Llama
- Risque timeout Discord si génération longue
- Dashboard web ralenti
- Logs et backups ralentis

#### 3. Stabilité du Système

**Problèmes potentiels:**

1. **OOM Killer** (Out Of Memory Killer)
   - Si la RAM+SWAP est dépassée, Linux tue des processus
   - Risque: BagBot ou Llama tué aléatoirement

2. **Swap Thrashing**
   - Swap utilisé massivement = usure du disque
   - Performance système globale très dégradée

3. **Blocages système**
   - I/O disque saturée = système figé pendant 5-10 secondes
   - SSH peut devenir inaccessible temporairement

---

## ✅ Solutions Possibles sur la MÊME VM

### Solution A: TinyLlama avec Limitations Strictes (COMPROMIS)

**Installation:**
- Modèle: TinyLlama 1.1B (le plus petit possible)
- Backend: llama.cpp (plus économe qu'Ollama)
- Configuration: Mode "low memory" + quantization 4-bit
- Limite: 1 seule requête à la fois (file d'attente)

**Configuration technique:**
```bash
# Installer llama.cpp au lieu d'Ollama (plus léger)
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make -j2

# Télécharger TinyLlama quantized (4-bit)
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

# Serveur API avec limitations
./server \
  --model tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf \
  --ctx-size 512 \           # Contexte réduit
  --threads 1 \              # 1 seul thread (laisser 1 CPU pour BagBot)
  --parallel 1 \             # 1 seule requête à la fois
  --port 11434 \
  --host 0.0.0.0
```

**Résultats attendus:**

| Métrique | Valeur |
|----------|--------|
| RAM utilisée | ~700-900 MB |
| SWAP utilisée | ~200-400 MB |
| Performance | 1-3 tokens/sec |
| Temps réponse (100 tok) | 30-100 secondes |
| Impact BagBot | Moyen (+200ms latence) |
| Qualité réponses | ⭐⭐ (correcte mais basique) |

**Avantages:**
- ✅ Sur la même VM (pas de serveur externe)
- ✅ Processus complètement séparés
- ✅ Coût: 0€
- ✅ Pas de configuration réseau externe

**Inconvénients:**
- ❌ Performance très médiocre (30-100 sec par réponse)
- ❌ Impact sur BagBot (latence +200ms)
- ❌ Qualité des réponses limitée (petit modèle)
- ❌ Une seule requête à la fois
- ❌ Expérience utilisateur dégradée

**Verdict:** **POSSIBLE TECHNIQUEMENT mais PEU RECOMMANDÉ**

---

### Solution B: API Cloud Légère (HYBRIDE)

**Concept:** Garder tout sur la Freebox, mais utiliser une API cloud pour l'inférence

**Architecture:**
```
[Freebox VM]
  ├─ BagBot Discord (intact)
  ├─ API Server (intact)
  ├─ Dashboard (intact)
  └─ Proxy API Llama (nouveau, ~20 MB RAM)
       ↓ (appelle via Internet)
[API Cloud Gratuite]
  └─ Groq / OpenRouter / Together AI
       └─ Llama 3.2 3B/8B (rapide)
```

**Implémentation sur Freebox:**
```javascript
// /home/bagbot/Bag-bot/src/llama-proxy.js (nouveau fichier)
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY; // API gratuite

app.post('/api/generate', async (req, res) => {
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.2-3b-preview',
            messages: [{ role: 'user', content: req.body.prompt }],
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
        });
        
        res.json({ response: response.data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(11434, '0.0.0.0');
```

**Démarrer le proxy:**
```bash
# Sur Freebox
cd /home/bagbot/Bag-bot
GROQ_API_KEY="votre-clé-gratuite" pm2 start src/llama-proxy.js --name llama-proxy
```

**Résultats attendus:**

| Métrique | Valeur |
|----------|--------|
| RAM utilisée Freebox | +20 MB (proxy Node.js) |
| SWAP utilisée | 0 MB |
| Performance | 50-200 tokens/sec (API cloud) |
| Temps réponse (100 tok) | 1-3 secondes |
| Impact BagBot | Aucun (<1ms) |
| Qualité réponses | ⭐⭐⭐⭐⭐ (Llama 3.2 3B/8B) |
| Coût | 0€ (Groq gratuit: 30 req/min) |

**Avantages:**
- ✅ RAM minimal sur Freebox (+20 MB seulement)
- ✅ Performance excellente (API cloud GPU)
- ✅ Aucun impact sur BagBot
- ✅ Processus séparés
- ✅ Qualité maximale (grand modèle)
- ✅ Sur la même VM (le proxy)

**Inconvénients:**
- ⚠️ Dépendance à Internet
- ⚠️ Dépendance à service externe (Groq)
- ⚠️ Limite: 30 requêtes/minute (gratuit)

**Verdict:** **RECOMMANDÉ** - Meilleur compromis

---

### Solution C: GPT4All (Alternative Plus Légère)

**GPT4All** est une alternative à Ollama, plus économe en mémoire.

**Modèles compatibles:**
- GPT4All Mini: ~400 MB RAM
- Performance: ~2-5 tokens/sec
- Qualité: Correcte pour usage basique

**Installation:**
```bash
# Sur Freebox
pip install gpt4all

# Serveur Python simple
python3 << 'EOF'
from gpt4all import GPT4All
from flask import Flask, request, jsonify

app = Flask(__name__)
model = GPT4All("orca-mini-3b.ggmlv3.q4_0.bin")  # ~400 MB

@app.route('/api/generate', methods=['POST'])
def generate():
    prompt = request.json['prompt']
    response = model.generate(prompt, max_tokens=100)
    return jsonify({'response': response})

app.run(host='0.0.0.0', port=11434)
EOF
```

**Résultats attendus:**

| Métrique | Valeur |
|----------|--------|
| RAM utilisée | ~500-600 MB |
| SWAP utilisée | ~100-200 MB |
| Performance | 2-5 tokens/sec |
| Temps réponse (100 tok) | 20-50 secondes |
| Impact BagBot | Faible (+50-100ms) |
| Qualité réponses | ⭐⭐⭐ (correcte) |

**Verdict:** **COMPROMIS ACCEPTABLE**

---

## 📊 Tableau Comparatif des Solutions

| Solution | RAM | Impact BagBot | Performance | Qualité | Difficulté | Recommandé |
|----------|-----|---------------|-------------|---------|------------|------------|
| **A. TinyLlama local** | 700 MB | ❌ Moyen | ❌ Très lent | ⭐⭐ | ⭐⭐⭐ | ❌ Non |
| **B. Proxy API Cloud** | 20 MB | ✅ Aucun | ✅ Excellent | ⭐⭐⭐⭐⭐ | ⭐ | ✅✅✅ Oui |
| **C. GPT4All** | 500 MB | ⚠️ Faible | ⚠️ Moyen | ⭐⭐⭐ | ⭐⭐ | ✅ Oui |
| **D. Oracle Cloud** | 0 MB | ✅ Aucun | ✅ Excellent | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅✅ Oui |

---

## 🎯 Ma Recommandation Finale

### Pour la MÊME VM Freebox: Solution B (Proxy API Cloud)

**Pourquoi:**
1. ✅ **RAM minimale** (+20 MB vs +700 MB)
2. ✅ **Aucun impact** sur BagBot Discord
3. ✅ **Performance excellente** (API cloud GPU)
4. ✅ **Qualité maximale** (Llama 3.2 3B/8B)
5. ✅ **Sur la même VM** (le proxy tourne sur Freebox)
6. ✅ **Gratuit** (Groq Free Tier: 30 req/min)

**Architecture:**
```
Application Android
       ↓ HTTP
Freebox:11434 (Proxy Node.js - 20 MB RAM)
       ↓ API
Groq Cloud (Llama 3.2 3B - GPU rapide)
       ↓
Réponse en 1-3 secondes
```

**Code complet prêt à déployer ci-dessous** ↓

---

## 💻 Installation Solution B (Proxy API - RECOMMANDÉ)

### Étape 1: Créer compte Groq (gratuit)

1. Aller sur: https://console.groq.com
2. S'inscrire (gratuit)
3. Créer une API Key
4. Noter la clé: `gsk_...`

### Étape 2: Créer le proxy sur Freebox

```bash
# Se connecter à la Freebox
ssh -p 33000 bagbot@88.174.155.230

# Créer le fichier proxy
cat > /home/bagbot/Bag-bot/src/llama-proxy.js << 'EOF'
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'VOTRE-CLE-ICI';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// API compatible Ollama
app.post('/api/generate', async (req, res) => {
    try {
        console.log(`[Llama Proxy] Requête: ${req.body.prompt?.substring(0, 50)}...`);
        
        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.2-3b-preview',
            messages: [{
                role: 'user',
                content: req.body.prompt
            }],
            temperature: req.body.temperature || 0.7,
            max_tokens: req.body.max_tokens || 512,
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const text = response.data.choices[0].message.content;
        console.log(`[Llama Proxy] Réponse: ${text.substring(0, 50)}...`);
        
        // Format compatible Ollama
        res.json({
            model: 'llama3.2:3b',
            response: text,
            done: true
        });
    } catch (error) {
        console.error('[Llama Proxy] Erreur:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API chat (optionnel)
app.post('/api/chat', async (req, res) => {
    try {
        const response = await axios.post(GROQ_API_URL, {
            model: 'llama-3.2-3b-preview',
            messages: req.body.messages,
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
        });
        
        res.json({
            message: response.data.choices[0].message,
            done: true
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/tags', (req, res) => {
    res.json({
        models: [{
            name: 'llama3.2:3b',
            size: 2000000000,
            modified_at: new Date().toISOString()
        }]
    });
});

const PORT = 11434;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Llama Proxy] Démarré sur port ${PORT}`);
    console.log(`[Llama Proxy] Utilisant Groq API (Llama 3.2 3B)`);
});
EOF
```

### Étape 3: Démarrer le proxy

```bash
cd /home/bagbot/Bag-bot

# Option 1: Avec variable d'environnement
GROQ_API_KEY="gsk_VOTRE_CLE_ICI" pm2 start src/llama-proxy.js --name llama-proxy

# Option 2: Éditer le fichier pour mettre la clé directement
nano src/llama-proxy.js  # Remplacer VOTRE-CLE-ICI
pm2 start src/llama-proxy.js --name llama-proxy

# Sauvegarder la config PM2
pm2 save
```

### Étape 4: Tester

```bash
# Test depuis Freebox
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","prompt":"Bonjour!","stream":false}'

# Test depuis Internet (votre PC/téléphone)
curl -X POST http://88.174.155.230:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","prompt":"Bonjour!","stream":false}'
```

### Étape 5: Utiliser depuis Android

**Le code reste identique** à `EXEMPLE_ANDROID_LLAMA.kt`:
```kotlin
val llama = OllamaClient("http://88.174.155.230:11434")
llama.generate("Question") { response ->
    println("Llama: $response")
}
```

---

## ✅ Résultat Final

**Avec Solution B (Proxy API):**

```
Freebox VM (88.174.155.230):
├─ BagBot Discord:    156 MB  ✅ Intact
├─ API Server:        97 MB   ✅ Intact
├─ Dashboard:         66 MB   ✅ Intact
├─ PM2:               69 MB   ✅ Intact
└─ Llama Proxy:       +20 MB  ✅ Nouveau (Node.js)
   ────────────────────────
   TOTAL:             408 MB  ✅ OK (556 MB libres)

Performance:
  Latence:            1-3 secondes
  Qualité:            Excellente (Llama 3.2 3B)
  Impact BagBot:      0% (aucun)
  Coût:               0€
```

**Tout sur la même VM, processus complètement séparés, impact minimal!**

---

## 📝 Réponse à Votre Question

### ❓ Est-ce possible d'installer Llama sur la même VM Freebox ?

**OUI, avec 3 options:**

| Option | Faisable | Impact RAM | Impact BagBot | Performance | Recommandé |
|--------|----------|------------|---------------|-------------|------------|
| **TinyLlama local** | ✅ Oui | +700 MB | ❌ Moyen | ❌ Très lent | ❌ Non |
| **Proxy API Cloud** | ✅ Oui | +20 MB | ✅ Aucun | ✅ Excellent | ✅✅✅ Oui |
| **GPT4All** | ✅ Oui | +500 MB | ⚠️ Faible | ⚠️ Moyen | ✅ Acceptable |

### 🎯 Ma Recommandation

**Solution B: Proxy API Cloud (Groq)**

**Pourquoi:**
- ✅ Sur la même VM Freebox (processus proxy)
- ✅ RAM minimale (+20 MB seulement)
- ✅ Aucun impact sur BagBot
- ✅ Performance excellente (1-3 sec)
- ✅ Qualité maximale (Llama 3.2 3B)
- ✅ Gratuit (Groq Free Tier)
- ✅ Code fourni et prêt à déployer

**Installation:** 10 minutes (voir ci-dessus)

---

**Voulez-vous que je vous aide à installer le proxy sur votre Freebox maintenant ?**
