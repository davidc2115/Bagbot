# Backend API Unifié - Guide de Déploiement

## 🚀 Installation Rapide

### 1. Installer les dépendances

```bash
cd /workspace/backend
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 3. Démarrer le serveur

**Mode développement :**
```bash
npm run dev
```

**Mode production :**
```bash
npm start
```

## 🔧 Configuration PM2 (Production)

### Installation PM2

```bash
npm install -g pm2
```

### Démarrer avec PM2

```bash
# Backend API
pm2 start server.js --name bagbot-backend

# Voir les logs
pm2 logs bagbot-backend

# Redémarrer
pm2 restart bagbot-backend

# Arrêter
pm2 stop bagbot-backend

# Statut
pm2 status
```

### Configuration PM2 (ecosystem.config.js)

Créer un fichier `ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'bagbot-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Puis :

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Configuration Nginx (Reverse Proxy)

Si vous souhaitez utiliser un nom de domaine et HTTPS :

```nginx
server {
    listen 80;
    server_name api.bagbot.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Puis installer Certbot pour HTTPS :

```bash
sudo certbot --nginx -d api.bagbot.com
```

## 🔒 Sécurité

### 1. Restreindre CORS en production

Éditer `server.js` :

```javascript
app.use(cors({
  origin: [
    'https://dashboard.bagbot.com',  // Votre dashboard
    'http://82.67.65.98:3002',       // IP serveur
    'bagbot://auth'                   // App mobile
  ],
  credentials: true
}));
```

### 2. Rate Limiting

Installer :
```bash
npm install express-rate-limit
```

Ajouter dans `server.js` :
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requêtes par IP
});

app.use('/api/', limiter);
```

### 3. Helmet (Headers de sécurité)

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📊 Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### Logs en temps réel

```bash
pm2 logs bagbot-backend --lines 100
```

### Metrics PM2 Plus (optionnel)

```bash
pm2 link <secret> <public>
```

## 🔄 Mise à jour

```bash
# Arrêter le serveur
pm2 stop bagbot-backend

# Mettre à jour le code
git pull

# Réinstaller les dépendances si nécessaire
npm install

# Redémarrer
pm2 restart bagbot-backend
```

## 🧪 Tests

### Test manuel des endpoints

```bash
# Vérifier que le serveur répond
curl http://localhost:3002/

# Tester l'API
curl http://localhost:3002/api/bot/status
```

## 🆘 Dépannage

### Le serveur ne démarre pas

1. Vérifier les logs :
```bash
pm2 logs bagbot-backend --err
```

2. Vérifier le port :
```bash
netstat -tulpn | grep 3002
```

3. Tester manuellement :
```bash
node server.js
```

### Erreurs CORS

- Vérifier la configuration CORS dans `server.js`
- Tester avec un origin autorisé
- Vérifier les headers dans la requête

### Problèmes de permissions

```bash
# Vérifier les permissions du dossier data/
ls -la /workspace/data/

# Corriger si nécessaire
chmod -R 755 /workspace/data/
```

## 📚 Documentation API

Tous les endpoints disponibles sont documentés dans `README.md`.

## 🎯 Checklist de Déploiement

- [ ] Variables d'environnement configurées (.env)
- [ ] Dépendances installées (npm install)
- [ ] CORS restreint en production
- [ ] PM2 installé et configuré
- [ ] Logs configurés (/logs/)
- [ ] Backup automatique configuré (optionnel)
- [ ] Monitoring mis en place (PM2 monit)
- [ ] HTTPS configuré (Nginx + Certbot)
- [ ] Firewall configuré (ufw)
- [ ] Tests effectués

## 🚀 Bon déploiement !
