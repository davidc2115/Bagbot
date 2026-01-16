import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Linking } from 'react-native';

/**
 * Service d'Authentification v5.0.7
 * - Email/Mot de passe
 * - OAuth Discord & Google
 * - Gestion améliorée des erreurs de connexion
 * - Mode hors-ligne avec données locales
 */
class AuthService {
  constructor() {
    // Port unique 33437 pour tous les services
    this.baseUrl = 'http://88.174.155.230:33437';
    this.token = null;
    this.user = null;
    this.ADMIN_EMAIL = 'douvdouv21@gmail.com';
    
    // v5.0.7: État de connexion
    this.isServerOnline = null;
    this.lastServerCheck = 0;
    this.offlineMode = false;
    
    // Timeouts configurables
    this.TIMEOUT_SHORT = 5000;  // 5 secondes pour les vérifications
    this.TIMEOUT_NORMAL = 10000; // 10 secondes pour les opérations
    this.TIMEOUT_LONG = 30000;  // 30 secondes pour les gros transferts
  }
  
  /**
   * v5.0.7 - Génère un message d'erreur clair pour l'utilisateur
   */
  getErrorMessage(error) {
    const msg = error?.message?.toLowerCase() || '';
    const code = error?.code || '';
    
    if (msg.includes('network') || msg.includes('internet') || code === 'ERR_NETWORK') {
      return {
        title: '📵 Pas de connexion Internet',
        message: 'Vérifie ta connexion Wi-Fi ou données mobiles.',
        canRetry: true,
        isOffline: true
      };
    }
    
    if (msg.includes('timeout') || code === 'ECONNABORTED') {
      return {
        title: '⏱️ Serveur trop lent',
        message: 'Le serveur met trop de temps à répondre. Réessaie.',
        canRetry: true,
        isOffline: false
      };
    }
    
    if (msg.includes('econnrefused') || code === 'ECONNREFUSED') {
      return {
        title: '🔧 Serveur hors ligne',
        message: 'Le serveur est temporairement indisponible. Réessaie plus tard.',
        canRetry: true,
        isOffline: true
      };
    }
    
    if (error?.response?.status === 401) {
      return {
        title: '🔑 Session expirée',
        message: 'Ta session a expiré. Reconnecte-toi.',
        canRetry: false,
        isOffline: false
      };
    }
    
    if (error?.response?.status >= 500) {
      return {
        title: '🔧 Erreur serveur',
        message: 'Le serveur rencontre un problème. Réessaie plus tard.',
        canRetry: true,
        isOffline: false
      };
    }
    
    return {
      title: '❌ Erreur de connexion',
      message: error?.response?.data?.error || error?.message || 'Une erreur est survenue.',
      canRetry: true,
      isOffline: false
    };
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
   * v5.0.7 - Initialise le service avec support mode hors-ligne
   */
  async init() {
    try {
      console.log('🚀 Initialisation AuthService v5.0.7...');
      
      const savedToken = await AsyncStorage.getItem('auth_token');
      if (savedToken) {
        this.token = savedToken;
        
        // Vérifier d'abord si le serveur est en ligne
        const serverOnline = await this.checkServerHealth();
        
        if (serverOnline) {
          const isValid = await this.verifyToken();
          if (!isValid) {
            console.log('⚠️ Token invalide, déconnexion...');
            await this.logout();
          } else {
            // Sauvegarder pour le mode hors-ligne
            await this.saveOfflineData();
          }
        } else {
          // Mode hors-ligne: charger les données locales
          console.log('📴 Serveur hors-ligne, tentative mode local...');
          const offlineSuccess = await this.enableOfflineMode();
          if (offlineSuccess) {
            console.log('✅ Mode hors-ligne activé avec succès');
            return true;
          } else {
            console.log('⚠️ Pas de données locales disponibles');
          }
        }
      }
      return this.isLoggedIn();
    } catch (error) {
      console.error('❌ Erreur init AuthService:', error);
      
      // En cas d'erreur, essayer le mode hors-ligne
      const offlineSuccess = await this.enableOfflineMode();
      return offlineSuccess;
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
   * v5.0.7 - Connexion par email/mot de passe avec gestion hors-ligne
   */
  async login(email, password) {
    try {
      // Vérifier d'abord la connexion serveur
      const serverOnline = await this.checkServerHealth();
      
      if (!serverOnline) {
        // Essayer le mode hors-ligne
        const offlineSuccess = await this.enableOfflineMode();
        if (offlineSuccess && this.user?.email === email) {
          console.log('📴 Connexion hors-ligne avec données locales');
          return { 
            success: true, 
            user: this.user, 
            offline: true,
            message: 'Connecté en mode hors-ligne. Certaines fonctionnalités peuvent être limitées.'
          };
        }
        
        const errorInfo = this.getErrorMessage({ code: 'ECONNREFUSED' });
        return { 
          success: false, 
          error: errorInfo.message,
          title: errorInfo.title,
          canRetry: errorInfo.canRetry,
          isOffline: true
        };
      }
      
      const response = await axios.post(
        `${this.baseUrl}/auth/login`,
        { email, password },
        { headers: this.getHeaders(), timeout: this.TIMEOUT_NORMAL }
      );

      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        this.offlineMode = false;
        await AsyncStorage.setItem('auth_token', this.token);
        
        // Sauvegarder pour le mode hors-ligne
        await this.saveOfflineData();
        
        console.log('✅ Connexion réussie');
        return { success: true, user: this.user };
      }
      throw new Error(response.data.error || 'Erreur de connexion');
    } catch (error) {
      const errorInfo = this.getErrorMessage(error);
      console.error('❌ Erreur connexion:', errorInfo.message);
      
      // Si erreur réseau, proposer le mode hors-ligne
      if (errorInfo.isOffline) {
        const offlineSuccess = await this.enableOfflineMode();
        if (offlineSuccess) {
          return {
            success: true,
            user: this.user,
            offline: true,
            message: 'Serveur indisponible. Connexion en mode hors-ligne.'
          };
        }
      }
      
      return { 
        success: false, 
        error: errorInfo.message,
        title: errorInfo.title,
        canRetry: errorInfo.canRetry
      };
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
   * v5.0.7 - Vérifie si le serveur est accessible avec gestion d'erreurs améliorée
   */
  async checkServerHealth() {
    const now = Date.now();
    
    // Cache le résultat pendant 30 secondes
    if (this.isServerOnline !== null && (now - this.lastServerCheck) < 30000) {
      return this.isServerOnline;
    }
    
    try {
      console.log('🔍 Vérification connexion serveur...');
      const response = await axios.get(`${this.baseUrl}/health`, { 
        timeout: this.TIMEOUT_SHORT,
        validateStatus: (status) => status < 500
      });
      
      this.isServerOnline = response.data?.status === 'ok';
      this.lastServerCheck = now;
      this.offlineMode = !this.isServerOnline;
      
      if (this.isServerOnline) {
        console.log('✅ Serveur en ligne');
      } else {
        console.log('⚠️ Serveur répond mais statut non-ok');
      }
      
      return this.isServerOnline;
    } catch (error) {
      this.isServerOnline = false;
      this.lastServerCheck = now;
      this.offlineMode = true;
      
      const errorInfo = this.getErrorMessage(error);
      console.log(`❌ Serveur hors ligne: ${errorInfo.message}`);
      
      return false;
    }
  }
  
  /**
   * v5.0.7 - Active le mode hors-ligne avec données locales
   */
  async enableOfflineMode() {
    this.offlineMode = true;
    console.log('📴 Mode hors-ligne activé');
    
    // Charger les données locales si disponibles
    try {
      const savedUser = await AsyncStorage.getItem('offline_user_data');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        console.log('👤 Données utilisateur locales chargées');
        return true;
      }
    } catch (error) {
      console.error('Erreur chargement données locales:', error);
    }
    
    return false;
  }
  
  /**
   * v5.0.7 - Sauvegarde les données utilisateur pour le mode hors-ligne
   */
  async saveOfflineData() {
    if (this.user) {
      try {
        await AsyncStorage.setItem('offline_user_data', JSON.stringify(this.user));
        console.log('💾 Données utilisateur sauvegardées pour hors-ligne');
      } catch (error) {
        console.error('Erreur sauvegarde données locales:', error);
      }
    }
  }
  
  /**
   * v5.0.7 - Retourne l'état de connexion actuel
   */
  getConnectionStatus() {
    return {
      isOnline: this.isServerOnline === true,
      isOffline: this.offlineMode,
      lastCheck: this.lastServerCheck,
      serverUrl: this.baseUrl
    };
  }
}

export default new AuthService();
