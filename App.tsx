// App.tsx
// Entry point: bootstraps the database, registers background tasks,
// and renders the navigation stack.

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { getDatabase } from './src/db/database';
import { registerBackgroundSync } from './src/core/syncManager';
import { useAppStore } from './src/store/useAppStore';
import { i18n } from './src/i18n';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AssessmentWizardScreen from './src/screens/AssessmentWizardScreen';
import SyncQueueScreen from './src/screens/SyncQueueScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { Colors } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { locale } = useAppStore();

  // Update i18n locale when store hydrates
  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Initialize SQLite and create tables
        await getDatabase();

        // 2. Register the background sync task
        await registerBackgroundSync();

        setIsReady(true);
      } catch (err) {
        console.error('Bootstrap failed:', err);
        // Still show the app even if background sync registration fails
        setIsReady(true);
      }
    }

    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primaryBlue} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.surfaceGray },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AssessmentWizard" component={AssessmentWizardScreen} />
        <Stack.Screen name="SyncQueue" component={SyncQueueScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
  },
});
