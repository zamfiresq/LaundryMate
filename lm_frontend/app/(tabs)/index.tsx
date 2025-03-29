import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = auth().currentUser;

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Succes', 'Ai fost deconectat cu succes!');
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Eroare', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LaundryMate</Text>
        <Text style={styles.headerSubtitle}>Testare Autentificare</Text>
      </View>

      <View style={styles.card}>
        {user ? (
          <>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#007AFF" />
              </View>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.emailText}>{user.email}</Text>
              <Text style={styles.uidText}>ID: {user.uid.slice(0, 8)}...</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Activ</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noUserContainer}>
            <Ionicons name="person-outline" size={50} color="#CBD5E0" />
            <Text style={styles.noUserText}>Niciun utilizator conectat</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={[styles.button, styles.registerButton]} 
          onPress={() => router.push('/register')}
        >
          <Ionicons name="person-add" size={24} color="white" />
          <Text style={styles.buttonText}>Înregistrare</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.loginButton]} 
          onPress={() => router.push('/login')}
        >
          <Ionicons name="log-in" size={24} color="white" />
          <Text style={styles.buttonText}>Conectare</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color="white" />
          <Text style={styles.buttonText}>Deconectare</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Status: {user ? 'Autentificat' : 'Neautentificat'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 40,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 5,
  },
  uidText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38B2AC',
    marginRight: 6,
  },
  statusText: {
    color: '#38B2AC',
    fontSize: 14,
    fontWeight: '500',
  },
  noUserContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noUserText: {
    color: '#718096',
    fontSize: 16,
    marginTop: 10,
  },
  buttonGroup: {
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  registerButton: {
    backgroundColor: '#4C51BF',
  },
  loginButton: {
    backgroundColor: '#2B6CB0',
  },
  logoutButton: {
    backgroundColor: '#C53030',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    color: '#718096',
    fontSize: 14,
  },
});