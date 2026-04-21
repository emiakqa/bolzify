// Bolzify — Onboarding-Status (AsyncStorage-Flag).
//
// Einmaliger 3-Slide-Swiper nach dem ersten Login. Wird lokal pro Device
// gemerkt, damit ein User nicht zehnmal durchklickt, wenn er die App reinstalliert
// (beim Reinstall leert sich AsyncStorage ohnehin — Feature, nicht Bug).

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bolzify.onboarding.seen.v1';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
