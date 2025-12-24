# 📊 Analyse: Installation Llama sur Freebox VM

**Date:** 24 Décembre 2025  
**Objectif:** Évaluer la possibilité d'installer Llama sur une VM séparée pour une application Android

---

## 🔍 État Actuel de l'Infrastructure

### Configuration Matérielle de votre Freebox

```
Système:     Debian 13 (Trixie) - Linux 6.12.41
Architecture: ARM64 (aarch64) - Cortex-A72
CPU:         2 cœurs Cortex-A72
RAM:         964 MB (0.94 GB)
  - Utilisée:  394 MB
  - Libre:     53 MB
  - Disponible: 569 MB
Disque:      29 GB total
  - Utilisé:   6.2 GB
  - Disponible: 22 GB
```

### Consommation Actuelle des Ressources

**Applications en cours:**

| Application | RAM utilisée | % RAM |
|-------------|--------------|-------|
| Bot Discord (Node.js) | 153 MB | 15.5% |
| API Server (Node.js) | 95 MB | 9.6% |
| Dashboard v2 (Node.js) | 65 MB | 6.5% |
| PM2 (Gestionnaire) | 69 MB | 7.0% |
| **TOTAL BagBot** | **~382 MB** | **~38%** |

**RAM restante disponible:** ~569 MB

### Virtualisation Disponible

❌ **Docker:** Non installé  
❌ **LXC/LXD:** Non installé  
❌ **KVM:** Non disponible (pas de support matériel sur cette VM ARM)  
❌ **/dev/kvm:** Non présent

---

## 🤖 Exigences des Modèles Llama

### RAM Requise par Modèle

| Modèle | Taille | RAM Minimum | RAM Recommandée |
|--------|--------|-------------|-----------------|
| Llama 3.2 1B (quantized 4-bit) | 0.6 GB | 1-2 GB | 2-3 GB |
| Llama 3.2 1B (full precision) | 1 GB | 2-3 GB | 4 GB |
| Llama 3.2 3B (quantized 4-bit) | 2 GB | 3-4 GB | 6 GB |
| Llama 3.2 3B (full precision) | 3 GB | 4-6 GB | 8 GB |
| Llama 3 8B (quantized 4-bit) | 4.5 GB | 6-8 GB | 12 GB |
| Llama 3 8B (full precision) | 8 GB | 10-16 GB | 24 GB |

### Performance CPU

- **Architecture ARM64** est supportée par llama.cpp et Ollama
- **2 cœurs Cortex-A72** : Performance très limitée
  - Inférence Llama 1B: ~3-5 tokens/seconde (très lent)
  - Inférence Llama 3B: ~1-2 tokens/seconde (extrêmement lent)

---

## ⚠️ Analyse de Faisabilité

### ❌ PROBLÈME 1: RAM Insuffisante

**Situation actuelle:**
- RAM disponible: 569 MB
- RAM nécessaire minimum (Llama 1B quantized): 1-2 GB
- **DÉFICIT: -500 MB à -1500 MB**

**Conséquences:**
- Impossible de charger même le plus petit modèle Llama sans swap intensif
- Avec swap, performance catastrophique (disk I/O au lieu de RAM)
- Risque de crash du système / OOM Killer

### ❌ PROBLÈME 2: CPU Trop Limité

**Performance estimée:**
- Llama 1B quantized sur 2 cœurs ARM Cortex-A72: **~2-4 tokens/seconde**
- Pour générer une réponse de 100 tokens: **25-50 secondes**
- Expérience utilisateur très dégradée pour une application Android

### ❌ PROBLÈME 3: Isolation VM

**Options de virtualisation:**

1. **Docker:** 
   - ✅ Installation possible
   - ⚠️ Overhead mémoire: +50-100 MB
   - ❌ Pas assez de RAM restante

2. **LXC/LXD:**
   - ✅ Installation possible  
   - ⚠️ Overhead mémoire: +30-50 MB
   - ❌ Pas assez de RAM restante

3. **VM complète (KVM/QEMU):**
   - ❌ /dev/kvm non disponible sur cette VM
   - ❌ Émulation pure QEMU: overhead énorme
   - ❌ Impossible sur cette infrastructure

### ⚠️ PROBLÈME 4: Cohabitation avec BagBot

**Scénario "minimum viable":**
```
Bot Discord:    153 MB
API Server:      95 MB  
Dashboard:       65 MB
PM2:             69 MB
Docker/LXC:      50 MB
Llama 1B:     1,500 MB
Système:        200 MB
────────────────────────
TOTAL:        2,132 MB (2.08 GB)

RAM disponible:  964 MB (0.94 GB)
DÉFICIT:      -1,168 MB (-1.14 GB)
```

**Conclusion:** Impossible sans upgrade matériel

---

## ✅ Solutions Alternatives

### Solution 1: Serveur Cloud Dédié (RECOMMANDÉ)

**Architecture:**
```
┌─────────────────────┐
│  Freebox VM         │
│  - BagBot Discord   │
│  - API Server       │
│  - Dashboard        │
└─────────────────────┘
          ↓ HTTP/API
┌─────────────────────┐
│  VPS Cloud (ARM/x64)│
│  - Ollama + Llama   │
│  - API REST         │
│  - 4+ GB RAM        │
└─────────────────────┘
          ↓ HTTP/API
┌─────────────────────┐
│  Application Android│
│  - Requêtes Llama   │
└─────────────────────┘
```

**Avantages:**
- ✅ Séparation totale (différent serveur)
- ✅ Ressources dédiées pour Llama
- ✅ Performance optimale
- ✅ Scaling possible (upgrade facile)
- ✅ Pas d'impact sur BagBot

**Fournisseurs recommandés (ARM64 ou x64):**
1. **Hetzner Cloud** (Allemagne)
   - CX22: 2 vCPU, 4 GB RAM, €5.83/mois
   - CX32: 4 vCPU, 8 GB RAM, €11.66/mois
   
2. **Oracle Cloud** (FREE TIER)
   - VM.Standard.A1.Flex: 4 CPU ARM, 24 GB RAM GRATUIT!
   - Parfait pour Llama 8B
   
3. **DigitalOcean**
   - Droplet 4 GB: 2 vCPU, 4 GB RAM, $24/mois
   
4. **Scaleway** (France)
   - DEV1-M: 3 vCPU, 4 GB RAM, €8.99/mois

**Stack technique:**
```bash
# Installation sur VPS
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:1b    # ou 3b, 8b selon RAM
ollama serve               # API sur port 11434

# Depuis application Android
POST http://VOTRE-VPS-IP:11434/api/generate
{
  "model": "llama3.2:1b",
  "prompt": "Question utilisateur",
  "stream": false
}
```

---

### Solution 2: Héberger sur PC Local

**Architecture:**
```
┌─────────────────────┐
│  PC Windows/Linux   │
│  - Ollama + Llama   │
│  - API REST         │
│  - 8+ GB RAM        │
└─────────────────────┘
          ↓ Exposé via ngrok/CloudFlare Tunnel
┌─────────────────────┐
│  Application Android│
│  - Requêtes Llama   │
└─────────────────────┘
```

**Avantages:**
- ✅ Gratuit (utilise votre PC existant)
- ✅ Performance maximale (CPU/GPU local)
- ✅ Aucun coût mensuel
- ⚠️ PC doit rester allumé
- ⚠️ Configuration réseau (tunnel)

**Installation:**
```bash
# Sur PC Windows
winget install Ollama.Ollama
ollama pull llama3.2:3b

# Sur PC Linux
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b

# Exposer via tunnel (Cloudflare)
cloudflared tunnel --url http://localhost:11434
# Donne une URL publique: https://xxx.trycloudflare.com
```

---

### Solution 3: Service LLM Cloud (API Tierce)

**Providers avec API:**

1. **OpenRouter** (https://openrouter.ai)
   - Accès Llama 3.2 1B/3B/8B
   - Pay-per-token: ~$0.10 per 1M tokens
   - Pas d'infrastructure à gérer

2. **Groq** (https://groq.com)
   - Llama 3.2 gratuit (limite: 30 req/min)
   - Ultra-rapide (500+ tokens/sec)
   - API simple

3. **Together AI** (https://together.ai)
   - Llama 3.2 disponible
   - Free tier: $5 crédit gratuit
   - Performance élevée

**Exemple code Android:**
```kotlin
// Utiliser Groq API
val client = OkHttpClient()
val json = JSONObject().apply {
    put("model", "llama-3.2-1b-preview")
    put("messages", JSONArray().put(
        JSONObject().apply {
            put("role", "user")
            put("content", "Question utilisateur")
        }
    ))
}

val request = Request.Builder()
    .url("https://api.groq.com/openai/v1/chat/completions")
    .header("Authorization", "Bearer YOUR_API_KEY")
    .post(json.toString().toRequestBody())
    .build()
```

**Avantages:**
- ✅ Aucune infrastructure
- ✅ Performance maximale (GPU datacenter)
- ✅ Scaling automatique
- ⚠️ Coût par utilisation
- ⚠️ Dépendance externe

---

### Solution 4: Upgrade Freebox (NON RECOMMANDÉ)

**Option théorique:** Upgrader la RAM de votre Freebox VM

**Réalité:**
- ❌ Freebox Delta: RAM fixe, non upgradeable
- ❌ Configuration VM Free: limite imposée par Free
- ❌ Impossible sans changer de box

---

## 🎯 Recommandation Finale

### 🏆 **MEILLEURE OPTION: Oracle Cloud Free Tier**

**Pourquoi:**
1. ✅ **GRATUIT À VIE** - 4 CPU ARM + 24 GB RAM
2. ✅ Performance excellente pour Llama 8B
3. ✅ Complètement séparé de votre Freebox
4. ✅ Pas d'impact sur BagBot
5. ✅ Application Android peut y accéder via API

**Setup complet (30 minutes):**

```bash
# 1. Créer compte Oracle Cloud (gratuit)
https://cloud.oracle.com/free

# 2. Créer VM ARM (Always Free)
Instance: VM.Standard.A1.Flex
CPU: 4 cores ARM
RAM: 24 GB
Storage: 200 GB
OS: Ubuntu 22.04 ARM

# 3. Installer Ollama
ssh ubuntu@ORACLE-VM-IP
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b  # ou 8b si vous voulez

# 4. Exposer API publiquement
sudo systemctl edit ollama.service
# Ajouter: Environment="OLLAMA_HOST=0.0.0.0:11434"
sudo systemctl restart ollama

# 5. Ouvrir le port dans Oracle Cloud
# Console → Networking → Security List → Add Ingress Rule
# Port 11434, Source: 0.0.0.0/0

# 6. Tester depuis Android
curl http://ORACLE-VM-IP:11434/api/generate \
  -d '{"model": "llama3.2:3b", "prompt": "Hello"}'
```

**Architecture finale:**
```
┌─────────────────────────────────────────┐
│  Freebox VM (88.174.155.230)           │
│  ✅ BagBot Discord                      │
│  ✅ Application Android (existante)    │
│  └─ Aucune modification nécessaire     │
└─────────────────────────────────────────┘
                  
┌─────────────────────────────────────────┐
│  Oracle Cloud VM ARM (Gratuit)         │
│  ✅ Ollama + Llama 3.2 (3B ou 8B)      │
│  ✅ API REST sur port 11434            │
│  ✅ 4 CPU ARM + 24 GB RAM              │
│  └─ Performance: ~50-100 tokens/sec    │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│  Nouvelle Application Android          │
│  ✅ Communique avec Oracle VM          │
│  ✅ Utilise Llama via API              │
│  └─ Complètement séparé de BagBot      │
└─────────────────────────────────────────┘
```

---

## 📝 Étapes Suivantes Recommandées

### Option A: Oracle Cloud (Gratuit, Recommandé)

1. **Créer compte Oracle Cloud** (5 min)
   - https://cloud.oracle.com/free
   - Carte bancaire requise mais non débitée
   - Free tier permanent

2. **Créer VM ARM Always Free** (10 min)
   - 4 CPU ARM + 24 GB RAM
   - Ubuntu 22.04
   - IP publique statique

3. **Installer Ollama + Llama** (10 min)
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.2:8b
   ```

4. **Configurer firewall** (5 min)
   - Ouvrir port 11434
   - Tester API

5. **Développer app Android** (vous)
   - Consommer API Ollama
   - Interface utilisateur

---

### Option B: VPS Commercial (~€6-12/mois)

Si vous préférez un VPS européen plus proche:

1. **Hetzner Cloud CX22** (4 GB RAM)
   - €5.83/mois
   - Datacenter Allemagne
   - Latence excellente depuis France

2. **Scaleway DEV1-M** (4 GB RAM)
   - €8.99/mois
   - Datacenter France
   - Support français

---

### Option C: PC Local (Gratuit mais PC toujours allumé)

Si vous avez un PC avec 8+ GB RAM:

1. Installer Ollama
2. Exposer via Cloudflare Tunnel
3. App Android utilise URL tunnel

---

## 🚫 Ce qui N'EST PAS Possible

### ❌ Installer Llama sur la Freebox actuelle

**Raisons techniques:**
- RAM: 964 MB disponible vs. 2+ GB requis
- CPU: Trop lent pour expérience utilisateur acceptable
- Isolation: Pas assez de ressources pour VM séparée
- Impact: Risque crash/ralentissement BagBot

**Verdict:** **IMPOSSIBLE sans dégrader sérieusement BagBot**

---

## 📞 Support et Questions

Si vous voulez que je vous aide à:

1. ✅ **Configurer Oracle Cloud** (gratuit, recommandé)
2. ✅ **Choisir un VPS** et l'installer
3. ✅ **Développer l'API Android** pour Llama
4. ✅ **Tester les performances** de différents modèles

**N'hésitez pas à me demander !**

---

## 📊 Tableau Récapitulatif

| Critère | Freebox VM | Oracle Cloud | VPS Commercial | PC Local |
|---------|------------|--------------|----------------|----------|
| **Coût** | Inclu | GRATUIT | €6-12/mois | Électricité |
| **RAM disponible** | ❌ 0.5 GB | ✅ 24 GB | ✅ 4-8 GB | ✅ 8+ GB |
| **Performance** | ❌ Très lent | ✅ Excellente | ✅ Bonne | ✅ Excellente |
| **Séparation** | ❌ Impossible | ✅ Totale | ✅ Totale | ✅ Totale |
| **Impact BagBot** | ❌ Crash risqué | ✅ Aucun | ✅ Aucun | ✅ Aucun |
| **Disponibilité** | ✅ 24/7 | ✅ 24/7 | ✅ 24/7 | ⚠️ PC allumé |
| **Configuration** | ❌ Impossible | ⭐ 30 min | ⭐ 30 min | ⭐ 20 min |
| **Recommandé** | ❌ NON | ✅✅✅ OUI | ✅✅ OUI | ✅ OUI |

---

**🎯 CONCLUSION: Utilisez Oracle Cloud Free Tier - C'est gratuit, puissant et parfaitement séparé de votre infrastructure actuelle.**
