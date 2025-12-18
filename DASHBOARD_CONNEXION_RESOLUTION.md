# Résolution du problème de connexion du Dashboard BAG Bot Manager

## Problème identifié

Le système de connexion du dashboard BAG Bot Manager ne fonctionnait pas pour les raisons suivantes :

### 1. **Dépendances npm manquantes**
- Le serveur du dashboard (`dashboard-v2/server-v2.js`) ne pouvait pas démarrer
- Modules requis manquants : `dotenv`, `express`, `multer`, etc.
- **Solution appliquée** : Installation des dépendances avec `npm install`

### 2. **Serveur non démarré**
- Aucun processus serveur n'était en cours d'exécution
- PM2 n'était pas configuré ou démarré
- **Solution appliquée** : Démarrage manuel du serveur `node dashboard-v2/server-v2.js`

### 3. **Variable d'environnement DISCORD_TOKEN manquante**
- Le fichier `.env` n'existe pas
- Le `DISCORD_TOKEN` est nécessaire pour l'intégration Discord (récupération des salons, membres, rôles)
- **Impact** : Le serveur fonctionne mais ne peut pas communiquer avec l'API Discord

### 4. **Absence de système d'authentification**
- Le serveur `dashboard-v2/server-v2.js` n'a **aucune protection par mot de passe**
- Toutes les routes API sont accessibles sans authentification
- L'ancien dashboard (`public/app.js`) tentait d'utiliser une clé d'authentification qui n'est jamais vérifiée

## État actuel

✅ **Serveur opérationnel**
- Le serveur dashboard tourne sur le port **3002**
- Accessible via : `http://localhost:3002` ou `http://82.67.65.98:3002`
- Endpoint de santé : `http://localhost:3002/health` → Répond correctement

⚠️ **Fonctionnalités limitées**
- Sans `DISCORD_TOKEN`, les fonctionnalités suivantes ne fonctionnent pas :
  - Récupération de la liste des salons Discord
  - Récupération de la liste des membres
  - Récupération de la liste des rôles
  - Affichage des noms réels des membres dans l'économie/niveaux

⚠️ **Sécurité**
- Aucune authentification configurée
- Toute personne ayant accès au port 3002 peut modifier la configuration

## Solutions recommandées

### 1. Configuration du DISCORD_TOKEN

Créer un fichier `.env` à la racine du projet :

```bash
DISCORD_TOKEN=votre_token_discord_ici
GUILD_ID=1360897918504271882
CLIENT_ID=1414216173809307780
```

Ou créer le fichier dans `/var/data/.env` (chemin alternatif vérifié par le code).

### 2. Démarrage automatique avec PM2

Le fichier `ecosystem.config.js` est déjà configuré. Pour démarrer automatiquement :

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Cela démarrera automatiquement :
- Le bot Discord (`bagbot`)
- Le serveur dashboard (`dashboard`)

### 3. Ajouter une authentification (optionnel mais recommandé)

Pour sécuriser le dashboard, ajouter un middleware d'authentification dans `dashboard-v2/server-v2.js` :

```javascript
// Ajouter au début du fichier
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'changeme';

// Middleware d'authentification
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || req.query.key || '';
  const token = auth.replace('Bearer ', '');
  
  if (!DASHBOARD_PASSWORD || token === DASHBOARD_PASSWORD) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

// Appliquer aux routes sensibles
app.use('/api', requireAuth);
```

Puis ajouter `DASHBOARD_PASSWORD` dans le fichier `.env`.

### 4. Configuration réseau

Si vous accédez au dashboard depuis l'extérieur :
- Ouvrir le port 3002 sur votre firewall
- Ou configurer un reverse proxy (nginx) avec HTTPS

## Comment accéder au dashboard maintenant

1. **Localement** : `http://localhost:3002`
2. **Via IP** : `http://82.67.65.98:3002` (si le port est ouvert)
3. **Dashboard principal** : Page d'accueil avec toutes les sections
4. **Dashboard musique** : `http://localhost:3002/music`

## Vérifications supplémentaires

Pour vérifier l'état du serveur :
```bash
# Vérifier si le serveur écoute sur le port 3002
netstat -tuln | grep 3002

# Vérifier les processus Node.js en cours
ps aux | grep node

# Tester l'endpoint de santé
curl http://localhost:3002/health

# Voir les logs PM2 (si configuré)
pm2 logs dashboard
```

## Fichiers clés

- **Serveur dashboard** : `dashboard-v2/server-v2.js`
- **Interface dashboard** : `dashboard-v2/index.html`
- **Configuration PM2** : `ecosystem.config.js`
- **Configuration bot** : `data/config.json`
- **Variables d'environnement** : `.env` (à créer)

## Prochaines étapes suggérées

1. ✅ Créer le fichier `.env` avec le `DISCORD_TOKEN`
2. ✅ Redémarrer le serveur pour prendre en compte les variables d'environnement
3. ✅ Configurer PM2 pour le démarrage automatique
4. ⚠️ Ajouter une authentification pour sécuriser l'accès
5. ⚠️ Configurer HTTPS avec un certificat SSL (Let's Encrypt)

---

**Date de résolution** : 17 décembre 2025
**Status** : ✅ Serveur opérationnel, ⚠️ Configuration à compléter
