import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de personnalisation des bulles de conversation
 */
class ChatStyleService {
  constructor() {
    // Thèmes prédéfinis
    this.themes = {
      default: {
        name: 'Par défaut',
        userBubble: '#6366f1',
        assistantBubble: '#ffffff',
        userText: '#ffffff',
        assistantText: '#111827',
        actionColor: '#8b5cf6',
        thoughtColor: '#9ca3af',
        dialogueColor: '#111827',
        bubbleOpacity: 1,
        borderRadius: 15,
      },
      dark: {
        name: 'Sombre',
        userBubble: '#3b82f6',
        assistantBubble: '#1f2937',
        userText: '#ffffff',
        assistantText: '#f3f4f6',
        actionColor: '#a78bfa',
        thoughtColor: '#9ca3af',
        dialogueColor: '#f3f4f6',
        bubbleOpacity: 1,
        borderRadius: 15,
      },
      romantic: {
        name: 'Romantique',
        userBubble: '#ec4899',
        assistantBubble: '#fdf2f8',
        userText: '#ffffff',
        assistantText: '#831843',
        actionColor: '#db2777',
        thoughtColor: '#f472b6',
        dialogueColor: '#831843',
        bubbleOpacity: 0.95,
        borderRadius: 20,
      },
      nature: {
        name: 'Nature',
        userBubble: '#10b981',
        assistantBubble: '#ecfdf5',
        userText: '#ffffff',
        assistantText: '#064e3b',
        actionColor: '#059669',
        thoughtColor: '#6ee7b7',
        dialogueColor: '#064e3b',
        bubbleOpacity: 0.95,
        borderRadius: 15,
      },
      sunset: {
        name: 'Coucher de soleil',
        userBubble: '#f97316',
        assistantBubble: '#fff7ed',
        userText: '#ffffff',
        assistantText: '#7c2d12',
        actionColor: '#ea580c',
        thoughtColor: '#fdba74',
        dialogueColor: '#7c2d12',
        bubbleOpacity: 0.95,
        borderRadius: 18,
      },
      ocean: {
        name: 'Océan',
        userBubble: '#0ea5e9',
        assistantBubble: '#f0f9ff',
        userText: '#ffffff',
        assistantText: '#0c4a6e',
        actionColor: '#0284c7',
        thoughtColor: '#7dd3fc',
        dialogueColor: '#0c4a6e',
        bubbleOpacity: 0.95,
        borderRadius: 15,
      },
      midnight: {
        name: 'Minuit',
        userBubble: '#7c3aed',
        assistantBubble: '#1e1b4b',
        userText: '#ffffff',
        assistantText: '#e0e7ff',
        actionColor: '#a78bfa',
        thoughtColor: '#818cf8',
        dialogueColor: '#e0e7ff',
        bubbleOpacity: 0.9,
        borderRadius: 15,
      },
    };
    
    this.currentStyle = { ...this.themes.default };
    this.currentTheme = 'default';
  }

  async loadStyle() {
    try {
      const saved = await AsyncStorage.getItem('chat_style');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentStyle = { ...this.themes.default, ...parsed.style };
        this.currentTheme = parsed.theme || 'default';
      }
    } catch (error) {
      console.error('Erreur chargement style:', error);
    }
    return this.currentStyle;
  }

  async saveStyle(style, themeName = 'custom') {
    try {
      this.currentStyle = { ...this.themes.default, ...style };
      this.currentTheme = themeName;
      await AsyncStorage.setItem('chat_style', JSON.stringify({
        style: this.currentStyle,
        theme: themeName,
      }));
    } catch (error) {
      console.error('Erreur sauvegarde style:', error);
    }
  }

  async applyTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentStyle = { ...this.themes[themeName] };
      this.currentTheme = themeName;
      await this.saveStyle(this.currentStyle, themeName);
    }
    return this.currentStyle;
  }

  async setOpacity(opacity) {
    this.currentStyle.bubbleOpacity = Math.max(0.5, Math.min(1, opacity));
    await this.saveStyle(this.currentStyle, this.currentTheme);
    return this.currentStyle;
  }

  async setBorderRadius(radius) {
    this.currentStyle.borderRadius = Math.max(0, Math.min(30, radius));
    await this.saveStyle(this.currentStyle, this.currentTheme);
    return this.currentStyle;
  }

  async setBlur(blur) {
    this.currentStyle.backgroundBlur = Math.max(0, Math.min(100, blur));
    await this.saveStyle(this.currentStyle, this.currentTheme);
    return this.currentStyle;
  }

  async setUserBubbleColor(color) {
    this.currentStyle.userBubble = color;
    await this.saveStyle(this.currentStyle, 'custom');
    return this.currentStyle;
  }

  async setAssistantBubbleColor(color) {
    this.currentStyle.assistantBubble = color;
    await this.saveStyle(this.currentStyle, 'custom');
    return this.currentStyle;
  }

  async setActionColor(color) {
    this.currentStyle.actionColor = color;
    await this.saveStyle(this.currentStyle, 'custom');
    return this.currentStyle;
  }

  async setThoughtColor(color) {
    this.currentStyle.thoughtColor = color;
    await this.saveStyle(this.currentStyle, 'custom');
    return this.currentStyle;
  }

  async setDialogueColor(color) {
    this.currentStyle.dialogueColor = color;
    await this.saveStyle(this.currentStyle, 'custom');
    return this.currentStyle;
  }

  getThemes() {
    return Object.entries(this.themes).map(([id, theme]) => ({
      id,
      name: theme.name,
      preview: {
        userBubble: theme.userBubble,
        assistantBubble: theme.assistantBubble,
      },
    }));
  }

  getCurrentStyle() {
    return this.currentStyle;
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

export default new ChatStyleService();
