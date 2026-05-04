import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  logoUrl?: string | null;
  size?: number;
  /** Ignoriert — bleibt nur für Backward-Compat. Wappen werden ohne Tile gerendert. */
  radius?: number;
  style?: ViewStyle;
};

/**
 * Team-Wappen: Renderert das api-football logo (FIFA-Verbandswappen) "frei
 * schwebend" — kein sichtbarer Hintergrund, kein Border. Das ergibt eine
 * sauberere Optik, da die Wappen selbst schon visuelle Form mitbringen.
 *
 * Logos füllen ~95% der Tile-Größe und sind content-fit "contain", damit
 * runde und eckige Wappen beide ordentlich wirken.
 */
export function TeamFlag({ logoUrl, size = 56, style }: Props) {
  const inner = Math.round(size * 0.95);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
        },
        style,
      ]}>
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: inner, height: inner }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
