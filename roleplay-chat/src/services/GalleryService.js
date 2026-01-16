import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class GalleryService {
  /**
   * Récupère l'ID de l'utilisateur courant
   */
  async getCurrentUserId() {
    try {
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      return 'anonymous';
    }
  }

  async saveImageToGallery(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const existing = await AsyncStorage.getItem(key);
      const gallery = existing ? JSON.parse(existing) : [];
      
      // Vérifier si l'URL existe déjà
      const urlExists = gallery.some(item => {
        const url = typeof item === 'string' ? item : item.url;
        return url === imageUrl;
      });
      
      if (!urlExists) {
        // Ajouter simplement l'URL comme string (plus simple)
        gallery.unshift(imageUrl);
        
        // Limiter à 50 images par personnage
        if (gallery.length > 50) {
          gallery.pop();
        }
        
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        console.log(`🖼️ Image sauvegardée: ${key}`);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      throw error;
    }
  }

  async getGallery(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const gallery = JSON.parse(data);
        return gallery.map(item => typeof item === 'string' ? item : item.url);
      }
      
      // Migration: essayer l'ancienne clé
      const oldKey = `gallery_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration galerie: ${oldKey} -> ${key}`);
        await AsyncStorage.setItem(key, oldData);
        return JSON.parse(oldData).map(item => typeof item === 'string' ? item : item.url);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting gallery:', error);
      return [];
    }
  }

  async deleteImage(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      
      const gallery = JSON.parse(data);
      // Filtrer par URL (compatible avec ancien et nouveau format)
      const updated = gallery.filter(item => {
        const url = typeof item === 'string' ? item : item.url;
        return url !== imageUrl;
      });
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated.map(item => typeof item === 'string' ? item : item.url);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  async setConversationBackground(conversationId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `bg_${userId}_${conversationId}`;
      await AsyncStorage.setItem(key, imageUrl);
    } catch (error) {
      console.error('Error setting background:', error);
    }
  }

  async getConversationBackground(conversationId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `bg_${userId}_${conversationId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) return data;
      
      // Migration
      const oldKey = `bg_${conversationId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        await AsyncStorage.setItem(key, oldData);
        return oldData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting background:', error);
      return null;
    }
  }
}

export default new GalleryService();
