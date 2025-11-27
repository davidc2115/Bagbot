# 📊 Changements Avant/Après - Migration Dashboard

## 🔄 Résumé de la Migration

**Ancienne adresse:** `http://82.67.65.98:3002`  
**Nouvelle adresse:** `http://88.174.155.230:3002`  
**Port:** `3002` (inchangé)

---

## 📝 Fichiers Modifiés

### 1️⃣ Bot Discord - Commande /dashboard
**Fichier:** `src/commands/dashboard.js`

#### Avant:
```javascript
value: '[Cliquez ici pour ouvrir le dashboard](http://82.67.65.98:3002)'
.setURL('http://82.67.65.98:3002')
```

#### Après:
```javascript
value: '[Cliquez ici pour ouvrir le dashboard](http://88.174.155.230:3002)'
.setURL('http://88.174.155.230:3002')
```

---

### 2️⃣ Bot Discord - Téléchargeur de GIFs
**Fichier:** `src/utils/discord_gif_downloader.js`

#### Avant:
```javascript
resolve('http://82.67.65.98:3002/gifs/' + filename);
const localUrl = 'http://82.67.65.98:3002/gifs/' + filename;
```

#### Après:
```javascript
resolve('http://88.174.155.230:3002/gifs/' + filename);
const localUrl = 'http://88.174.155.230:3002/gifs/' + filename;
```

---

### 3️⃣ Dashboard - Serveur Backend
**Fichier:** `dashboard-v2/server-v2.js`

#### Avant:
```javascript
const localUrl = 'http://82.67.65.98:3002/gifs/' + filename;
```

#### Après:
```javascript
const localUrl = 'http://88.174.155.230:3002/gifs/' + filename;
```

---

### 4️⃣ Dashboard - Interface Web
**Fichier:** `dashboard-v2/index.html`

#### Avant:
```javascript
const r=await fetch(`http://82.67.65.98:3002${u}`, ...);
```

#### Après:
```javascript
const r=await fetch(`http://88.174.155.230:3002${u}`, ...);
```

---

### 5️⃣ Dashboard - Auto-téléchargement GIFs
**Fichier:** `dashboard-v2/auto_download_discord_gifs.js`

#### Avant:
```javascript
const localUrl = `http://82.67.65.98:3002/gifs/${filename}`;
```

#### Après:
```javascript
const localUrl = `http://88.174.155.230:3002/gifs/${filename}`;
```

---

### 6️⃣ Configuration - Script de Déploiement
**Fichier:** `deploy-to-freebox.sh`

#### Avant:
```bash
FREEBOX_IP="82.67.65.98"
```

#### Après:
```bash
FREEBOX_IP="88.174.155.230"
```

---

### 7️⃣ Documentation
**Fichier:** `docs/README.md`

#### Avant:
```markdown
- Dashboard: http://82.67.65.98:3002
```

#### Après:
```markdown
- Dashboard: http://88.174.155.230:3002
```

---

### 8️⃣ Utilitaire - Liste GIFs
**Fichier:** `dashboard-v2/list-cached-gifs.js`

#### Avant:
```javascript
console.log('   http://82.67.65.98:3002/gif-cache/[filename].gif');
```

#### Après:
```javascript
console.log('   http://88.174.155.230:3002/gif-cache/[filename].gif');
```

---

## 💾 Sauvegardes Créées

Tous les fichiers modifiés ont une sauvegarde avec l'extension `.backup`:

- ✅ `src/commands/dashboard.js.backup`
- ✅ `src/utils/discord_gif_downloader.js.backup`
- ✅ `dashboard-v2/server-v2.js.backup`
- ✅ `dashboard-v2/index.html.backup`
- ✅ `dashboard-v2/auto_download_discord_gifs.js.backup`
- ✅ `deploy-to-freebox.sh.backup`
- ✅ `docs/README.md.backup`

---

## ✅ Prochaines Étapes

1. **Synchroniser** les fichiers sur la Freebox (si nécessaire)
2. **Redémarrer** le bot et le dashboard: `pm2 restart bag-bot dashboard`
3. **Tester** la commande `/dashboard` sur Discord
4. **Vérifier** l'accès au dashboard via navigateur

---

## 🔙 Restauration (si nécessaire)

Pour restaurer l'ancienne configuration:

```bash
cd /home/bagbot/Bag-bot
cp src/commands/dashboard.js.backup src/commands/dashboard.js
cp src/utils/discord_gif_downloader.js.backup src/utils/discord_gif_downloader.js
cp dashboard-v2/server-v2.js.backup dashboard-v2/server-v2.js
cp dashboard-v2/index.html.backup dashboard-v2/index.html
cp dashboard-v2/auto_download_discord_gifs.js.backup dashboard-v2/auto_download_discord_gifs.js
cp deploy-to-freebox.sh.backup deploy-to-freebox.sh
cp docs/README.md.backup docs/README.md
pm2 restart bag-bot dashboard
```

---

*Modifications effectuées le: 2025-11-27*
