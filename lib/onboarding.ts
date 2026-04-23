// Bolzify — Onboarding-Status (AsyncStorage-Flag).
//
// Einmaliger 3-Slide-Swiper nach dem ersten Login. Wird lokal pro Device
// gemerkt, damit ein User nicht zehnmal durchklickt, wenn er die App reinstalliert
// (beim Reinstall leert sich AsyncStorage ohnehin — Feature, nicht Bug).

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bolzify.onboarding.seen.v1';

// Kleines Pub-Sub, damit der AuthGate im _layout sofort reagiert, wenn das Flag
// nach „Los geht's" / „Überspringen" umgelegt wird. Ohne das war der React-State
// im Gate stale und hat uns direkt zurück auf /onboarding geredirected → Loop.
type Listener = (seen: boolean) => void;
const listeners = new Set<Listener>();

export function subscribeOnboarding(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(seen: boolean): void {
  listeners.forEach((l) => {
    try {
      l(seen);
    } catch {
      // Listener-Fehler sollen uns nicht die Navigation killen.
    }
  });
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
  emit(true);
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  emit(false);
}
