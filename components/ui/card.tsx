import { type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Variant = 'default' | 'elevated' | 'accent' | 'flat';

type Props = {
  children: ReactNode;
  variant?: Variant;
  padding?: keyof typeof Spacing | 0;
  style?: ViewStyle | ViewStyle[];
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
  disabled?: boolean;
};

/**
 * Universelle Card-Komponente. Default sieht modern aus (rund, weicher Border,
 * leicht gehobenes Surface). `accent` für Hero-Karten mit grünem Border-Akzent.
 * `elevated` mit Schatten für Pop-Outs. `flat` ohne Border, nur Surface.
 *
 * Wenn `onPress` gesetzt ist, wird die Card pressable und reagiert mit
 * 0.97-Skalierung über Opacity (subtiles Tap-Feedback).
 */
export function Card({
  children,
  variant = 'default',
  padding = 'lg',
  style,
  onPress,
  onLongPress,
  disabled,
}: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const baseStyle: ViewStyle = {
    backgroundColor: variant === 'accent' ? c.accentSoft : c.surface,
    borderRadius: Radius.lg,
    padding: padding === 0 ? 0 : Spacing[padding],
    borderWidth: variant === 'flat' ? 0 : 1,
    borderColor: variant === 'accent' ? c.accentBorder : c.border,
    ...(variant === 'elevated' ? Shadow.md : null),
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        style={({ pressed }) => [
          baseStyle,
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
          style as ViewStyle,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style as ViewStyle]}>{children}</View>;
}

// Re-export für Layout-Helper innerhalb von Cards
export const CardRow = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[styles.row, style]}>{children}</View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
