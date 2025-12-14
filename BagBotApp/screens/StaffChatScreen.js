import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Card, Text, TextInput, IconButton, ActivityIndicator, Avatar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function StaffChatScreen() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    loadUsername();
    loadMessages();
    
    // Actualiser toutes les 3 secondes
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadUsername = async () => {
    let name = await AsyncStorage.getItem('staffUsername');
    if (!name) {
      // Demander le pseudo Discord
      Alert.prompt(
        '👤 Pseudo Discord',
        'Entrez votre pseudo Discord pour le chat staff :',
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => {
              const defaultName = `Staff${Math.floor(Math.random() * 1000)}`;
              AsyncStorage.setItem('staffUsername', defaultName);
              setUsername(defaultName);
            }
          },
          {
            text: 'OK',
            onPress: async (text) => {
              const discordName = text?.trim() || `Staff${Math.floor(Math.random() * 1000)}`;
              await AsyncStorage.setItem('staffUsername', discordName);
              setUsername(discordName);
            }
          }
        ],
        'plain-text'
      );
    } else {
      setUsername(name);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getStaffChat();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.sendStaffMessage(username, newMessage);
      setNewMessage('');
      await loadMessages();
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Confirmation',
      'Effacer tout l\'historique du chat ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearStaffChat();
              setMessages([]);
              Alert.alert('Succès', 'Chat effacé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'effacer le chat');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Chargement du chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={24} color="#FF0000" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>💬 Chat Staff</Text>
            <Text style={styles.headerSubtitle}>
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="account-edit"
            iconColor="#5865F2"
            size={24}
            onPress={() => {
              Alert.prompt(
                '✏️ Changer de pseudo',
                'Entrez votre nouveau pseudo Discord :',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Changer',
                    onPress: async (text) => {
                      if (text?.trim()) {
                        await AsyncStorage.setItem('staffUsername', text.trim());
                        setUsername(text.trim());
                        Alert.alert('✅', 'Pseudo mis à jour !');
                      }
                    }
                  }
                ],
                'plain-text',
                username
              );
            }}
          />
          <IconButton
            icon="trash-can"
            iconColor="#FF0000"
            size={24}
            onPress={clearChat}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark" size={40} color="#5865F2" />
          <Text style={styles.welcomeTitle}>Chat Staff Privé</Text>
          <Text style={styles.welcomeText}>
            Communication sécurisée entre les membres du staff avec l'application.
          </Text>
          <Chip
            icon="account"
            textStyle={{ color: '#ffffff' }}
            style={styles.usernameChip}
          >
            Vous: {username}
          </Chip>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#555555" />
            <Text style={styles.emptyText}>Aucun message</Text>
            <Text style={styles.emptySubtext}>Soyez le premier à écrire !</Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.username === username;
            return (
              <View
                key={index}
                style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}
              >
                {!isOwn && (
                  <Avatar.Text
                    size={36}
                    label={msg.username[0].toUpperCase()}
                    style={styles.avatar}
                  />
                )}
                <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
                  {!isOwn && <Text style={styles.messageUsername}>{msg.username}</Text>}
                  <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                    {msg.message}
                  </Text>
                  <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          placeholderTextColor="#888888"
          style={styles.input}
          mode="outlined"
          multiline
          maxLength={500}
          theme={{ colors: { primary: '#FF0000', background: '#1a1a1a' } }}
          right={
            <TextInput.Icon
              icon="send"
              color={newMessage.trim() ? '#FF0000' : '#555555'}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  loadingText: {
    marginTop: 10,
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 3,
    borderBottomColor: '#FF0000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888888',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  welcomeCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  usernameChip: {
    backgroundColor: '#5865F2',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#888888',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#555555',
    marginTop: 5,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    backgroundColor: '#5865F2',
    marginRight: 8,
  },
  messageBubble: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 15,
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  ownMessageBubble: {
    backgroundColor: '#FF0000',
    marginLeft: 8,
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5865F2',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: '#ffcccc',
  },
  inputContainer: {
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  input: {
    backgroundColor: '#2a2a2a',
    fontSize: 15,
  },
});
