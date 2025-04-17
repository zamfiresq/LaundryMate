import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, useColorScheme, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, deleteDoc, DocumentData, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';


// profile page
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [editedData, setEditedData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const languages = [
    { id: 'en', name: 'English' },
    { id: 'ro', name: 'Română' },
  ];


  // user data + theme mode buntton
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setEditedData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || ''
        });
      }
    };

    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme) {
          setThemeMode(savedTheme as 'light' | 'dark');
        } else {
          setThemeMode(systemColorScheme || 'light');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        setThemeMode(systemColorScheme || 'light');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    loadThemePreference();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    
    try {
      await AsyncStorage.setItem('themeMode', newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };


  // change language (ro / en)
  const handleLanguageSelect = async (languageId: string) => {
    setSelectedLanguage(languageId);
    setIsLanguageModalVisible(false);
    
    try {
      await i18n.changeLanguage(languageId);
      Alert.alert(t('common.success'), t('profile.languageUpdated'));
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  // sign out button + confirmation
  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert(t('common.error'), t('errors.auth'));
            }
          }
        },
      ]
    );
  };

  // delete account button + confirmation
  const showDeleteConfirmation = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: confirmDeleteAccount }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    Alert.prompt(
      t('profile.enterPassword'),
      t('profile.enterPassword'),
      async (password) => {
        if (!password) return Alert.alert(t('common.error'), t('errors.general'));
        try {
          if (!user.email) throw new Error('User email is null.');
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);

          await deleteDoc(doc(db, 'users', user.uid));
          await deleteUser(user);
          Alert.alert(t('common.success'), t('profile.deleteAccount'));
          router.replace('/auth/login');
        } catch (error: any) {
          Alert.alert(t('common.error'), error.message);
        }
      },
      'secure-text'
    );
  };

  // profile settings
  // edit profile button
  const handleEditProfile = () => {
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: editedData.firstName,
        lastName: editedData.lastName,
        email: editedData.email
      });

      setUserData({
        ...userData,
        ...editedData
      });

      setIsEditModalVisible(false);
      Alert.alert(t('common.success'), t('profile.profileUpdated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons 
            name={themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} 
            size={24} 
            color="#5bafb5" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={60} color="#5bafb5" />
            </View>
          </View>
          
          {userData ? (
            <>
              <Text style={styles.nameText}>{userData.firstName} {userData.lastName}</Text>
              <Text style={styles.emailText}>{userData.email}</Text>
            </>
          ) : (
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.editProfile')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
            <Ionicons name="person-outline" size={22} color="#5bafb5" />
            <Text style={styles.settingText}>{t('profile.editProfile')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#aebbbd" />
          </TouchableOpacity>
          
          {/* change password */}
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="key-outline" size={22} color="#5bafb5" />
            <Text style={styles.settingText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#aebbbd" />
          </TouchableOpacity>
          
          {/* notifications */}
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={22} color="#5bafb5" />
            <Text style={styles.settingText}>{t('profile.notifications')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#aebbbd" />
          </TouchableOpacity>
        </View>

        {/* settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
          
          {/* change language */}
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setIsLanguageModalVisible(true)}
          >
            <Ionicons name="language-outline" size={22} color="#5bafb5" />
            <Text style={styles.settingText}>{t('profile.language')}</Text>
            <View style={styles.languageSelector}>
              <Text style={styles.selectedLanguage}>
                {languages.find(lang => lang.id === selectedLanguage)?.name}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#aebbbd" />
            </View>
          </TouchableOpacity>
          
          {/* about section */}
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="information-circle-outline" size={22} color="#5bafb5" />
            <Text style={styles.settingText}>{t('profile.about')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#aebbbd" />
          </TouchableOpacity>
        </View>


        {/* sign out and delete account */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Log Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={showDeleteConfirmation}>
            <Ionicons name="trash-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >


            {/* edit user data section view*/}
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#5bafb5" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('profile.firstName')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editedData.firstName}
                    onChangeText={(text) => setEditedData({...editedData, firstName: text})}
                    placeholder={t('profile.firstName')}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('profile.lastName')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editedData.lastName}
                    onChangeText={(text) => setEditedData({...editedData, lastName: text})}
                    placeholder={t('profile.lastName')}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editedData.email}
                    onChangeText={(text) => setEditedData({...editedData, email: text})}
                    placeholder={t('auth.email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>



      {/* language selection modal */}
      <Modal
        visible={isLanguageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.language')}</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5bafb5" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.id}
                  style={[
                    styles.languageOption,
                    selectedLanguage === language.id && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageSelect(language.id)}
                >
                  <Text style={[
                    styles.languageOptionText,
                    selectedLanguage === language.id && styles.selectedLanguageOptionText
                  ]}>
                    {language.name}
                  </Text>
                  {selectedLanguage === language.id && (
                    <Ionicons name="checkmark" size={24} color="#5bafb5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}









// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2D3748',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EBF8FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#5bafb5',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#718096',
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    fontStyle: 'italic',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#4A5568',
    marginLeft: 12,
  },
  buttonContainer: {
    marginBottom: 40,
    paddingBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#e63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  saveButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLanguage: {
    fontSize: 14,
    color: '#718096',
    marginRight: 8,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectedLanguageOption: {
    backgroundColor: '#EBF8FA',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#4A5568',
  },
  selectedLanguageOptionText: {
    color: '#5bafb5',
    fontWeight: '600',
  },
});
