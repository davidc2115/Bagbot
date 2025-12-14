import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('http://88.174.155.230:3002');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!serverUrl) {
      Alert.alert('Erreur', 'Veuillez entrer l\'URL du serveur');
      return;
    }

    setLoading(true);
    try {
      // Configurer l'URL de l'API
      await api.setApiUrl(serverUrl);
      
      // Tester la connexion
      await api.getConfig();
      
      // Sauvegarder l'authentification
      await AsyncStorage.setItem('isAuthenticated', 'true');
      await AsyncStorage.setItem('serverUrl', serverUrl);
      
      // Naviguer vers l'écran principal
      navigation.replace('Main');
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert(
        'Erreur de connexion',
        'Impossible de se connecter au serveur. Vérifiez l\'URL et réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>🤖 BAG Bot Dashboard</Text>
            <Text style={styles.subtitle}>Mobile</Text>
            
            <TextInput
              label="URL du serveur"
              value={serverUrl}
              onChangeText={setServerUrl}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="url"
              theme={{
                colors: {
                  primary: '#FF0000',
                  text: '#ffffff',
                  placeholder: '#888888',
                  background: '#2a2a2a',
                },
              }}
            />
            
            <TextInput
              label="Mot de passe (optionnel)"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              theme={{
                colors: {
                  primary: '#FF0000',
                  text: '#ffffff',
                  placeholder: '#888888',
                  background: '#2a2a2a',
                },
              }}
            />
            
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor="#FF0000"
              textColor="#ffffff"
            >
              Connexion
            </Button>
            
            <Text style={styles.info}>
              📡 Connectez-vous à votre serveur BAG Bot Dashboard
            </Text>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#2a2a2a',
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  info: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
});
