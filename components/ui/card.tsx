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

type Variant = 'default' | 'elevated' | 'accent' | 'warm' | 'flat';

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
 * Bolzplatz-Card. Default ist eine surface-Card mit weichem Shadow (statt Border).
 *
 * - `default` — surface bg, Shadow.sm
 * - `elevated` — surface bg, Shadow.lg (Hero-Cards, Modals)
 * - `accent` — accentSoft bg + accent-Border, KEINE Shadow (info-Boxen)
 * - `warm` — warmSoft bg + warm-Border, KEINE Shadow (Sondertipps, Streaks)
 * - `flat` — surface bg + 1px Border, KEINE Shadow (gruppierte Listen)
 *
 * Wenn `onPress`/`onLongPress` gesetzt ist, wird die Card pressable mit
 * subtilem 0.985-scale Tap-Feedback.
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
    backgroundColor:
      variant === 'accent' ? c.accentSoft :
      variant === 'warm' ? c.warmSoft :
      c.surface,
    borderRadius: Radius.xl,
    padding: padding === 0 ? 0 : Spacing[padding],
    borderWidth:
      variant === 'flat' ? 1 :
      variant === 'accent' || variant === 'warm' ? 1 :
      0,
    borderColor:
      variant === 'accent' ? c.accentBorder :
      variant === 'warm' ? c.warmBorder :
      c.border,
    ...(variant === 'elevated' ? Shadow.lg :
        variant === 'default' ? Shadow.sm :
        null),
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
