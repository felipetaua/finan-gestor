import React from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigation from './src/navigation/AppNavigation';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { CurrencyProvider } from './src/context/CurrencyContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    'MadimiOne-Regular': require('./assets/fonts/MadimiOne-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CurrencyProvider>
          <OnboardingProvider>
            <AppNavigation />
          </OnboardingProvider>
        </CurrencyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

