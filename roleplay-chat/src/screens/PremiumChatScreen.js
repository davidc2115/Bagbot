import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import AuthService from '../services/AuthService';

/**
 * Écran de chat pour les membres premium
 * Permet de communiquer en public ou en privé avec d'autres membres
 */
export default function PremiumChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatMode, setChatMode] = useState('public'); // 'public' ou 'private'
  const [premiumMembers, setPremiumMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberList, setShowMemberList] = useState(false);
  const [privateChats, setPrivateChats] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const flatListRef = useRef(null);
  const currentUser = AuthService.getCurrentUser();
  const refreshInterval = useRef(null);

  const FREEBOX_SERVER = 'http://88.174.155.230:33437';

  useEffect(() => {
    checkPremiumAndLoad();
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Rafraîchir les messages toutes les 5 secondes
    refreshInterval.current = setInterval(() => {
      if (chatMode === 'public') {
        loadPublicMessages(false);
      } else if (selectedMember) {
        loadPrivateMessages(selectedMember.id, false);
      }
    }, 5000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [chatMode, selectedMember]);

  const checkPremiumAndLoad = async () => {
    try {
      const isPremium = await AuthService.checkPremiumStatus();
      const isAdmin = currentUser?.is_admin || currentUser?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (!isPremium && !isAdmin) {
        Alert.alert(
          '💎 Accès Premium Requis',
          'Le chat communautaire est réservé aux membres Premium.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      await Promise.all([
        loadPublicMessages(),
        loadPremiumMembers()
      ]);
    } catch (error) {
      console.error('Erreur vérification premium:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicMessages = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await fetch(`${FREEBOX_SERVER}/premium-chat/public`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token || ''}`,
          'X-User-Email': currentUser?.email || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        // Fallback: messages locaux simulés
        console.log('Serveur non disponible, mode hors ligne');
      }
    } catch (error) {
      console.error('Erreur chargement messages publics:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadPrivateMessages = async (memberId, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await fetch(`${FREEBOX_SERVER}/premium-chat/private/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token || ''}`,
          'X-User-Email': currentUser?.email || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrivateChats(prev => ({
          ...prev,
          [memberId]: data.messages || []
        }));
        
        // Marquer comme lu
        setUnreadCounts(prev => ({
          ...prev,
          [memberId]: 0
        }));
      }
    } catch (error) {
      console.error('Erreur chargement messages privés:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadPremiumMembers = async () => {
    try {
      console.log('📋 Chargement des membres premium...');
      
      // Récupérer les membres premium depuis le serveur
      const response = await fetch(`${FREEBOX_SERVER}/api/users/premium-members`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token || ''}`,
          'X-User-Email': currentUser?.email || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Membres reçus:', data);
        
        // Exclure l'utilisateur courant de la liste
        const members = (data.members || []).filter(m => 
          m.email?.toLowerCase() !== currentUser?.email?.toLowerCase()
        );
        
        console.log(`👥 ${members.length} autres membres premium/admin trouvés`);
        setPremiumMembers(members);
      } else {
        console.log('❌ Erreur réponse:', response.status);
        // Fallback: récupérer tous les utilisateurs et filtrer
        await loadMembersFromAllUsers();
      }
    } catch (error) {
      console.error('❌ Erreur chargement membres premium:', error);
      // Fallback en cas d'erreur
      await loadMembersFromAllUsers();
    }
  };

  const loadMembersFromAllUsers = async () => {
    try {
      console.log('📋 Fallback: chargement de tous les utilisateurs...');
      
      // Récupérer tous les utilisateurs depuis l'API
      const response = await fetch(`${FREEBOX_SERVER}/api/users/all`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token || ''}`,
          'X-User-Email': currentUser?.email || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const allUsers = data.users || [];
        
        console.log(`✅ ${allUsers.length} utilisateurs trouvés`);
        
        // Filtrer: admins + premium, exclure l'utilisateur courant
        const eligibleMembers = allUsers.filter(user => {
          const isCurrentUser = user.email?.toLowerCase() === currentUser?.email?.toLowerCase();
          const isEligible = user.is_admin || user.is_premium;
          return !isCurrentUser && isEligible;
        });

        console.log(`👥 ${eligibleMembers.length} membres éligibles`);
        setPremiumMembers(eligibleMembers);
      } else {
        console.log('❌ Fallback échoué:', response.status);
        setPremiumMembers([]);
      }
    } catch (error) {
      console.error('❌ Erreur fallback membres:', error);
      setPremiumMembers([]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const endpoint = chatMode === 'public' 
        ? `${FREEBOX_SERVER}/premium-chat/public`
        : `${FREEBOX_SERVER}/premium-chat/private/${selectedMember?.id}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token || ''}`,
          'X-User-Email': currentUser?.email || '',
        },
        body: JSON.stringify({
          content: messageContent,
          sender: {
            email: currentUser?.email,
            username: currentUser?.profile?.username || currentUser?.email?.split('@')[0],
          }
        })
      });

      if (response.ok) {
        // Ajouter le message localement immédiatement
        const newMessage = {
          id: Date.now().toString(),
          content: messageContent,
          sender: {
            email: currentUser?.email,
            username: currentUser?.profile?.username || currentUser?.email?.split('@')[0],
          },
          timestamp: new Date().toISOString(),
          isOwn: true,
        };

        if (chatMode === 'public') {
          setMessages(prev => [...prev, newMessage]);
        } else if (selectedMember) {
          setPrivateChats(prev => ({
            ...prev,
            [selectedMember.id]: [...(prev[selectedMember.id] || []), newMessage]
          }));
        }

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur réponse serveur:', response.status, errorText);
        Alert.alert('Erreur', `Impossible d'envoyer le message (${response.status})`);
        setInputText(messageContent); // Restore input
      }
    } catch (error) {
      console.error('❌ Erreur envoi message:', error.message);
      
      // Ajouter le message localement quand même (mode hors ligne)
      const newMessage = {
        id: Date.now().toString(),
        content: messageContent,
        sender: {
          email: currentUser?.email,
          username: currentUser?.profile?.username || currentUser?.email?.split('@')[0],
        },
        timestamp: new Date().toISOString(),
        isOwn: true,
        pending: true, // Marquer comme en attente
      };

      if (chatMode === 'public') {
        setMessages(prev => [...prev, newMessage]);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setSending(false);
    }
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setChatMode('private');
    setShowMemberList(false);
    loadPrivateMessages(member.id);
  };

  const switchToPublic = () => {
    setChatMode('public');
    setSelectedMember(null);
  };

  const getCurrentMessages = () => {
    if (chatMode === 'public') {
      return messages;
    } else if (selectedMember) {
      return privateChats[selectedMember.id] || [];
    }
    return [];
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender?.email === currentUser?.email || item.isOwn;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwn && (
          <Text style={styles.senderName}>
            {item.sender?.username || 'Anonyme'}
          </Text>
        )}
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          }) : ''}
        </Text>
      </View>
    );
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => selectMember(item)}
    >
      <View style={[styles.memberAvatar, item.is_admin && styles.memberAvatarAdmin]}>
        <Text style={styles.memberAvatarText}>
          {item.username?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.username || 'Membre Premium'}</Text>
          {item.is_admin && <Text style={styles.adminBadge}>👑 Admin</Text>}
          {!item.is_admin && item.is_premium && <Text style={styles.premiumBadge}>💎</Text>}
        </View>
        <Text style={styles.memberStatus}>
          {item.online ? '🟢 En ligne' : '⚪ Hors ligne'}
        </Text>
      </View>
      {unreadCounts[item.id] > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCounts[item.id]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement du chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      enabled
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTabs}>
          <TouchableOpacity
            style={[styles.headerTab, chatMode === 'public' && styles.headerTabActive]}
            onPress={switchToPublic}
          >
            <Text style={[
              styles.headerTabText,
              chatMode === 'public' && styles.headerTabTextActive
            ]}>
              🌐 Chat Public
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.headerTab, chatMode === 'private' && styles.headerTabActive]}
            onPress={() => setShowMemberList(true)}
          >
            <Text style={[
              styles.headerTabText,
              chatMode === 'private' && styles.headerTabTextActive
            ]}>
              🔒 Messages Privés
              {selectedMember && ` (${selectedMember.username})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat info banner */}
      {chatMode === 'public' ? (
        <View style={styles.chatInfoBanner}>
          <Text style={styles.chatInfoText}>
            💬 Chat communautaire Premium - {premiumMembers.length + 1} membres
          </Text>
        </View>
      ) : selectedMember ? (
        <View style={styles.privateChatHeader}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {selectedMember.username?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.privateChatName}>{selectedMember.username}</Text>
          <TouchableOpacity 
            style={styles.closeChatButton}
            onPress={switchToPublic}
          >
            <Text style={styles.closeChatButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectMemberBanner}>
          <Text style={styles.selectMemberText}>
            👆 Sélectionnez un membre pour démarrer une conversation privée
          </Text>
          <TouchableOpacity
            style={styles.selectMemberButton}
            onPress={() => setShowMemberList(true)}
          >
            <Text style={styles.selectMemberButtonText}>Voir les membres</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={getCurrentMessages()}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {chatMode === 'public' 
                ? '💬 Soyez le premier à envoyer un message !'
                : '📝 Commencez la conversation...'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      {(chatMode === 'public' || selectedMember) && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrivez un message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal liste des membres */}
      <Modal
        visible={showMemberList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMemberList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💎 Membres Premium</Text>
              <TouchableOpacity onPress={() => setShowMemberList(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {premiumMembers.length === 0 ? (
              <View style={styles.noMembersContainer}>
                <Text style={styles.noMembersText}>
                  😔 Aucun autre membre premium pour le moment.
                </Text>
              </View>
            ) : (
              <FlatList
                data={premiumMembers}
                renderItem={renderMemberItem}
                keyExtractor={(item) => item.id?.toString() || item.email}
                contentContainerStyle={styles.membersList}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#1e293b',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTabs: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 10,
  },
  headerTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  headerTabActive: {
    backgroundColor: '#6366f1',
  },
  headerTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTabTextActive: {
    color: '#fff',
  },
  chatInfoBanner: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  chatInfoText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  privateChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  privateChatName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  closeChatButton: {
    padding: 5,
  },
  closeChatButtonText: {
    color: '#9ca3af',
    fontSize: 20,
  },
  selectMemberBanner: {
    backgroundColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  selectMemberText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  selectMemberButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  selectMemberButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messagesList: {
    padding: 15,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 5,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#e2e8f0',
  },
  timestamp: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#475569',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: '#9ca3af',
    fontSize: 24,
  },
  membersList: {
    padding: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarAdmin: {
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#fcd34d',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminBadge: {
    fontSize: 11,
    color: '#fcd34d',
    fontWeight: '600',
  },
  premiumBadge: {
    fontSize: 14,
  },
  memberStatus: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noMembersContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noMembersText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
