import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/ui/offline-banner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, isPlaceholderUsername, useAuth } from '@/lib/auth';
import { useAppFonts } from '@/lib/fonts';
import { clearAllReminders, notificationToRoute, syncReminders } from '@/lib/notifications';
import { hasSeenOnboarding, subscribeOnboarding } from '@/lib/onboarding';
import { clearSentryUser, initSentry, sentryWrap, setSentryUser } from '@/lib/sentry';

// Init früh — vor dem ersten Render, damit auch Crashes im Splash erfasst werden.
initSentry();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const { loading, session, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // null = noch nicht geprüft, true/false = Ergebnis. Muss in den Routing-Check
  // einfließen, damit wir nicht vor dem Check schon nach / schicken.
  // Subscribe auf Pub-Sub in lib/onboarding, damit das Flag nach „Los geht's"
  // sofort hier ankommt — sonst Redirect-Loop zwischen / und /onboarding.
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  useEffect(() => {
    console.log('[AuthGate] checking onboarding flag…');
    hasSeenOnboarding()
      .then((v) => {
        console.log('[AuthGate] onboardingSeen =', v);
        setOnboardingSeen(v);
      })
      .catch((e) => {
        console.warn('[AuthGate] hasSeenOnboarding failed', e);
        setOnboardingSeen(true);
      });
    const unsub = subscribeOnboarding(setOnboardingSeen);
    return unsub;
  }, []);

  // Debug: loading / session / onboardingSeen loggen, damit wir sehen wo's hängt.
  useEffect(() => {
    console.log(
      '[AuthGate] state:',
      'loading=', loading,
      'hasSession=', !!session,
      'onboardingSeen=', onboardingSeen,
      'segments=', segments.join('/'),
    );
  }, [loading, session, onboardingSeen, segments]);

  useEffect(() => {
    if (loading || onboardingSeen === null) return;
    const first = segments[0];
    const onLogin = first === 'login';
    const onSetUsername = first === 'set-username';
    const onOnboarding = first === 'onboarding';

    if (!session) {
      if (!onLogin) router.replace('/login');
      return;
    }

    if (isPlaceholderUsername(profile?.username)) {
      if (!onSetUsername) router.replace('/set-username');
      return;
    }

    if (!onboardingSeen) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }

    if (onLogin || onSetUsername || onOnboarding) router.replace('/');
  }, [loading, session, profile, segments, router, onboardingSeen]);

  // Notification-Sync: plant Reminders vor Kickoff für alle untippten Matches.
  // Läuft einmal bei Login und jedes Mal, wenn die App aus dem Hintergrund kommt
  // (falls der User in der Zwischenzeit woanders getippt hat).
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      clearAllReminders().catch(() => {});
      clearSentryUser();
      return;
    }
    setSentryUser(userId);
    syncReminders(userId).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncReminders(userId).catch(() => {});
    });
    return () => sub.remove();
  }, [userId]);

  // Deep-Link bei Tap auf Notification: matchId → /tip/[id], special →
  // /special-tips. Greift NUR wenn der User eingeloggt + onboarded ist —
  // sonst routet AuthGate eh nach /login bzw. /onboarding.
  useEffect(() => {
    if (!session || onboardingSeen !== true) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | null
        | undefined;
      const route = notificationToRoute(data);
      if (route) {
        router.push(route as never);
      }
    });
    // Falls die App durch eine Notification überhaupt erst aufgewacht ist:
    // den initial-Response abholen, sobald wir routing-fähig sind.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | null
          | undefined;
        const route = notificationToRoute(data);
        if (route) router.push(route as never);
      })
      .catch(() => {
        // ignore
      });
    return () => sub.remove();
  }, [session, onboardingSeen, router]);

  if (loading || onboardingSeen === null) {
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
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="tip/[matchId]" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues-new" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues-join" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="leagues/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="special-tips" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="inbox" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="broadcast-new" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="impressum" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useAppFonts();

  // Splash-Screen beibehalten bis Custom-Fonts geladen sind — sonst flackert
  // ein Frame mit System-Font und „springt" dann auf Familjen Grotesk um.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <OfflineBanner />
        <AuthGate />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Sentry.wrap aktiviert Auto-Performance-Tracking für Navigation und sorgt
// dafür, dass Errors aus Suspense / ErrorBoundaries automatisch gemeldet werden.
// Wenn Sentry nicht initialisiert ist (kein DSN), gibt der Wrapper die Komponente
// unverändert zurück — also safe für Dev ohne Sentry-Account.
export default sentryWrap(RootLayout);
