import AsyncStorage from '@react-native-async-storage/async-storage';

class UserProfileService {
  async createProfile(profile) {
    try {
      const userProfile = {
        username: profile.username,
        gender: profile.gender, // 'male', 'female', 'other'
        age: profile.age,
        isAdult: profile.age >= 18,
        // Attributs physiques
        ...(profile.gender === 'female' && { bust: profile.bust }),
        ...(profile.gender === 'male' && { penis: profile.penis }),
        // Préférences
        nsfwMode: profile.age >= 18 ? (profile.nsfwMode || false) : false,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));
      return userProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const data = await AsyncStorage.getItem('user_profile');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  async updateProfile(updates) {
    try {
      const currentProfile = await this.getProfile();
      if (!currentProfile) {
        throw new Error('No profile found');
      }

      // Si l'âge change, réajuster isAdult et nsfwMode
      if (updates.age) {
        updates.isAdult = updates.age >= 18;
        if (updates.age < 18) {
          updates.nsfwMode = false;
        }
      }

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async deleteProfile() {
    try {
      await AsyncStorage.removeItem('user_profile');
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  async toggleNSFW() {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        throw new Error('No profile found');
      }

      if (!profile.isAdult) {
        throw new Error('Must be 18+ to enable NSFW mode');
      }

      return await this.updateProfile({ nsfwMode: !profile.nsfwMode });
    } catch (error) {
      console.error('Error toggling NSFW:', error);
      throw error;
    }
  }
}

export default new UserProfileService();
