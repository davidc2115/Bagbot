# 🏛️ Intégration du Système Tribunal

## Fichiers Créés

✅ `/workspace/src/commands/tribunal.js` - Commande pour ouvrir un procès  
✅ `/workspace/src/commands/fermer-tribunal.js` - Commande pour fermer un procès  
✅ `/workspace/src/handlers/tribunalHandler.js` - Gestionnaires d'interactions

## Intégration dans le Bot Principal

Pour que le système tribunal fonctionne, vous devez ajouter les gestionnaires d'interactions dans votre fichier bot principal.

### Étape 1 : Importer le handler

Ajoutez en haut du fichier bot principal :

```javascript
const { handleTribunalAvocatDefenseSelection, handleDevenirJuge } = require('./handlers/tribunalHandler');
```

### Étape 2 : Ajouter les gestionnaires d'interactions

Dans l'événement `interactionCreate`, ajoutez :

```javascript
client.on('interactionCreate', async interaction => {
    // ... code existant pour les commandes slash ...

    // Gestion des menus de sélection
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('tribunal_select_avocat_defense:')) {
            return handleTribunalAvocatDefenseSelection(interaction);
        }
    }

    // Gestion des boutons
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('tribunal_devenir_juge:')) {
            return handleDevenirJuge(interaction);
        }
    }
});
```

## Déploiement des Commandes

Pour que les commandes `/tribunal` et `/fermer-tribunal` apparaissent dans Discord :

```bash
cd /workspace
node deploy-commands.js
# ou
node src/deploy-commands.js
```

## Tests Recommandés

### Test 1 : Ouverture du Procès
```
/tribunal accusé:@User1 avocat:@User2 chef-accusation:"Vol de cookies"
```

**Vérifications :**
- ✅ Channel créé dans la catégorie "⚖️ TRIBUNAUX"
- ✅ Rôles attribués (Accusé, Avocat)
- ✅ Embed d'ouverture affiché
- ✅ Menu de sélection envoyé à l'accusé
- ✅ Bouton "Devenir Juge" présent

### Test 2 : Sélection Avocat de la Défense
```
L'accusé sélectionne un membre dans le menu
```

**Vérifications :**
- ✅ Rôle Avocat attribué
- ✅ Embed mis à jour
- ✅ Menu supprimé
- ✅ Message de confirmation

### Test 3 : Désignation du Juge
```
Un membre clique sur "Devenir Juge"
```

**Vérifications :**
- ✅ Rôle Juge attribué
- ✅ Embed mis à jour
- ✅ Bouton supprimé

### Test 4 : Fermeture
```
/fermer-tribunal
```

**Vérifications :**
- ✅ Tous les rôles retirés
- ✅ Message de clôture
- ✅ Channel supprimé après 10s

## Rôles Discord Créés Automatiquement

| Rôle | Couleur | Description |
|------|---------|-------------|
| ⚖️ Accusé | Rouge (0xFF0000) | Attribué à l'accusé |
| 👔 Avocat | Bleu (0x2196F3) | Attribué aux 2 avocats |
| 👨‍⚖️ Juge | Or (0xFFD700) | Attribué au juge volontaire |

## Structure du Topic

Le topic du channel tribunal contient toutes les informations :

```
⚖️ Procès | Plaignant: ID | Accusé: ID | AvocatPlaignant: ID | AvocatDefense: ID | Juge: ID | ChefAccusation: BASE64
```

Le chef d'accusation est encodé en Base64 pour éviter les problèmes avec les caractères spéciaux.

## Permissions Requises

Les commandes nécessitent la permission `ManageChannels` (Gérer les salons).

## Notes Importantes

- ✅ Système complet avec 2 avocats
- ✅ Chef d'accusation obligatoire
- ✅ Gestion automatique des rôles
- ✅ Interface intuitive avec boutons et menus
- ✅ Vérifications de sécurité complètes
- ✅ Support jusqu'à 25 membres pour l'avocat de la défense (limite Discord)

## Troubleshooting

### Les commandes n'apparaissent pas
→ Exécutez `node deploy-commands.js`

### Les interactions ne fonctionnent pas
→ Vérifiez que les handlers sont bien ajoutés dans le fichier bot principal

### Erreur de permissions
→ Vérifiez que le bot a la permission "Gérer les salons" et "Gérer les rôles"

### Le menu de sélection ne s'affiche pas
→ Vérifiez qu'il y a au moins 1 membre disponible (non-bot, différent de l'accusé et de l'avocat du plaignant)

---

**Système créé le** : 23 Décembre 2025  
**Basé sur** : Documentation complète de la branche `origin/cursor/debug-mot-cache-game-on-freebox-7916`  
**Statut** : ✅ Prêt pour intégration et tests
