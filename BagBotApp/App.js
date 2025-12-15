import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'react-native';

// Import screens
import DashboardScreen from './screens/DashboardScreen';
import EconomyScreen from './screens/EconomyScreen';
import MusicScreen from './screens/MusicScreen';
import GamesScreen from './screens/GamesScreen';
import ConfigScreen from './screens/ConfigScreen';
import LoginScreen from './screens/LoginScreen';
import ShopScreen from './screens/ShopScreen';
import InactivityScreen from './screens/InactivityScreen';
import TicketsScreen from './screens/TicketsScreen';
import StaffChatScreen from './screens/StaffChatScreen';
import ServerMonitorScreen from './screens/ServerMonitorScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const theme = {
  dark: true,
  colors: {
    primary: '#FF0000',
    background: '#0d0d0d',
    card: '#1a1a1a',
    text: '#ffffff',
    border: '#333333',
    notification: '#FF0000',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Serveur') {
            iconName = focused ? 'server' : 'server-outline';
          } else if (route.name === 'Jeux') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Config') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: '🏠 Dashboard' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={StaffChatScreen}
        options={{ title: '💬 Chat Staff' }}
      />
      <Tab.Screen 
        name="Serveur" 
        component={ServerMonitorScreen}
        options={{ title: '📊 Serveur' }}
      />
      <Tab.Screen 
        name="Jeux" 
        component={GamesScreen}
        options={{ title: '🎲 Jeux' }}
      />
      <Tab.Screen 
        name="Config" 
        component={ConfigScreen}
        options={{ title: '⚙️ Config' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="Shop" 
            component={ShopScreen}
            options={{ 
              headerShown: true,
              title: '🛒 Boutique',
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="Economy" 
            component={EconomyScreen}
            options={{ 
              headerShown: true,
              title: '💰 Économie',
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="Music" 
            component={MusicScreen}
            options={{ 
              headerShown: true,
              title: '🎵 Musique',
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="Inactivity" 
            component={InactivityScreen}
            options={{ 
              headerShown: true,
              title: '💤 Inactivité',
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="Tickets" 
            component={TicketsScreen}
            options={{ 
              headerShown: true,
              title: '🎫 Tickets',
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#ffffff',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
