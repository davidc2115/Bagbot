import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Linking } from 'react-native';

/**
 * Service d'Authentification
 * - Email/Mot de passe
 * - OAuth Discord & Google
 */
class AuthService {
  constructor() {
    // Port unique 33437 pour tous les services
    this.baseUrl = 'http://88.174.155.230:33437';
    this.token = null;
    this.user = null;
    this.ADMIN_EMAIL = 'douvdouv21@gmail.com';
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  isAdmin() {
    return this.user?.email?.toLowerCase() === this.ADMIN_EMAIL.toLowerCase() || this.user?.is_admin === true;
  }

  /**
   * Vérifie si l'utilisateur a le statut premium
   */
  isPremium() {
    return this.user?.is_premium === true || this.isAdmin();
  }

  /**
   * Récupère le statut premium depuis le serveur
   * @returns {Promise<boolean>} true si premium ou admin
   */
  async checkPremiumStatus() {
    try {
      // Vérifier d'abord si admin (toujours premium)
      if (this.isAdmin()) {
        console.log('👑 Admin = Premium automatique');
        return true;
      }

      const response = await axios.get(
        `${this.baseUrl}/api/premium/check`,
        { headers: this.getHeaders(), timeout: 5000 }
      );

      if (response.data.success) {
        // Mettre à jour le statut local
        if (this.user) {
          this.user.is_premium = response.data.is_premium;
          this.user.is_admin = response.data.is_admin;
        }
        
        const isPremiumOrAdmin = response.data.is_premium || response.data.is_admin;
        console.log(`💎 Premium check: ${isPremiumOrAdmin} (premium=${response.data.is_premium}, admin=${response.data.is_admin})`);
        return isPremiumOrAdmin;
      }
      
      return this.isPremium();
    } catch (error) {
      console.error('❌ Erreur vérification premium:', error.message);
      // En cas d'erreur réseau, utiliser le statut local
      return this.isPremium();
    }
  }

  /**
   * Récupère les détails complets du statut premium
   */
  async getPremiumDetails() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/premium/check`,
        { headers: this.getHeaders(), timeout: 5000 }
      );

      if (response.data.success) {
        return {
          is_premium: response.data.is_premium,
          is_admin: response.data.is_admin,
          premium_since: response.data.premium_since
        };
      }
      return { is_premium: this.isPremium(), is_admin: this.isAdmin() };
    } catch (error) {
      return { is_premium: this.isPremium(), is_admin: this.isAdmin() };
    }
  }

  /**
   * Initialise le service et vérifie le token existant
   */
  async init() {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      if (savedToken) {
        this.token = savedToken;
        const isValid = await this.verifyToken();
        if (!isValid) {
          await this.logout();
        }
      }
      return this.isLoggedIn();
    } catch (error) {
      console.error('❌ Erreur init AuthService:', error);
      return false;
    }
  }

  /**
   * Headers pour les requêtes authentifiées
   */
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLoggedIn() {
    return !!this.token && !!this.user;
  }

  /**
   * Vérifie si le profil est complété
   */
  isProfileCompleted() {
    return this.user?.profile_completed === true;
  }

  /**
   * Récupère l'utilisateur courant
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Récupère le profil utilisateur
   */
  getProfile() {
    return this.user?.profile || null;
  }

  // ==================== INSCRIPTION ====================

  /**
   * Inscription par email/mot de passe
   */
  async register(email, password) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/register`,
        { email, password },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        await AsyncStorage.setItem('auth_token', this.token);
        console.log('✅ Inscription réussie');
        return { success: true, user: this.user };
      }
      throw new Error(response.data.error || 'Erreur d\'inscription');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('❌ Erreur inscription:', message);
      return { success: false, error: message };
    }
  }

  // ==================== CONNEXION ====================

  /**
   * Connexion par email/mot de passe
   */
  async login(email, password) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/login`,
        { email, password },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        await AsyncStorage.setItem('auth_token', this.token);
        console.log('✅ Connexion réussie');
        return { success: true, user: this.user };
      }
      throw new Error(response.data.error || 'Erreur de connexion');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('❌ Erreur connexion:', message);
      return { success: false, error: message };
    }
  }

  // ==================== OAUTH ====================

  /**
   * Connexion Discord
   */
  async loginWithDiscord() {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/discord`, { timeout: 5000 });
      
      if (response.data.success && response.data.url) {
        await Linking.openURL(response.data.url);
        return { success: true, pending: true };
      }
      throw new Error(response.data.error || 'Discord non configuré');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('❌ Erreur Discord:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Connexion Google
   */
  async loginWithGoogle() {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/google`, { timeout: 5000 });
      
      if (response.data.success && response.data.url) {
        await Linking.openURL(response.data.url);
        return { success: true, pending: true };
      }
      throw new Error(response.data.error || 'Google non configuré');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('❌ Erreur Google:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Traite le callback OAuth (appelé depuis le deep link)
   */
  async handleOAuthCallback(token) {
    try {
      this.token = token;
      await AsyncStorage.setItem('auth_token', token);
      
      // Vérifier et récupérer le profil
      const isValid = await this.verifyToken();
      if (isValid) {
        console.log('✅ OAuth réussi');
        return { success: true, user: this.user };
      }
      throw new Error('Token invalide');
    } catch (error) {
      console.error('❌ Erreur OAuth callback:', error);
      await this.logout();
      return { success: false, error: error.message };
    }
  }

  // ==================== TOKEN ====================

  /**
   * Vérifie le token et récupère le profil
   */
  async verifyToken() {
    try {
      if (!this.token) return false;

      const response = await axios.get(
        `${this.baseUrl}/auth/verify`,
        { headers: this.getHeaders(), timeout: 5000 }
      );

      if (response.data.success && response.data.valid) {
        this.user = response.data.user;
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      return false;
    }
  }

  // ==================== PROFIL ====================

  /**
   * Récupère le profil depuis le serveur
   */
  async fetchProfile() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/auth/profile`,
        { headers: this.getHeaders(), timeout: 5000 }
      );

      if (response.data.success) {
        this.user = response.data.user;
        return this.user;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur fetch profile:', error);
      return null;
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  async updateProfile(profile) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/auth/profile`,
        { profile },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        this.user = response.data.user;
        console.log('✅ Profil mis à jour');
        return { success: true, user: this.user };
      }
      throw new Error(response.data.error || 'Erreur mise à jour');
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('❌ Erreur update profile:', message);
      return { success: false, error: message };
    }
  }

  // ==================== DÉCONNEXION ====================

  /**
   * Déconnexion
   */
  async logout() {
    try {
      if (this.token) {
        await axios.post(
          `${this.baseUrl}/auth/logout`,
          {},
          { headers: this.getHeaders(), timeout: 5000 }
        ).catch(() => {}); // Ignorer les erreurs
      }
    } finally {
      this.token = null;
      this.user = null;
      await AsyncStorage.removeItem('auth_token');
      console.log('✅ Déconnexion');
    }
  }

  // ==================== PERSONNAGES ====================

  /**
   * Récupère les personnages de l'utilisateur depuis le serveur
   */
  async getMyCharacters() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/auth/characters`,
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        return response.data.characters;
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur get characters:', error);
      return [];
    }
  }

  /**
   * Sauvegarde un personnage sur le serveur
   */
  async saveCharacter(character) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/characters`,
        { character },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (response.data.success) {
        return response.data.character;
      }
      throw new Error(response.data.error || 'Erreur sauvegarde');
    } catch (error) {
      console.error('❌ Erreur save character:', error);
      throw error;
    }
  }

  /**
   * Supprime un personnage du serveur
   */
  async deleteCharacter(characterId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/auth/characters/${characterId}`,
        { headers: this.getHeaders(), timeout: 10000 }
      );

      return response.data.success;
    } catch (error) {
      console.error('❌ Erreur delete character:', error);
      return false;
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Vérifie si le serveur est accessible
   * v5.0.6 - Timeout augmenté et meilleure gestion des erreurs
   */
  async checkServerHealth() {
    try {
      console.log('🔍 Vérification serveur Freebox...');
      const response = await axios.get(`${this.baseUrl}/health`, { 
        timeout: 15000, // 15 secondes pour réseaux lents
        validateStatus: (status) => status < 500
      });
      const isOnline = response.data?.status === 'ok';
      console.log(isOnline ? '✅ Serveur Freebox en ligne' : '⚠️ Serveur répond mais statut non-ok');
      return isOnline;
    } catch (error) {
      const errMsg = error?.message || '';
      if (errMsg.includes('timeout') || errMsg.includes('ECONNABORTED')) {
        console.log('⏱️ Timeout - Le serveur met trop de temps à répondre');
      } else if (errMsg.includes('Network') || errMsg.includes('ECONNREFUSED')) {
        console.log('📵 Erreur réseau - Serveur inaccessible');
      } else {
        console.log('❌ Erreur vérification serveur:', errMsg);
      }
      return false;
    }
  }
  
  /**
   * Retourne un message d'erreur utilisateur-friendly
   */
  getConnectionErrorMessage(error) {
    const errMsg = (error?.message || '').toLowerCase();
    const errCode = error?.code || '';
    
    if (errMsg.includes('timeout') || errCode === 'ECONNABORTED') {
      return {
        title: '⏱️ Connexion lente',
        message: 'Le serveur met du temps à répondre. Vérifie ta connexion internet et réessaie.',
        canRetry: true
      };
    }
    
    if (errMsg.includes('network') || errCode === 'ERR_NETWORK') {
      return {
        title: '📵 Pas de connexion',
        message: 'Vérifie ta connexion Wi-Fi ou données mobiles.',
        canRetry: true
      };
    }
    
    if (errMsg.includes('econnrefused') || errCode === 'ECONNREFUSED') {
      return {
        title: '🔧 Serveur temporairement indisponible',
        message: 'Le serveur est peut-être en maintenance. Réessaie dans quelques minutes.',
        canRetry: true
      };
    }
    
    return {
      title: '❌ Erreur de connexion',
      message: error?.response?.data?.error || errMsg || 'Une erreur est survenue.',
      canRetry: true
    };
  }
}

export default new AuthService();
