import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, isPlaceholderUsername, useAuth } from '@/lib/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const { loading, session, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    const onLogin = first === 'login';
    const onSetUsername = first === 'set-username';

    if (!session) {
      if (!onLogin) router.replace('/login');
      return;
    }

    if (isPlaceholderUsername(profile?.username)) {
      if (!onSetUsername) router.replace('/set-username');
      return;
    }

    if (onLogin || onSetUsername) router.replace('/');
  }, [loading, session, profile, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="set-username" options={{ headerShown: false }} />
      <Stack.Screen name="tip/[matchId]" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues-new" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues-join" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
