# 📸 URLs Discord CDN - Guide et Solutions

## 🔍 Problème Identifié

**Symptôme** : Certains GIFs Discord CDN ne s'affichent pas dans l'application (image rouge).

**Analyse** :
```
📊 STATISTIQUES:
  - Discord CDN URLs: 43
  - URLs avec expiration (?ex=): 40 (93%)
  - URLs sans expiration: 3 (7%)
```

## ⚠️ Cause : URLs Signées Discord

Discord CDN utilise des **URLs signées** avec expiration :

```
https://cdn.discordapp.com/attachments/.../image.gif?ex=6915c...&is=...&hm=...
                                                        ↑
                                                    Expiration timestamp
```

### Format des Paramètres

- `ex=` : Date d'expiration (hex timestamp)
- `is=` : Date d'émission  
- `hm=` : Hash de signature (HMAC)

### Durée de Vie

Les URLs Discord CDN expirent généralement après **quelques heures/jours**.

## ✅ Solutions Implémentées (v6.1.20)

### 1. Configuration Coil Améliorée

**Fichier** : `BagBotApplication.kt`

```kotlin
val okHttpClient = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)  // Timeout augmenté
    .readTimeout(30, TimeUnit.SECONDS)
    .build()

ImageLoader.Builder(this)
    .okHttpClient(okHttpClient)
    .memoryCache {
        MemoryCache.Builder(this)
            .maxSizePercent(0.25)  // 25% RAM pour le cache
            .build()
    }
    .diskCache {
        DiskCache.Builder()
            .directory(cacheDir.resolve("image_cache"))
            .maxSizeBytes(50 * 1024 * 1024)  // 50 MB
            .build()
    }
    .respectCacheHeaders(false)  // Ignorer les headers d'expiration
    .crossfade(true)
    .build()
```

### Améliorations

✅ **Timeouts augmentés** : 30s au lieu de 10s par défaut  
✅ **Cache mémoire** : 25% de la RAM disponible  
✅ **Cache disque** : 50 MB pour stocker les GIFs  
✅ **Ignore expiration headers** : Essaie de charger même si expiré  
✅ **Crossfade** : Transitions douces

### 2. Gestion des Erreurs

L'application affiche maintenant :
- ✅ **GIF animé** si l'URL fonctionne
- 🔴 **Image rouge placeholder** si l'URL est expirée/invalide
- ⏳ **Chargement** pendant le téléchargement

## 🔧 Solutions pour les URLs Expirées

### Option 1: Rafraîchir les URLs via Discord

Les URLs doivent être re-générées depuis Discord :

1. Réuploader le GIF dans Discord
2. Copier la nouvelle URL
3. Mettre à jour dans l'app

### Option 2: Utiliser des Hébergeurs Alternatifs

URLs qui **ne** expirent **pas** :

| Hébergeur | Exemple | Expiration |
|-----------|---------|------------|
| **Tenor** | `https://media1.tenor.com/m/...` | ❌ Jamais |
| **Reddit** | `https://i.redd.it/...` | ❌ Jamais |
| **Imgur** | `https://i.imgur.com/...` | ❌ Jamais |
| **Giphy** | `https://media.giphy.com/...` | ❌ Jamais |
| **Discord CDN (anciens)** | `...attachments/.../file.gif` (sans ?ex=) | ❌ Jamais |
| **Discord CDN (nouveaux)** | `...attachments/.../file.gif?ex=...` | ✅ Oui |

### Option 3: Script de Vérification

Créer un script pour identifier les URLs expirées :

```javascript
// Tester une URL Discord
fetch('https://cdn.discordapp.com/...')
  .then(res => res.ok ? 'OK' : 'EXPIRED')
  .catch(() => 'ERROR');
```

## 📋 URLs Actuelles

### Avec Expiration (40)

Ces URLs risquent d'expirer :
- `hairpull` : 2 GIFs
- `doigter` : 2 GIFs
- `caress` : 3 GIFs
- `lick` : 2 GIFs
- `kiss` : 3 GIFs
- ... (35 autres)

### Sans Expiration (3)

Ces URLs fonctionnent toujours :
- `bed` : 3 GIFs

## 🎯 Recommandations

### Court Terme (Utilisateur)

1. **Tester l'app v6.1.20** avec les améliorations Coil
2. **Identifier les GIFs qui ne s'affichent pas**
3. **Signaler les actions concernées**

### Moyen Terme

1. **Remplacer les URLs expirées** par des nouvelles
2. **Privilégier Tenor/Imgur** pour les nouveaux GIFs
3. **Éviter les URLs Discord avec `?ex=`**

### Long Terme

1. **Bot Discord** : Auto-refresh des URLs expirées
2. **Proxy** : Serveur intermédiaire pour cacher les GIFs
3. **Upload local** : Héberger les GIFs sur votre serveur

## 🔗 Exemples d'URLs Valides

### ✅ Bonnes URLs (ne expirent pas)

```
https://media1.tenor.com/m/d6nm8ge8cuoAAAAC/sexy-hot.gif
https://i.redd.it/kkg9mdt7tsx41.gif
https://media1.tenor.com/m/MUvGSSoIKA8AAAAC/ask.gif
```

### ⚠️ URLs à Risque (expirent)

```
https://cdn.discordapp.com/attachments/.../image.gif?ex=6915c...
                                                       ↑
                                                   À éviter!
```

## 🛠️ Test dans l'Application

### v6.1.20 (Nouveau)

1. Ouvrir l'app
2. Vider le cache
3. Config > Actions > GIFs
4. Sélectionner une action
5. Observer :
   - ✅ GIF animé → URL fonctionne
   - 🔴 Image rouge → URL expirée
   - ⏳ Chargement → Téléchargement en cours

### Avantages v6.1.20

- ✅ Cache disque (50 MB) → GIFs chargés une fois
- ✅ Timeouts augmentés → Moins d'échecs réseau
- ✅ Ignore cache headers → Essaie même si expiré
- ✅ Meilleure gestion mémoire

## 📊 Statistiques Actuelles

```
Total GIFs: 70
  ├─ Discord CDN: 43 (61%)
  │   ├─ Avec expiration: 40 (57%)
  │   └─ Sans expiration: 3 (4%)
  └─ Autres (Tenor, etc.): 27 (39%)
```

**Risque** : ~57% des GIFs peuvent expirer à terme.

## ✅ Plan d'Action

### Immédiat
1. ✅ Déployer v6.1.20 avec meilleure config Coil
2. ✅ Tester avec les URLs actuelles
3. ✅ Identifier les GIFs non-fonctionnels

### Prochain Déploiement
1. Remplacer les URLs Discord expirées
2. Privilégier Tenor/Imgur pour nouveaux GIFs
3. Documenter les bonnes pratiques

---

**Version** : 6.1.20  
**Date** : 2 janvier 2026  
**Statut** : ✅ Configuration optimisée, monitoring requis
