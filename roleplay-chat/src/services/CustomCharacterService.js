import AsyncStorage from '@react-native-async-storage/async-storage';
import SyncService from './SyncService';
import AuthService from './AuthService';
import axios from 'axios';

class CustomCharacterService {
  constructor() {
    this.FREEBOX_URL = 'http://88.174.155.230:33437';
  }
  
  /**
   * Récupère la clé de stockage unique pour l'utilisateur connecté
   */
  getUserStorageKey() {
    const user = AuthService.getCurrentUser();
    const userId = user?.id || 'anonymous';
    return `custom_characters_${userId}`;
  }

  /**
   * Synchronise les personnages vers le serveur Freebox
   * ET publie automatiquement pour que tous les utilisateurs puissent les voir
   */
  async syncToServer() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user?.id) {
        console.log('⚠️ Pas connecté, sync impossible');
        return false;
      }

      const characters = await this.getCustomCharacters();
      
      // 1. Sync vers le compte utilisateur
      const response = await axios.post(
        `${this.FREEBOX_URL}/api/user-characters/sync`,
        { 
          userId: user.id, 
          email: user.email,
          characters: characters 
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000 
        }
      );

      // 2. Publier TOUS les personnages comme publics pour les autres utilisateurs
      // Forcer la mise à jour avec updatedAt
      for (const char of characters) {
        try {
          const charToPublish = { 
            ...char, 
            isPublic: true,
            updatedAt: char.updatedAt || Date.now(),
            syncedAt: Date.now()
          };
          
          // Appel direct à l'API pour publier/mettre à jour
          await axios.post(
            `${this.FREEBOX_URL}/api/characters/public`,
            { character: charToPublish },
            { 
              headers: { 
                'Content-Type': 'application/json',
                'X-User-ID': user.id
              },
              timeout: 10000 
            }
          );
          console.log(`✅ Personnage publié: ${char.name}`);
        } catch (e) {
          console.log(`⚠️ Erreur publication ${char.name}:`, e.message);
        }
      }

      if (response.data?.success) {
        console.log(`✅ ${characters.length} personnages synchronisés`);
        await AsyncStorage.setItem('last_characters_sync', Date.now().toString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur sync personnages:', error.message);
      return false;
    }
  }

  /**
   * Récupère les personnages depuis le serveur Freebox
   */
  async syncFromServer() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user?.id) return false;

      const response = await axios.get(
        `${this.FREEBOX_URL}/api/user-characters/${user.id}`,
        { timeout: 15000 }
      );

      if (response.data?.success && response.data.characters) {
        const key = this.getUserStorageKey();
        const localChars = await this.getCustomCharacters();
        const serverChars = response.data.characters;

        // Fusionner : garder le plus récent
        const merged = this.mergeCharacters(localChars, serverChars);
        await AsyncStorage.setItem(key, JSON.stringify(merged));
        
        console.log(`✅ ${merged.length} personnages récupérés du serveur`);
        return merged;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur récupération personnages:', error.message);
      return false;
    }
  }

  /**
   * Fusionne les personnages locaux et serveur
   */
  mergeCharacters(local, server) {
    const merged = new Map();
    
    // Ajouter tous les personnages locaux
    local.forEach(char => merged.set(char.id, char));
    
    // Fusionner avec le serveur (garder le plus récent)
    server.forEach(serverChar => {
      const existing = merged.get(serverChar.id);
      if (!existing) {
        merged.set(serverChar.id, serverChar);
      } else {
        // Garder le plus récent
        const localTime = existing.updatedAt || existing.createdAt || 0;
        const serverTime = serverChar.updatedAt || serverChar.createdAt || 0;
        if (serverTime > localTime) {
          merged.set(serverChar.id, serverChar);
        }
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Sauvegarde un personnage personnalisé
   * @param {object} character - Le personnage à sauvegarder
   * @param {boolean} isPublic - Si true, le personnage sera publié sur le serveur
   */
  async saveCustomCharacter(character, isPublic = false) {
    try {
      const key = this.getUserStorageKey();
      const existing = await AsyncStorage.getItem(key);
      const characters = existing ? JSON.parse(existing) : [];
      
      const user = AuthService.getCurrentUser();
      
      // Générer un ID unique
      const newCharacter = {
        ...character,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isCustom: true,
        isPublic: isPublic,
        createdBy: user?.id || 'anonymous',
        createdByEmail: user?.email || null,
        createdAt: Date.now(),
        // Assurer des valeurs par défaut pour description et tags
        scenario: character.scenario || character.description || '',
        description: character.description || character.scenario || '',
        personality: character.personality || '',
        tags: character.tags || [],
      };
      
      characters.push(newCharacter);
      await AsyncStorage.setItem(key, JSON.stringify(characters));
      
      // SYNCHRONISATION AUTOMATIQUE vers le serveur
      this.syncToServer().catch(e => console.log('Sync auto échoué:', e.message));
      
      // Si public, publier sur le serveur
      if (isPublic) {
        try {
          await SyncService.init();
          const charToPublish = { ...newCharacter, isPublic: true };
          const publishedChar = await SyncService.publishCharacter(charToPublish);
          if (publishedChar && publishedChar.id) {
            newCharacter.serverId = publishedChar.id;
            await this.updateCustomCharacter(newCharacter.id, { serverId: publishedChar.id });
          }
          console.log('✅ Personnage publié sur le serveur:', newCharacter.name);
        } catch (error) {
          console.error('⚠️ Erreur publication:', error.message);
        }
      }
      
      return newCharacter;
    } catch (error) {
      console.error('Error saving custom character:', error);
      throw error;
    }
  }

  /**
   * Récupère les personnages de l'utilisateur connecté uniquement
   * Synchronise automatiquement depuis le serveur si possible
   */
  async getCustomCharacters() {
    try {
      const key = this.getUserStorageKey();
      const data = await AsyncStorage.getItem(key);
      let localChars = data ? JSON.parse(data) : [];
      
      // Essayer de synchroniser depuis le serveur
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        try {
          const merged = await this.syncFromServer();
          if (merged && merged.length > 0) {
            console.log('✅ Personnages synchronisés depuis le serveur');
            localChars = merged;
          }
        } catch (e) {
          console.log('Sync serveur échoué:', e.message);
        }
      }
      
      return localChars;
    } catch (error) {
      console.error('Error getting custom characters:', error);
      return [];
    }
  }

  /**
   * Récupère les personnages de l'utilisateur + personnages publics des autres
   */
  async getAllVisibleCharacters() {
    try {
      // Personnages de l'utilisateur
      const myCharacters = await this.getCustomCharacters();
      
      // Personnages publics du serveur (des autres utilisateurs)
      let publicCharacters = [];
      try {
        await SyncService.init();
        const serverPublic = await SyncService.getCachedPublicCharacters();
        const user = AuthService.getCurrentUser();
        const myUserId = user?.id;
        
        // Filtrer pour ne pas inclure mes propres personnages (déjà dans myCharacters)
        publicCharacters = serverPublic.filter(char => {
          return char.createdBy !== myUserId;
        });
      } catch (e) {
        console.log('⚠️ Impossible de charger les personnages publics:', e.message);
      }
      
      return [...myCharacters, ...publicCharacters];
    } catch (error) {
      console.error('Error getting all visible characters:', error);
      return [];
    }
  }

  async deleteCustomCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const charToDelete = characters.find(char => char.id === characterId);
      
      // Si le personnage était public, le retirer du serveur
      if (charToDelete?.isPublic && charToDelete?.serverId) {
        try {
          await SyncService.init();
          await SyncService.unpublishCharacter(charToDelete.serverId);
        } catch (e) {
          console.log('⚠️ Erreur retrait du serveur:', e.message);
        }
      }
      
      const updated = characters.filter(char => char.id !== characterId);
      await AsyncStorage.setItem(this.getUserStorageKey(), JSON.stringify(updated));
      
      // SYNCHRONISATION AUTOMATIQUE après suppression
      this.syncToServer().catch(e => console.log('Sync auto échoué:', e.message));
      
      return updated;
    } catch (error) {
      console.error('Error deleting custom character:', error);
      throw error;
    }
  }

  async updateCustomCharacter(characterId, updates) {
    try {
      const characters = await this.getCustomCharacters();
      const index = characters.findIndex(char => char.id === characterId);
      
      if (index !== -1) {
        characters[index] = { ...characters[index], ...updates, updatedAt: Date.now() };
        await AsyncStorage.setItem(this.getUserStorageKey(), JSON.stringify(characters));
        
        // SYNCHRONISATION AUTOMATIQUE après modification
        this.syncToServer().catch(e => console.log('Sync auto échoué:', e.message));
        
        return characters[index];
      }
      
      throw new Error('Character not found');
    } catch (error) {
      console.error('Error updating custom character:', error);
      throw error;
    }
  }

  /**
   * Publie un personnage existant sur le serveur
   */
  async publishCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (!character) {
        throw new Error('Personnage non trouvé');
      }

      await SyncService.init();
      
      // S'assurer que le personnage est bien marqué comme public et a toutes les infos
      const charToPublish = { 
        ...character, 
        isPublic: true,
        scenario: character.scenario || character.description || 'Personnage mystérieux',
        description: character.description || character.scenario || '',
        tags: character.tags || [],
      };
      
      const publishedChar = await SyncService.publishCharacter(charToPublish);
      
      // Mettre à jour le statut local
      await this.updateCustomCharacter(characterId, {
        isPublic: true,
        serverId: publishedChar.id
      });

      console.log('✅ Personnage publié:', character.name);
      return publishedChar;
    } catch (error) {
      console.error('Error publishing character:', error);
      throw error;
    }
  }

  /**
   * Retire un personnage du serveur public
   */
  async unpublishCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (!character) {
        throw new Error('Personnage non trouvé');
      }

      const serverIdToRemove = character.serverId || characterId;
      
      await SyncService.init();
      await SyncService.unpublishCharacter(serverIdToRemove);
      
      // Mettre à jour le statut local
      await this.updateCustomCharacter(characterId, {
        isPublic: false,
        serverId: null
      });

      return true;
    } catch (error) {
      console.error('Error unpublishing character:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les personnages publics du serveur
   */
  async getPublicCharacters() {
    try {
      await SyncService.init();
      return await SyncService.getPublicCharacters();
    } catch (error) {
      console.error('Error getting public characters:', error);
      return [];
    }
  }

  /**
   * Télécharge un personnage public et l'ajoute aux personnages locaux
   */
  async downloadPublicCharacter(characterId) {
    try {
      await SyncService.init();
      const character = await SyncService.downloadPublicCharacter(characterId);
      
      if (character) {
        const user = AuthService.getCurrentUser();
        
        // Sauvegarder localement avec un nouvel ID
        const localCharacter = {
          ...character,
          id: `downloaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalId: character.id,
          isCustom: true,
          isPublic: false, // Le personnage téléchargé est privé par défaut
          isDownloaded: true,
          downloadedBy: user?.id || 'anonymous',
          downloadedAt: Date.now()
        };

        const key = this.getUserStorageKey();
        const existing = await AsyncStorage.getItem(key);
        const characters = existing ? JSON.parse(existing) : [];
        characters.push(localCharacter);
        await AsyncStorage.setItem(key, JSON.stringify(characters));

        return localCharacter;
      }
      return null;
    } catch (error) {
      console.error('Error downloading public character:', error);
      throw error;
    }
  }

  /**
   * Like un personnage public
   */
  async likePublicCharacter(characterId) {
    try {
      await SyncService.init();
      return await SyncService.likeCharacter(characterId);
    } catch (error) {
      console.error('Error liking character:', error);
      return null;
    }
  }

  /**
   * Migrer les anciens personnages vers le nouveau système par utilisateur
   */
  async migrateOldCharacters() {
    try {
      const oldKey = 'custom_characters';
      const oldData = await AsyncStorage.getItem(oldKey);
      
      if (oldData) {
        const oldCharacters = JSON.parse(oldData);
        const user = AuthService.getCurrentUser();
        
        if (user && oldCharacters.length > 0) {
          // Vérifier si les personnages appartiennent à cet utilisateur
          const myOldChars = oldCharacters.filter(char => {
            // Si pas de createdBy, on considère que c'est l'utilisateur courant
            return !char.createdBy || char.createdBy === user.id;
          });
          
          if (myOldChars.length > 0) {
            const newKey = this.getUserStorageKey();
            const existingNew = await AsyncStorage.getItem(newKey);
            const existingChars = existingNew ? JSON.parse(existingNew) : [];
            
            // Ajouter les anciens personnages s'ils n'existent pas déjà
            for (const oldChar of myOldChars) {
              const exists = existingChars.some(c => c.id === oldChar.id);
              if (!exists) {
                existingChars.push({
                  ...oldChar,
                  createdBy: user.id,
                  createdByEmail: user.email
                });
              }
            }
            
            await AsyncStorage.setItem(newKey, JSON.stringify(existingChars));
            console.log(`✅ Migré ${myOldChars.length} personnages vers le nouveau système`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur migration:', error);
    }
  }
}

export default new CustomCharacterService();
