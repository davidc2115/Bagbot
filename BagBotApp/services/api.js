import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration de l'API - Peut être modifiée dans les paramètres
const DEFAULT_API_URL = 'https://paid-cartoon-cyber-symphony.trycloudflare.com';

class ApiService {
  constructor() {
    this.apiUrl = DEFAULT_API_URL;
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async setApiUrl(url) {
    this.apiUrl = url;
    this.client = axios.create({
      baseURL: url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    await AsyncStorage.setItem('apiUrl', url);
  }

  async getApiUrl() {
    const stored = await AsyncStorage.getItem('apiUrl');
    return stored || DEFAULT_API_URL;
  }

  // ========== CONFIG & DASHBOARD ==========
  async getConfig() {
    const response = await this.client.get('/api/config');
    return response.data;
  }

  async saveConfig(config) {
    const response = await this.client.post('/api/config', config);
    return response.data;
  }

  async getDiscordChannels() {
    const response = await this.client.get('/api/discord/channels');
    return response.data;
  }

  async getDiscordRoles() {
    const response = await this.client.get('/api/discord/roles');
    return response.data;
  }

  async getDiscordMembers() {
    const response = await this.client.get('/api/discord/members');
    return response.data;
  }

  // ========== ECONOMY ==========
  async getEconomy() {
    const response = await this.client.get('/api/economy');
    return response.data;
  }

  async saveEconomy(economy) {
    const response = await this.client.post('/api/economy', economy);
    return response.data;
  }

  async getShop() {
    const response = await this.client.get('/api/shop');
    return response.data;
  }

  async saveShop(shop) {
    const response = await this.client.post('/api/shop', shop);
    return response.data;
  }

  // ========== MUSIC ==========
  async getMusicPlaylists(guildId) {
    const response = await this.client.get(`/api/music?guildId=${guildId}`);
    return response.data;
  }

  async createPlaylist(guildId, name) {
    const response = await this.client.post('/api/music/playlist/create', {
      guildId,
      name,
    });
    return response.data;
  }

  async deletePlaylist(guildId, name) {
    const response = await this.client.delete(`/api/music/playlist/${guildId}/${name}`);
    return response.data;
  }

  async addTrackToPlaylist(guildId, name, track) {
    const response = await this.client.post(`/api/music/playlist/${guildId}/${name}/add`, {
      title: track.title,
      url: track.url,
    });
    return response.data;
  }

  async deleteTrack(guildId, name, index) {
    const response = await this.client.delete(`/api/music/playlist/${guildId}/${name}/track/${index}`);
    return response.data;
  }

  // ========== TRUTH OR DARE ==========
  async getTruthDare(mode) {
    const response = await this.client.get(`/api/truthdare/${mode}`);
    return response.data;
  }

  async addTruthDarePrompt(mode, prompt) {
    const response = await this.client.post(`/api/truthdare/${mode}`, { text: prompt });
    return response.data;
  }

  async deleteTruthDarePrompt(mode, id) {
    const response = await this.client.delete(`/api/truthdare/${mode}/${id}`);
    return response.data;
  }

  async addTruthDareChannel(mode, channelId) {
    const response = await this.client.post(`/api/truthdare/${mode}/channels`, { channelId });
    return response.data;
  }

  async deleteTruthDareChannel(mode, channelId) {
    const response = await this.client.delete(`/api/truthdare/${mode}/channels/${channelId}`);
    return response.data;
  }

  // ========== COUNTING ==========
  async getCounting() {
    const response = await this.client.get('/api/counting');
    return response.data;
  }

  async saveCounting(counting) {
    const response = await this.client.post('/api/counting', counting);
    return response.data;
  }

  async addCountingChannel(channelId) {
    const response = await this.client.post('/api/counting/channels', { channelId });
    return response.data;
  }

  async deleteCountingChannel(channelId) {
    const response = await this.client.delete(`/api/counting/channels/${channelId}`);
    return response.data;
  }

  // ========== WELCOME & GOODBYE ==========
  async getWelcome() {
    const response = await this.client.get('/api/welcome');
    return response.data;
  }

  async saveWelcome(welcome) {
    const response = await this.client.post('/api/welcome', welcome);
    return response.data;
  }

  async getGoodbye() {
    const response = await this.client.get('/api/goodbye');
    return response.data;
  }

  async saveGoodbye(goodbye) {
    const response = await this.client.post('/api/goodbye', goodbye);
    return response.data;
  }

  // ========== TICKETS ==========
  async getTickets() {
    const response = await this.client.get('/api/tickets');
    return response.data;
  }

  async saveTickets(tickets) {
    const response = await this.client.post('/api/tickets', tickets);
    return response.data;
  }

  // ========== INACTIVITY ==========
  async getInactivity() {
    const response = await this.client.get('/api/inactivity');
    return response.data;
  }

  async saveInactivity(inactivity) {
    const response = await this.client.post('/api/inactivity', inactivity);
    return response.data;
  }

  async cleanupInactiveMembers() {
    const response = await this.client.post('/api/inactivity/cleanup');
    return response.data;
  }

  async resetInactivity() {
    const response = await this.client.post('/api/inactivity/reset');
    return response.data;
  }

  async addAllMembersToInactivity() {
    const response = await this.client.post('/api/inactivity/add-all-members');
    return response.data;
  }

  // ========== STAFF CHAT ==========
  async getStaffChat() {
    const response = await this.client.get('/api/staff-chat');
    return response.data;
  }

  async sendStaffMessage(username, message) {
    const response = await this.client.post('/api/staff-chat', {
      username,
      message,
      timestamp: Date.now(),
    });
    return response.data;
  }

  async clearStaffChat() {
    const response = await this.client.delete('/api/staff-chat');
    return response.data;
  }

  // ========== SERVER MONITORING ==========
  async getServerStats() {
    const response = await this.client.get('/api/server/stats');
    return response.data;
  }

  async restartDashboard() {
    const response = await this.client.post('/api/server/restart/dashboard');
    return response.data;
  }

  async restartBot() {
    const response = await this.client.post('/api/server/restart/bot');
    return response.data;
  }

  async clearServerCache() {
    const response = await this.client.post('/api/server/clear-cache');
    return response.data;
  }

  async rebootServer() {
    const response = await this.client.post('/api/server/reboot');
    return response.data;
  }
}

export default new ApiService();
