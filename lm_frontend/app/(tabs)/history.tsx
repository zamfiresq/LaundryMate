import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }] }>
      <Text style={[styles.title, { color: currentTheme.text }]}>{t('history.title')}</Text>
      <Text style={[styles.text, { color: currentTheme.textSecondary }]}>{t('history.description')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
  },
});

// to do