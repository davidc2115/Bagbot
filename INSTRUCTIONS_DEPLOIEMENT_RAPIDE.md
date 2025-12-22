# 🚀 Instructions de Déploiement Rapide

## ⚠️ ACTIONS IMMÉDIATES REQUISES

### 1. 🔄 Redémarrer le Bot (OBLIGATOIRE)

Les corrections du système mot-caché nécessitent un redémarrage :

```bash
ssh -p 33000 bagbot@88.174.155.230

# Puis sur la Freebox :
cd /home/bagbot/Bag-bot
pm2 restart bagbot

# Vérifier que le bot est bien démarré
pm2 status
pm2 logs bagbot --lines 50
```

### 2. 📦 Redéployer les Commandes

#### Option A : Script Automatique (Recommandé)

```bash
# Sur la Freebox (après SSH)
cd /home/bagbot/Bag-bot
bash DEPLOY_TOUTES_COMMANDES.sh
```

#### Option B : Déploiement Direct

```bash
# Sur la Freebox (après SSH)
cd /home/bagbot/Bag-bot
node deploy-final.js
```

### 3. ⏰ Attendre la Synchronisation

- **Temps d'attente:** 1-2 minutes
- **Vérification:** Taper `/` sur Discord pour voir toutes les commandes

---

## ✅ Ce Qui a Été Corrigé

### 1. Bouton Config Mot-Caché
- ✅ **AVANT:** "échec de l'interaction"
- ✅ **APRÈS:** Fonctionne correctement
- 📝 **Correction:** Gestion appropriée des états d'interaction

### 2. Emojis Aléatoires Mot-Caché
- ✅ **AVANT:** Aucun emoji n'apparaissait
- ✅ **APRÈS:** Emojis ajoutés aléatoirement sur les messages
- 📝 **Correction:** Handler intégré dans messageCreate

### 3. Commandes Manquantes
- ✅ **94 commandes** disponibles localement
- 📝 **Solution:** Script de déploiement complet

---

## 🧪 Comment Tester le Mot-Caché

### Étape 1 : Configuration (Administrateur)

1. Utiliser `/mot-cache` sur Discord
2. Cliquer sur "⚙️ Configurer le jeu"
3. Définir les paramètres :

   **Boutons de configuration:**
   - ▶️ **Activer** le jeu
   - 🎯 **Changer le mot** (ex: CALIN, BISOU)
   - 🔍 **Emoji** (défaut: 🔍)
   - 📋 **Salons jeu** (vide = tous les salons)
   - 💬 **Salon lettres** (où notifier les lettres trouvées)
   - 📢 **Salon gagnant** (où annoncer le gagnant)

### Étape 2 : Test des Emojis

1. **Écrire des messages** dans les salons configurés
   - Minimum 15 caractères par message
   - Ne pas être un bot

2. **Observer** : L'emoji doit apparaître aléatoirement
   - Par défaut : 5% de chance par message (mode probabilité)
   - Ou 2% en mode programmé

3. **Notification** : Message dans le salon configuré
   ```
   🔍 @Utilisateur a trouvé une lettre cachée !
   
   Lettre: C
   Progression: 1/5
   💡 Utilise /mot-cache deviner <mot> quand tu penses avoir trouvé !
   ```

### Étape 3 : Test de la Collection

1. Utiliser `/mot-cache` pour voir les lettres collectées
2. Voir la progression (ex: 3/5 lettres)

### Étape 4 : Test du Devinage

1. Cliquer sur "✍️ Entrer le mot"
2. Taper le mot (ex: CALIN)
3. **Si correct:** 
   - 🎉 Message de félicitations
   - 💰 Récompense ajoutée (défaut: 5000 BAG$)
   - 📢 Annonce dans le salon configuré
   - 🔄 Jeu réinitialisé

4. **Si incorrect:**
   - ❌ Message d'erreur
   - 📋 Rappel des lettres collectées

---

## 🔍 Diagnostic en Cas de Problème

### Le bouton Config ne fonctionne toujours pas

```bash
# Vérifier que le bot est bien redémarré
pm2 logs bagbot --lines 100 | grep -i "mot-cache\|motcache"

# Redémarrer à nouveau si nécessaire
pm2 restart bagbot
```

### Les emojis n'apparaissent pas

1. **Vérifier la configuration:**
   - `/mot-cache` → "⚙️ Config" → Vérifier que le jeu est activé
   - Vérifier que les salons sont bien configurés

2. **Vérifier les permissions du bot:**
   - Permission "Ajouter des réactions" dans les salons

3. **Vérifier les logs:**
   ```bash
   pm2 logs bagbot | grep "MOT-CACHE"
   ```

4. **Augmenter la probabilité (test):**
   - Dans Config → Mode Probabilité
   - Mettre 50% temporairement pour tester
   - Remettre 5% ensuite

### Les commandes n'apparaissent pas

```bash
# Redéployer les commandes
node deploy-final.js

# Attendre 2 minutes, puis tester sur Discord
# Taper / dans un salon pour voir la liste
```

---

## 📋 Checklist de Validation

### Après Redémarrage
- [ ] Bot redémarré (`pm2 restart bagbot`)
- [ ] Bot en ligne sur Discord (statut vert)
- [ ] Logs ne montrent pas d'erreur

### Après Déploiement
- [ ] Commandes redéployées (`node deploy-final.js`)
- [ ] `/mot-cache` fonctionne
- [ ] Bouton "⚙️ Config" s'ouvre correctement
- [ ] Configuration enregistrée

### Test Complet Mot-Caché
- [ ] Jeu activé par un admin
- [ ] Mot défini (ex: CALIN)
- [ ] Salons configurés
- [ ] Messages envoyés (>15 caractères)
- [ ] Emojis apparaissent aléatoirement
- [ ] Lettres collectées visibles dans `/mot-cache`
- [ ] Devinage fonctionne
- [ ] Récompense distribuée
- [ ] Annonce dans le salon configuré

---

## 📞 Support

### Fichiers de Référence
- 📄 **Rapport détaillé:** `RAPPORT_CORRECTIONS_MOT_CACHE.md`
- 📄 **Historique:** `RESUME_MODIFICATIONS_22DEC2025.md`

### Commandes Utiles

```bash
# Voir le statut du bot
pm2 status

# Voir les logs en temps réel
pm2 logs bagbot

# Redémarrer le bot
pm2 restart bagbot

# Voir les processus
ps aux | grep node

# Tester la connexion Discord
node -e "require('dotenv').config({path:'/var/data/.env'}); console.log('Token:', process.env.DISCORD_TOKEN ? 'OK' : 'MANQUANT')"
```

---

## 🎯 Résumé des Commandes

| Action | Commande |
|--------|----------|
| Se connecter à la Freebox | `ssh -p 33000 bagbot@88.174.155.230` |
| Aller dans le dossier du bot | `cd /home/bagbot/Bag-bot` |
| Redémarrer le bot | `pm2 restart bagbot` |
| Redéployer les commandes | `node deploy-final.js` |
| Voir les logs | `pm2 logs bagbot --lines 50` |
| Vérifier le statut | `pm2 status` |

---

*Guide créé le 22 Décembre 2025*
*Pour le système BAG Discord Bot v5.9+*
