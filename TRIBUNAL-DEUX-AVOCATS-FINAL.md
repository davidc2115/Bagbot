# 🏛️ SYSTÈME DE TRIBUNAL AVEC DEUX AVOCATS - DOCUMENTATION FINALE

**Date:** 2025-11-19  
**Statut:** ✅ OPÉRATIONNEL

---

## 📋 RÉSUMÉ DE LA MODIFICATION

Le système de tribunal a été mis à jour pour supporter **2 avocats distincts** :

1. **👔 Avocat du plaignant** : Choisi par le plaignant lors de la commande `/tribunal`
2. **👔 Avocat de la défense** : Choisi par l'accusé via un menu de sélection

---

## 🎭 RÔLES DISCORD IMPLIQUÉS

| Rôle | Nom Discord | Couleur | Attribution | Retrait |
|------|-------------|---------|-------------|---------|
| **Accusé** | `⚖️ Accusé` | 🔴 Rouge (0xFF0000) | À l'ouverture du procès | À la fermeture |
| **Avocat** | `👔 Avocat` | 🔵 Bleu (0x2196F3) | Aux deux avocats | À la fermeture |
| **Juge** | `👨‍⚖️ Juge` | 🟡 Or (0xFFD700) | Par bouton volontaire | À la fermeture |

---

## ⚙️ COMMANDE `/tribunal`

### Syntaxe
```
/tribunal 
  accusé:@Utilisateur 
  avocat:@Utilisateur
```

### Options

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| `accusé` | Utilisateur | ✅ Oui | La personne accusée |
| `avocat` | Utilisateur | ✅ Oui | L'avocat du plaignant |

### Vérifications Effectuées

✅ L'accusé ne peut pas être un bot  
✅ L'avocat ne peut pas être un bot  
✅ On ne peut pas s'accuser soi-même  
✅ On ne peut pas être son propre avocat  
✅ L'accusé et l'avocat du plaignant doivent être différents

### Actions Automatiques

1. **Création/Récupération des rôles**
   - `⚖️ Accusé` (rouge)
   - `👔 Avocat` (bleu)

2. **Attribution des rôles**
   - L'accusé reçoit le rôle `⚖️ Accusé`
   - L'avocat du plaignant reçoit le rôle `👔 Avocat`

3. **Création du channel**
   - Nom : `procès-de-{username}`
   - Catégorie : `⚖️ TRIBUNAUX`
   - Topic : `⚖️ Procès | Plaignant: ID | Accusé: ID | AvocatPlaignant: ID | AvocatDefense: null | Juge: null`

4. **Permissions du channel**
   - `@everyone` : ❌ Ne peut pas voir
   - `@membres` : ✅ Peut voir, lire, écrire, réagir

5. **Messages envoyés**
   - **Message permanent** : Embed d'ouverture + Bouton "Devenir Juge"
   - **Message temporaire** : Menu de sélection pour l'accusé (supprimé après sélection)

---

## 👔 SÉLECTION DE L'AVOCAT DE LA DÉFENSE

### Processus

1. L'accusé reçoit un **message avec menu** visible uniquement par lui
2. Il sélectionne un membre comme avocat de la défense
3. Le système vérifie :
   - ❌ Pas de bot
   - ❌ Pas l'accusé lui-même
   - ❌ Pas l'avocat du plaignant
4. Le rôle `👔 Avocat` est attribué
5. L'embed d'ouverture est **mis à jour** avec l'avocat de la défense
6. Le message avec le menu est **supprimé**
7. L'accusé reçoit une confirmation éphémère
8. Un message public annonce la désignation

### Embed Final (après sélection)

```
⚖️ OUVERTURE DU PROCÈS

👤 Plaignant : @User1
👔 Avocat du plaignant : @User2 @👔 Avocat
⚠️ Accusé : @User3 @⚖️ Accusé
👔 Avocat de la défense : @User4 @👔 Avocat
👨‍⚖️ Juge : Aucun (utilisez le bouton ci-dessous)

[Bouton: 👨‍⚖️ Devenir Juge]
```

---

## 👨‍⚖️ SYSTÈME DE JUGE

### Fonctionnement

1. N'importe quel membre avec accès au channel peut cliquer sur "👨‍⚖️ Devenir Juge"
2. Le **premier** à cliquer devient le juge
3. Le rôle `👨‍⚖️ Juge` (or) lui est attribué
4. L'embed est mis à jour
5. Le bouton disparaît
6. Un message public annonce la désignation

---

## ⚖️ COMMANDE `/fermer-tribunal`

### Syntaxe
```
/fermer-tribunal [channel:optionnel]
```

### Actions Automatiques

1. **Vérification** que c'est bien un channel de procès
2. **Retrait des rôles** :
   - `⚖️ Accusé` de l'accusé
   - `👔 Avocat` de l'avocat du plaignant
   - `👔 Avocat` de l'avocat de la défense
   - `👨‍⚖️ Juge` du juge (si désigné)
3. **Message de clôture**
4. **Suppression du channel** après 10 secondes

### Compteur de Rôles

Le système affiche combien de rôles ont été retirés :
- Maximum : **4 rôles** (1 accusé + 2 avocats + 1 juge)

---

## 📁 FICHIERS MODIFIÉS

### `src/commands/tribunal.js`
✅ Ajout de l'option `avocat` (avocat du plaignant)  
✅ Attribution du rôle avocat à l'avocat du plaignant  
✅ Topic mis à jour avec `AvocatPlaignant` et `AvocatDefense`  
✅ Menu de sélection pour l'avocat de la défense (temporaire)  
✅ Embed d'ouverture permanent avec bouton juge

### `src/handlers/tribunalHandler.js`
✅ Fonction `handleTribunalAvocatDefenseSelection`  
✅ Vérification que seul l'accusé peut sélectionner  
✅ Vérification que l'avocat de la défense ≠ avocat du plaignant  
✅ Attribution du rôle `👔 Avocat`  
✅ Mise à jour de l'embed d'ouverture  
✅ Suppression du message de sélection  
✅ Conservation de la fonction `handleDevenirJuge`

### `src/commands/fermer-tribunal.js`
✅ Parsing de `AvocatPlaignant` et `AvocatDefense` depuis le topic  
✅ Retrait du rôle `👔 Avocat` pour les 2 avocats  
✅ Compteur de rôles mis à jour (max 4)

### `src/bot.js`
✅ Handler pour `tribunal_select_avocat_defense:`  
✅ Handler pour `tribunal_devenir_juge:`

---

## 🔄 FLUX COMPLET

### 1️⃣ Ouverture du Procès

```
Plaignant utilise :
/tribunal accusé:@Bob avocat:@Charlie
```

**Résultat :**
- Channel `procès-de-bob` créé dans `⚖️ TRIBUNAUX`
- `@Bob` reçoit le rôle `⚖️ Accusé`
- `@Charlie` reçoit le rôle `👔 Avocat`
- Embed d'ouverture affiché (avocat de la défense en attente)
- Menu de sélection envoyé à `@Bob`

### 2️⃣ Sélection de l'Avocat de la Défense

```
@Bob clique sur le menu et choisit @Alice
```

**Résultat :**
- `@Alice` reçoit le rôle `👔 Avocat`
- Embed d'ouverture mis à jour
- Menu supprimé
- Message public : "Alice a été désignée avocat de la défense"

### 3️⃣ Désignation du Juge (Optionnelle)

```
@Emma clique sur "👨‍⚖️ Devenir Juge"
```

**Résultat :**
- `@Emma` reçoit le rôle `👨‍⚖️ Juge`
- Embed mis à jour
- Bouton disparaît

### 4️⃣ Fermeture du Procès

```
Admin utilise :
/fermer-tribunal
```

**Résultat :**
- Rôles retirés : `⚖️ Accusé`, `👔 Avocat` (x2), `👨‍⚖️ Juge`
- Message de clôture
- Channel supprimé après 10s

---

## 🎯 STRUCTURE DU TOPIC

```
⚖️ Procès | Plaignant: 123456789 | Accusé: 987654321 | AvocatPlaignant: 111222333 | AvocatDefense: 444555666 | Juge: 777888999
```

### Champs

| Champ | Description | Valeur possible |
|-------|-------------|-----------------|
| `Plaignant` | ID du plaignant | ID Discord |
| `Accusé` | ID de l'accusé | ID Discord |
| `AvocatPlaignant` | ID de l'avocat du plaignant | ID Discord |
| `AvocatDefense` | ID de l'avocat de la défense | ID Discord ou `null` |
| `Juge` | ID du juge | ID Discord ou `null` |

---

## ✅ TESTS EFFECTUÉS

### ✅ Ouverture du procès
- Création du channel ✅
- Attribution des rôles (Accusé + Avocat Plaignant) ✅
- Permissions correctes ✅
- Menu de sélection visible ✅

### ✅ Sélection de l'avocat de la défense
- Seul l'accusé peut sélectionner ✅
- Vérifications (bot, même personne) ✅
- Attribution du rôle ✅
- Mise à jour de l'embed ✅
- Suppression du menu ✅

### ✅ Système de juge
- Bouton visible ✅
- Attribution du rôle ✅
- Mise à jour de l'embed ✅
- Disparition du bouton ✅

### ✅ Fermeture du procès
- Retrait de tous les rôles (4 max) ✅
- Suppression du channel ✅

---

## 📊 STATISTIQUES

| Métrique | Valeur |
|----------|--------|
| **Commandes modifiées** | 2 (`/tribunal`, `/fermer-tribunal`) |
| **Handlers créés/modifiés** | 1 (`tribunalHandler.js`) |
| **Rôles Discord** | 3 (`Accusé`, `Avocat`, `Juge`) |
| **Avocats par procès** | 2 (plaignant + défense) |
| **Permissions gérées** | 4 (ViewChannel, ReadMessageHistory, SendMessages, AddReactions) |

---

## 🚀 DÉPLOIEMENT

```bash
# Connexion SSH
sshpass -p 'bagbot' ssh -p 22222 bagbot@82.67.65.98

# Fichiers modifiés
Bag-bot/src/commands/tribunal.js
Bag-bot/src/commands/fermer-tribunal.js
Bag-bot/src/handlers/tribunalHandler.js
Bag-bot/src/bot.js

# Déploiement des commandes
cd Bag-bot
node deploy-commands.js

# Redémarrage du bot
pm2 restart bagbot
```

**Résultat :**
- ✅ 96 commandes déployées (47 globales + 49 guild)
- ✅ Bot redémarré avec succès
- ✅ Système opérationnel

---

## 🎓 POINTS CLÉS

### Différences avec l'ancienne version

| Aspect | Avant | Après |
|--------|-------|-------|
| **Nombre d'avocats** | 1 (défense) | 2 (plaignant + défense) |
| **Sélection avocat** | Par commande | Plaignant: commande / Défense: menu |
| **Rôles attribués** | 1 avocat | 2 avocats distincts |
| **Topic structure** | `Avocat: ID` | `AvocatPlaignant: ID \| AvocatDefense: ID` |

### Avantages du système à 2 avocats

✅ **Plus réaliste** : Chaque partie a son propre avocat  
✅ **Équitable** : Les deux camps sont représentés  
✅ **Flexible** : L'accusé choisit son défenseur  
✅ **Organisé** : Rôles clairement identifiés

---

## 🛡️ SÉCURITÉ

### Vérifications Implémentées

1. ✅ Impossibilité d'accuser un bot
2. ✅ Impossibilité de choisir un bot comme avocat
3. ✅ Impossibilité de s'accuser soi-même
4. ✅ Impossibilité d'être son propre avocat
5. ✅ Les deux avocats doivent être différents
6. ✅ Seul l'accusé peut choisir son avocat de la défense
7. ✅ Seul un admin peut fermer un procès
8. ✅ Un seul juge par procès

---

## 📞 SUPPORT

En cas de problème :

1. Vérifier les logs : `pm2 logs bagbot`
2. Vérifier le statut : `pm2 status`
3. Redémarrer si nécessaire : `pm2 restart bagbot`

---

**Système développé et testé le 2025-11-19**  
**Version : 2.0 - Deux Avocats**  
**Statut : ✅ PRODUCTION**
