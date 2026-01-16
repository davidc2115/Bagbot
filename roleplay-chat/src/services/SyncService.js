import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service de Synchronisation avec le serveur Freebox
 * - Sync des données utilisateur
 * - Gestion des personnages publics
 */
class SyncService {
  constructor() {
    // Port unique 33437 pour tous les services
    this.baseUrl = 'http://88.174.155.230:33437';
    this.userId = null;
    this.lastSync = null;
    this.autoSyncInterval = null;
  }

  /**
   * Initialise le service et récupère l'ID utilisateur
   */
  async init() {
    try {
      // Récupérer ou générer l'ID utilisateur
      let userId = await AsyncStorage.getItem('sync_user_id');
      if (!userId) {
        userId = this.generateUserId();
        await AsyncStorage.setItem('sync_user_id', userId);
      }
      this.userId = userId;

      // Récupérer la dernière sync
      const lastSync = await AsyncStorage.getItem('sync_last_time');
      this.lastSync = lastSync ? parseInt(lastSync) : null;

      console.log('✅ SyncService initialisé, userId:', this.userId);
      return true;
    } catch (error) {
      console.error('❌ Erreur init SyncService:', error);
      return false;
    }
  }

  /**
   * Génère un ID utilisateur unique
   */
  generateUserId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `user_${timestamp}_${random}`;
  }

  /**
   * Configure l'URL du serveur
   */
  async setServerUrl(url) {
    this.baseUrl = url;
    await AsyncStorage.setItem('sync_server_url', url);
  }

  /**
   * Récupère l'URL du serveur configurée
   */
  async getServerUrl() {
    const url = await AsyncStorage.getItem('sync_server_url');
    if (url) this.baseUrl = url;
    return this.baseUrl;
  }

  /**
   * Vérifie si le serveur est accessible
   */
  async checkServerHealth() {
    try {
      // Essayer d'abord /health puis /api/health
      let response;
      try {
        response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      } catch {
        response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      }
      return response.data.status === 'ok';
    } catch (error) {
      console.error('❌ Serveur inaccessible:', error.message);
      return false;
    }
  }

  /**
   * Headers pour les requêtes
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-User-ID': this.userId
    };
  }

  // ==================== PERSONNAGES PUBLICS ====================

  /**
   * Récupère tous les personnages publics du serveur
   */
  async getPublicCharacters() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/characters/public`,
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        // Marquer les personnages comme venant du serveur
        const characters = response.data.characters.map(char => ({
          ...char,
          isFromServer: true,
          isPublic: true
        }));

        // Mettre en cache localement
        await AsyncStorage.setItem('cached_public_characters', JSON.stringify(characters));
        await AsyncStorage.setItem('cached_public_characters_time', Date.now().toString());

        console.log(`✅ ${characters.length} personnages publics récupérés`);
        return characters;
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur récupération personnages publics:', error.message);
      
      // Retourner le cache si disponible
      const cached = await AsyncStorage.getItem('cached_public_characters');
      if (cached) {
        console.log('📦 Utilisation du cache personnages publics');
        return JSON.parse(cached);
      }
      return [];
    }
  }

  /**
   * Publie un personnage (le rend public)
   */
  async publishCharacter(character) {
    try {
      if (!this.userId) await this.init();

      const response = await axios.post(
        `${this.baseUrl}/api/characters/public`,
        { character },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        console.log('✅ Personnage publié:', character.name);
        return response.data.character;
      }
      throw new Error(response.data.error || 'Erreur de publication');
    } catch (error) {
      console.error('❌ Erreur publication personnage:', error.message);
      throw error;
    }
  }

  /**
   * Retire un personnage des publics
   */
  async unpublishCharacter(characterId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/api/characters/public/${characterId}`,
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        console.log('✅ Personnage retiré des publics');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur retrait personnage:', error.message);
      return false;
    }
  }

  /**
   * Like un personnage public
   */
  async likeCharacter(characterId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/characters/public/${characterId}/like`,
        {},
        { headers: this.getHeaders(), timeout: 5000 }
      );
      return response.data.success ? response.data.likes : null;
    } catch (error) {
      console.error('❌ Erreur like:', error.message);
      return null;
    }
  }

  /**
   * Télécharge un personnage public
   */
  async downloadPublicCharacter(characterId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/characters/public/${characterId}/download`,
        {},
        { headers: this.getHeaders(), timeout: 5000 }
      );
      
      if (response.data.success) {
        return response.data.character;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error.message);
      return null;
    }
  }

  // ==================== SYNCHRONISATION ====================

  /**
   * Upload toutes les données vers le serveur
   */
  async syncUpload() {
    try {
      if (!this.userId) await this.init();

      // Collecter toutes les données à synchroniser
      const syncData = {};

      // Profil utilisateur
      const profile = await AsyncStorage.getItem('user_profile');
      if (profile) syncData.profile = JSON.parse(profile);

      // Personnages créés
      const customChars = await AsyncStorage.getItem('custom_characters');
      if (customChars) syncData.customCharacters = JSON.parse(customChars);

      // Conversations (liste des clés)
      const allKeys = await AsyncStorage.getAllKeys();
      const convKeys = allKeys.filter(k => k.startsWith('conversation_'));
      const conversations = [];
      for (const key of convKeys) {
        const conv = await AsyncStorage.getItem(key);
        if (conv) conversations.push({ key, data: JSON.parse(conv) });
      }
      syncData.conversations = conversations;

      // Paramètres
      const settings = {};
      const settingsKeys = ['groq_api_keys', 'selected_groq_model', 'image_source', 'freebox_url'];
      for (const key of settingsKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) settings[key] = value;
      }
      syncData.settings = settings;

      // Données de niveau
      const levelData = await AsyncStorage.getItem('user_level_data');
      if (levelData) syncData.levelData = JSON.parse(levelData);

      // Envoyer au serveur
      const response = await axios.post(
        `${this.baseUrl}/api/sync/upload`,
        syncData,
        { headers: this.getHeaders(), timeout: 30000 }
      );

      if (response.data.success) {
        this.lastSync = Date.now();
        await AsyncStorage.setItem('sync_last_time', this.lastSync.toString());
        console.log('✅ Synchronisation upload réussie');
        return response.data.syncData;
      }
      throw new Error(response.data.error || 'Erreur de sync');
    } catch (error) {
      console.error('❌ Erreur sync upload:', error.message);
      throw error;
    }
  }

  /**
   * Télécharge les données depuis le serveur
   */
  async syncDownload() {
    try {
      if (!this.userId) await this.init();

      const response = await axios.get(
        `${this.baseUrl}/api/sync/download`,
        { headers: this.getHeaders(), timeout: 30000 }
      );

      if (response.data.success && response.data.hasData) {
        // Restaurer le profil
        if (response.data.profile) {
          await AsyncStorage.setItem('user_profile', JSON.stringify(response.data.profile));
        }

        // Restaurer les personnages créés
        if (response.data.customCharacters) {
          await AsyncStorage.setItem('custom_characters', JSON.stringify(response.data.customCharacters));
        }

        // Restaurer les conversations
        if (response.data.conversations) {
          for (const conv of response.data.conversations) {
            await AsyncStorage.setItem(conv.key, JSON.stringify(conv.data));
          }
        }

        // Restaurer les paramètres
        if (response.data.settings) {
          for (const [key, value] of Object.entries(response.data.settings)) {
            await AsyncStorage.setItem(key, value);
          }
        }

        // Restaurer les données de niveau
        if (response.data.levelData) {
          await AsyncStorage.setItem('user_level_data', JSON.stringify(response.data.levelData));
        }

        this.lastSync = Date.now();
        await AsyncStorage.setItem('sync_last_time', this.lastSync.toString());

        console.log('✅ Synchronisation download réussie');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur sync download:', error.message);
      throw error;
    }
  }

  /**
   * Vérifie le statut de synchronisation
   */
  async getSyncStatus() {
    try {
      if (!this.userId) await this.init();

      // Vérifier d'abord si le serveur est en ligne
      const serverOnline = await this.checkServerHealth();
      
      if (serverOnline) {
        return {
          serverOnline: true,
          synced: this.lastSync !== null,
          lastSync: this.lastSync,
          userId: this.userId
        };
      }
      
      return {
        serverOnline: false,
        synced: false,
        lastSync: this.lastSync,
        userId: this.userId
      };
    } catch (error) {
      return {
        serverOnline: false,
        synced: false,
        lastSync: this.lastSync,
        userId: this.userId
      };
    }
  }

  /**
   * Récupère les statistiques du serveur
   */
  async getServerStats() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/stats`,
        { timeout: 5000 }
      );
      return response.data.success ? response.data.stats : null;
    } catch (error) {
      return null;
    }
  }

  // ==================== AUTO SYNC ====================

  /**
   * Démarre la synchronisation automatique des personnages publics
   */
  startAutoSync(intervalMinutes = 15) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    // Sync immédiate au démarrage
    this.syncPublicCharacters();

    // Puis toutes les X minutes
    this.autoSyncInterval = setInterval(() => {
      this.syncPublicCharacters();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Auto-sync démarré (toutes les ${intervalMinutes} min)`);
  }

  /**
   * Arrête la synchronisation automatique
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('🛑 Auto-sync arrêté');
    }
  }

  /**
   * Synchronise les personnages publics en arrière-plan
   */
  async syncPublicCharacters() {
    try {
      const characters = await this.getPublicCharacters();
      if (characters.length > 0) {
        console.log(`🔄 Auto-sync: ${characters.length} personnages publics mis en cache`);
      }
      return characters;
    } catch (error) {
      console.error('❌ Erreur auto-sync:', error.message);
      return [];
    }
  }

  /**
   * Récupère les personnages publics depuis le cache ou le serveur
   * Force un refresh si le cache a plus de 2 minutes
   */
  async getCachedPublicCharacters() {
    try {
      const cachedTime = await AsyncStorage.getItem('cached_public_characters_time');
      const cacheAge = cachedTime ? (Date.now() - parseInt(cachedTime)) : Infinity;
      
      // Si le cache a plus de 2 minutes, forcer le refresh
      if (cacheAge > 2 * 60 * 1000) {
        console.log('🔄 Cache personnages publics expiré, refresh...');
        return await this.getPublicCharacters();
      }
      
      const cached = await AsyncStorage.getItem('cached_public_characters');
      if (cached) {
        return JSON.parse(cached);
      }
      // Si pas de cache, charger depuis le serveur
      return await this.getPublicCharacters();
    } catch (error) {
      return [];
    }
  }
}

export default new SyncService();
