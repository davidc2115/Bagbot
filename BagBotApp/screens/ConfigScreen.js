import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, TextInput, List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfigScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const changeServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Erreur', 'Entrez une URL valide');
      return;
    }
    setLoading(true);
    try {
      await api.setApiUrl(serverUrl);
      await api.getConfig(); // Test connection
      Alert.alert('Succès', 'Serveur mis à jour');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('isAuthenticated');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Configuration</Text>
        <Text style={styles.headerSubtitle}>Paramètres de l'application</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🌐 Serveur</Text>
          <TextInput
            label="URL du serveur"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://88.174.155.230:3002"
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }}
          />
          <Button
            mode="contained"
            onPress={changeServer}
            loading={loading}
            buttonColor="#FF0000"
          >
            Changer de serveur
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>📱 Application</Text>
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" color="#5865F2" />}
            titleStyle={{ color: '#ffffff' }}
            descriptionStyle={{ color: '#888888' }}
          />
          <List.Item
            title="Dashboard Version"
            description="v2.8"
            left={props => <List.Icon {...props} icon="web" color="#5865F2" />}
            titleStyle={{ color: '#ffffff' }}
            descriptionStyle={{ color: '#888888' }}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor="#FF0000"
        icon="logout"
      >
        Déconnexion
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { padding: 20, backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#FF0000' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#888888', marginTop: 5 },
  card: { margin: 15, backgroundColor: '#1a1a1a', borderRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
  input: { marginBottom: 15, backgroundColor: '#2a2a2a' },
  logoutButton: { margin: 15, borderColor: '#FF0000', marginTop: 30 },
});
