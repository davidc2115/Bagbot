# 🔧 INSTRUCTIONS POUR DÉMARRER LE SERVEUR OLLAMA

## ⚠️ PROBLÈME IDENTIFIÉ

Le serveur TinyLlama sur la Freebox n'est **PAS DÉMARRÉ** ou **PAS ACCESSIBLE**.

L'application essaie de se connecter à :
- **URL:** `http://88.174.155.230:11434`
- **Erreur:** `Failed to connect to /88.174.155.230:11434`

## 📋 SOLUTION : DÉMARRER OLLAMA SUR LA FREEBOX

### Méthode 1 : Via Interface Freebox

1. **Se connecter à la Freebox** :
   - Ouvrir un navigateur
   - Aller sur l'interface de gestion de la Freebox
   
2. **Accéder à la VM** :
   - Aller dans les paramètres de la VM
   - Démarrer la VM si elle est éteinte

3. **Se connecter en SSH** à la Freebox :
   ```bash
   ssh bagbot@88.174.155.230
   # Mot de passe: bagbot
   ```

4. **Vérifier le status d'Ollama** :
   ```bash
   sudo systemctl status ollama
   ```

5. **Démarrer Ollama** (si pas démarré) :
   ```bash
   sudo systemctl start ollama
   ```

6. **Vérifier qu'il écoute sur le bon port** :
   ```bash
   sudo netstat -tlnp | grep 11434
   ```

7. **Tester l'API** :
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Méthode 2 : Script Automatique

Exécutez ce script depuis votre ordinateur :

```bash
#!/bin/bash

echo "🔧 Connexion à la Freebox..."
ssh bagbot@88.174.155.230 << 'EOF'

echo "✅ Connecté"
echo ""

echo "1️⃣ Status actuel d'Ollama:"
sudo systemctl status ollama
echo ""

echo "2️⃣ Démarrage d'Ollama..."
sudo systemctl start ollama
sleep 3
echo ""

echo "3️⃣ Status après démarrage:"
sudo systemctl status ollama
echo ""

echo "4️⃣ Test de l'API:"
curl http://localhost:11434/api/tags
echo ""

echo "5️⃣ Vérification du port:"
sudo netstat -tlnp | grep 11434
echo ""

echo "✅ Terminé!"
EOF
```

### Méthode 3 : Redémarrage Complet

Si Ollama ne démarre pas :

```bash
ssh bagbot@88.174.155.230

# Arrêter Ollama
sudo systemctl stop ollama

# Vérifier les logs
sudo journalctl -u ollama -n 50

# Redémarrer Ollama
sudo systemctl restart ollama

# Activer au démarrage
sudo systemctl enable ollama

# Vérifier le status
sudo systemctl status ollama
```

## 🔍 VÉRIFICATION

Une fois Ollama démarré, testez depuis votre ordinateur :

```bash
curl http://88.174.155.230:11434/api/tags
```

Vous devriez voir la liste des modèles, incluant `tinyllama`.

## ⚙️ CONFIGURATION OLLAMA

Si Ollama ne démarre pas, vérifiez la configuration :

```bash
# Voir la config du service
sudo systemctl cat ollama

# La config devrait contenir:
# Environment="OLLAMA_HOST=0.0.0.0:11434"
```

## 🔥 SI TOUT ÉCHOUE

### Option 1 : Réinstaller Ollama

```bash
ssh root@88.174.155.230
# Mot de passe: root bagbot

# Désinstaller
systemctl stop ollama
rm -rf /usr/local/bin/ollama
rm -rf /usr/share/ollama
rm -rf /etc/systemd/system/ollama.service

# Réinstaller
curl -fsSL https://ollama.com/install.sh | sh

# Configurer pour écouter sur toutes les interfaces
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

# Recharger et démarrer
systemctl daemon-reload
systemctl enable ollama
systemctl start ollama

# Vérifier
systemctl status ollama
curl http://localhost:11434/api/tags
```

### Option 2 : Utiliser un autre service

Si la Freebox ne fonctionne pas, tu peux utiliser :

**Groq API (Gratuit, 30 requêtes/minute)** :
- Aller sur https://console.groq.com
- Créer un compte
- Obtenir une clé API gratuite
- Je peux modifier l'app pour utiliser Groq à la place

## 📱 APRÈS DÉMARRAGE DU SERVEUR

Une fois le serveur Ollama démarré sur la Freebox :

1. **Tester la connexion** :
   ```bash
   curl http://88.174.155.230:11434/api/tags
   ```

2. **Si ça marche**, l'application Android devrait fonctionner !

3. **Relancer l'app** et tester une conversation

## ❓ BESOIN D'AIDE ?

Si tu ne peux pas accéder à la Freebox ou démarrer Ollama, dis-le moi et je peux :

1. **Créer une version avec Groq API** (cloud, gratuit, fonctionne immédiatement)
2. **Utiliser un autre service gratuit** (HuggingFace, Replicate, etc.)
3. **T'aider à débugger** le problème sur la Freebox

---

**Note:** L'application est configurée pour `http://88.174.155.230:11434` et attend que ce serveur soit accessible.
