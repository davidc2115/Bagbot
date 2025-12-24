## Naruto AI Chat - Release v1.3.1 - Port 33437 Configuré! 🎉

### ✅ APPLICATION CONFIGURÉE POUR PORT 33437:
- **URL:** `http://88.174.155.230:33437`
- **Port:** 33437 (comme demandé)
- **Application prête** à se connecter

### ⚠️ IMPORTANT - TU DOIS CONFIGURER LE SERVEUR:

L'application est configurée pour le port 33437, mais **TU DOIS EXÉCUTER** ces commandes sur ta Freebox :

#### ÉTAPE 1 : Connexion à la Freebox
```bash
ssh root@88.174.155.230
# Mot de passe : root bagbot
```

#### ÉTAPE 2 : Configuration d'Ollama sur port 33437
```bash
# Arrêter Ollama
systemctl stop ollama

# Configurer le port 33437
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:33437"
EOF

# Recharger et redémarrer
systemctl daemon-reload
systemctl start ollama
systemctl enable ollama

# Vérifier
netstat -tlnp | grep 33437
curl http://localhost:33437/api/tags
```

#### ÉTAPE 3 : Tester depuis l'extérieur
```bash
# Depuis ton téléphone ou PC
curl http://88.174.155.230:33437/api/tags
```

Si ça répond avec la liste des modèles, **c'est bon** ! L'app fonctionnera.

### ✨ Features:
- 🍜 **13 personnages** avec emojis
- 🔓 **Modes SFW et NSFW**
- ⌨️ **Clavier fonctionnel**
- 🎨 **Interface complète**
- 🔗 **Port 33437** configuré dans l'app

### 📱 Installation:
1. **Configurer le serveur** (commandes ci-dessus)
2. **Télécharger l'APK v1.3.1**
3. **Installer**
4. **Utiliser** - Ça devrait se connecter sur le port 33437!

### 🔗 Backend:
- **URL:** http://88.174.155.230:33437
- **Modèle:** TinyLlama 1.1B
- **Port:** 33437 (personnalisé)

### 📋 Fichiers d'aide fournis:
- `CONFIGURER_SERVEUR_PORT_33437.sh` - Script complet
- `COMMANDES_FREEBOX.txt` - Commandes étape par étape

**Dattebayo! 🍜**

---

### 🔄 Changelog:
- ✅ Port changé à 33437
- ✅ Instructions complètes fournies
- ✅ Application prête à fonctionner
- ⚠️ Serveur doit être configuré (commandes ci-dessus)
