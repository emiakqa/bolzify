import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { Colors, FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Variant = 'primary' | 'secondary' | 'warm' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * Bolzplatz-Button — alle Buttons sind Pills (Radius 999), Familjen Grotesk Bold.
 *
 * Variants:
 * - `primary` — accent bg + accentFg, Shadow.sm. Haupt-CTA.
 * - `secondary` — transparent bg + 1.5px borderStrong + text-Farbe.
 * - `warm` — warm bg + warmFg. NUR für Sondertipp-/Streak-/Postfach-Aktionen.
 * - `ghost` — surfaceSunken bg, kein Border. Inline-Aktionen.
 * - `danger` — danger bg, weißer Text. Destruktiv.
 *
 * Sizes:
 * - `sm` — 36px hoch
 * - `md` — 48px hoch (Default)
 * - `lg` — 56px hoch (Hero-CTA)
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  fullWidth,
  loading,
  disabled,
  style,
  ...rest
}: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const sizeMap = {
    sm: { height: 36, paddingH: Spacing.md, fontSize: FontSize.sm },
    md: { height: 48, paddingH: Spacing.lg, fontSize: FontSize.md },
    lg: { height: 56, paddingH: Spacing.xl, fontSize: FontSize.lg },
  };

  const variantMap: Record<
    Variant,
    { bg: string; fg: string; border: string | undefined; shadow: boolean }
  > = {
    primary: { bg: c.accent, fg: c.accentFg, border: undefined, shadow: true },
    secondary: { bg: 'transparent', fg: c.text, border: c.borderStrong, shadow: false },
    warm: { bg: c.warm, fg: c.warmFg, border: undefined, shadow: true },
    ghost: { bg: c.surfaceSunken, fg: c.text, border: undefined, shadow: false },
    danger: { bg: c.danger, fg: '#FFFFFF', border: undefined, shadow: false },
  };

  const s = sizeMap[size];
  const v = variantMap[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
        v.shadow ? Shadow.sm : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.inner}>
          {leading ? <View>{leading}</View> : null}
          <Text
            style={{
              color: v.fg,
              fontSize: s.fontSize,
              fontFamily: Fonts.display.bold,
              letterSpacing: -0.2,
            }}>
            {label}
          </Text>
          {trailing ? <View>{trailing}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
