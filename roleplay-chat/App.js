import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet, Linking, TouchableOpacity, Alert } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import UserSettingsScreen from './src/screens/UserSettingsScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import CreateCharacterScreen from './src/screens/CreateCharacterScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import CharacterCarouselScreen from './src/screens/CharacterCarouselScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyCharactersScreen from './src/screens/MyCharactersScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import PayPalConfigScreen from './src/screens/PayPalConfigScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import PremiumChatScreen from './src/screens/PremiumChatScreen';
import AuthService from './src/services/AuthService';
import SyncService from './src/services/SyncService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ isAdmin, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#C9A227',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#12121f',
          borderTopColor: '#C9A227',
          borderTopWidth: 1,
          shadowColor: '#8B0000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        headerShown: false,
      }}
    >
      {/* Mode Découverte comme écran principal */}
      <Tab.Screen 
        name="Discover" 
        component={CharacterCarouselScreen}
        options={{
          tabBarLabel: 'Découvrir',
          tabBarIcon: ({ color }) => <TabIcon name="❤️" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          tabBarLabel: 'Conversations',
          tabBarIcon: ({ color }) => <TabIcon name="💬" color={color} />,
        }}
      />
      <Tab.Screen 
        name="MyCharacters" 
        component={MyCharactersScreen}
        options={{
          tabBarLabel: 'Créations',
          tabBarIcon: ({ color }) => <TabIcon name="✨" color={color} />,
        }}
      />
      {/* Onglet Discord */}
      <Tab.Screen 
        name="Discord" 
        component={DiscordScreen}
        options={{
          tabBarLabel: 'Discord',
          tabBarIcon: ({ color }) => <TabIcon name="🎮" color={color} />,
        }}
      />
      {/* Onglet Admin pour gérer les membres (admin uniquement) */}
      {isAdmin && (
        <Tab.Screen 
          name="AdminPanel" 
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => <TabIcon name="👑" color={color} />,
          }}
        >
          {props => <AdminPanelScreen {...props} />}
        </Tab.Screen>
      )}
      {/* Admin = SettingsScreen complet, Utilisateur = UserSettingsScreen */}
      {isAdmin ? (
        <Tab.Screen 
          name="Settings" 
          options={{
            tabBarLabel: 'Config',
            tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color} />,
          }}
        >
          {props => <SettingsScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      ) : (
        <Tab.Screen 
          name="UserSettings" 
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color }) => <TabIcon name="👤" color={color} />,
          }}
        >
          {props => <UserSettingsScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
}

function TabIcon({ name, color }) {
  return <Text style={{ fontSize: 24, color }}>{name}</Text>;
}

// Lien Discord officiel
const DISCORD_INVITE_URL = 'https://discord.gg/W52qQtNqFt';

// Écran Discord (ouvre le lien externe)
function DiscordScreen() {
  const [opening, setOpening] = useState(false);
  
  const openDiscord = async () => {
    if (opening) return;
    setOpening(true);
    
    try {
      // Essayer d'abord l'app Discord directement
      const discordAppUrl = 'discord://discord.gg/W52qQtNqFt';
      const canOpenApp = await Linking.canOpenURL(discordAppUrl).catch(() => false);
      
      if (canOpenApp) {
        await Linking.openURL(discordAppUrl);
      } else {
        // Sinon ouvrir dans le navigateur
        await Linking.openURL(DISCORD_INVITE_URL);
      }
    } catch (error) {
      // En cas d'erreur, essayer quand même d'ouvrir
      try {
        await Linking.openURL(DISCORD_INVITE_URL);
      } catch (e) {
        Alert.alert(
          'Discord', 
          `Copiez ce lien dans votre navigateur:\n\n${DISCORD_INVITE_URL}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setOpening(false);
    }
  };

  // Ouvrir automatiquement au montage (avec délai)
  useEffect(() => {
    const timer = setTimeout(() => {
      openDiscord();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={discordStyles.container}>
      <Text style={discordStyles.icon}>🎮</Text>
      <Text style={discordStyles.title}>Serveur Discord</Text>
      <Text style={discordStyles.subtitle}>Rejoignez notre communauté !</Text>
      <TouchableOpacity 
        style={[discordStyles.button, opening && { opacity: 0.7 }]} 
        onPress={openDiscord}
        disabled={opening}
      >
        <Text style={discordStyles.buttonText}>
          {opening ? 'Ouverture...' : 'Ouvrir Discord'}
        </Text>
      </TouchableOpacity>
      <Text style={discordStyles.link}>{DISCORD_INVITE_URL}</Text>
      <Text style={discordStyles.hint}>
        Si Discord ne s'ouvre pas, copiez le lien ci-dessus
      </Text>
    </View>
  );
}

const discordStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9A227',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#D4AF37',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 15,
  },
  hint: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('loading'); // 'loading', 'login', 'profile_setup', 'ready'
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vérifier si l'utilisateur est déjà connecté
      const isLoggedIn = await AuthService.init();
      
      if (isLoggedIn) {
        const currentUser = AuthService.getCurrentUser();
        setUser(currentUser);
        setIsAdmin(AuthService.isAdmin());
        
        // Vérifier si le profil est complété
        if (!AuthService.isProfileCompleted()) {
          setAuthState('profile_setup');
        } else {
          setAuthState('ready');
          // Démarrer la sync auto des personnages publics
          startBackgroundSync();
        }
      } else {
        // Pas connecté, forcer la connexion
        setAuthState('login');
      }
    } catch (error) {
      console.error('Erreur auth:', error);
      setAuthState('login');
    } finally {
      setIsLoading(false);
    }
  };

  const startBackgroundSync = async () => {
    try {
      await SyncService.init();
      // Sync auto toutes les 10 minutes
      SyncService.startAutoSync(10);
    } catch (error) {
      console.error('Erreur démarrage sync:', error);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAdmin(AuthService.isAdmin());
    
    // Vérifier si le profil est complété
    if (!userData.profile_completed) {
      setAuthState('profile_setup');
    } else {
      setAuthState('ready');
      startBackgroundSync();
    }
  };

  const handleProfileComplete = (userData) => {
    setUser(userData);
    setAuthState('ready');
    startBackgroundSync();
  };

  // Callback de déconnexion - appelé depuis UserSettingsScreen ou SettingsScreen
  const handleLogout = useCallback(() => {
    console.log('🚪 Déconnexion détectée, retour à l\'écran de connexion');
    SyncService.stopAutoSync();
    setUser(null);
    setIsAdmin(false);
    setAuthState('login');
  }, []);

  // Écran de chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>💋</Text>
        <Text style={styles.loadingTitle}>Boys & Girls</Text>
        <ActivityIndicator size="large" color="#C9A227" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Écran de connexion (obligatoire)
  if (authState === 'login') {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} forceLogin={true} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Écran de configuration du profil (première connexion)
  if (authState === 'profile_setup') {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <View style={styles.profileSetupContainer}>
          <ProfileSetupScreen onComplete={handleProfileComplete} />
        </View>
      </NavigationContainer>
    );
  }

  // Application principale (utilisateur connecté et profil complété)
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen 
          name="MainTabs" 
          options={{ headerShown: false }}
        >
          {props => <HomeTabs {...props} isAdmin={isAdmin} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen 
          name="CharacterCarousel" 
          component={CharacterCarouselScreen}
          options={{ 
            title: 'Découvrir',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
            headerShown: true
          }}
        />
        <Stack.Screen 
          name="UserProfile" 
          component={UserProfileScreen}
          options={{ 
            title: 'Mon Profil',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="CharacterDetail" 
          component={CharacterDetailScreen}
          options={{ 
            title: 'Détails du personnage',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="CreateCharacter" 
          component={CreateCharacterScreen}
          options={{ 
            title: 'Créer un personnage',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="Gallery" 
          component={GalleryScreen}
          options={{ 
            title: 'Galerie',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen}
          options={{ 
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="PayPalConfig" 
          component={PayPalConfigScreen}
          options={{ 
            title: 'Configuration PayPal',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="Premium" 
          component={PremiumScreen}
          options={{ 
            title: 'Premium',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen 
          name="PremiumChat" 
          component={PremiumChatScreen}
          options={{ 
            title: 'Chat Premium',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a12',
  },
  loadingEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C9A227',
    textShadowColor: '#8B6914',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 12,
    letterSpacing: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
  profileSetupContainer: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
});
