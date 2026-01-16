import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import GalleryService from '../services/GalleryService';

const { width } = Dimensions.get('window');

export default function GalleryScreen({ route, navigation }) {
  const { character } = route.params;
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadGallery();
    navigation.setOptions({ title: `Galerie - ${character.name}` });
  }, [character]);

  const loadGallery = async () => {
    const images = await GalleryService.getGallery(character.id);
    setGallery(images);
  };

  const handleDeleteImage = async (imageUrl) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await GalleryService.deleteImage(character.id, imageUrl);
            await loadGallery();
            setModalVisible(false);
            Alert.alert('Succès', 'Image supprimée');
          },
        },
      ]
    );
  };

  const handleSetAsBackground = async () => {
    if (selectedImage) {
      await GalleryService.setConversationBackground(character.id, selectedImage);
      Alert.alert('Succès', 'Image définie comme fond de conversation');
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🖼️ Galerie</Text>
        <Text style={styles.subtitle}>{gallery.length} image(s)</Text>
      </View>

      {gallery.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyTitle}>Aucune image</Text>
          <Text style={styles.emptyText}>
            Générez des images dans les conversations pour les voir ici
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.galleryGrid}>
          {gallery.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageCard}
              onPress={() => {
                setSelectedImage(imageUrl);
                setModalVisible(true);
              }}
            >
              <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {selectedImage && (
                <>
                  <Image source={{ uri: selectedImage }} style={styles.fullImage} />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleSetAsBackground}
                    >
                      <Text style={styles.actionButtonText}>📱 Fond de conv</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteImage(selectedImage)}
                    >
                      <Text style={styles.actionButtonText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  galleryGrid: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageCard: {
    width: (width - 30) / 2,
    height: (width - 30) / 2,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    alignItems: 'center',
  },
  fullImage: {
    width: width - 40,
    height: width - 40,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
