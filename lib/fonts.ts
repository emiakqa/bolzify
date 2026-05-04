// Bolzplatz-Fonts: Familjen Grotesk (display), Geist (body), JetBrains Mono.
//
// In RN gibt's keinen fontWeight-Lookup mit Custom-Fonts — jedes Weight ist
// eine eigene Font-Family. Der Design-Token `Fonts.display.bold` resolvt
// deshalb auf den exakten String, der hier registriert wird.
//
// Familjen Grotesk hat kein 800 ExtraBold (Google Font endet bei 700) — wir
// nutzen 700 Bold als "Heavy" für Display-Headlines.

import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
  FamiljenGrotesk_700Bold,
} from '@expo-google-fonts/familjen-grotesk';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

export function useAppFonts() {
  return useFonts({
    FamiljenGrotesk_400Regular,
    FamiljenGrotesk_500Medium,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });
}
