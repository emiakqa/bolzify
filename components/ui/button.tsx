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

import { Colors, FontSize, FontWeight, Fonts, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
 * Modern Button — pill-rounded, klare Variants.
 * - primary: gefüllt mit Akzent-Farbe (Haupt-CTA)
 * - secondary: Surface mit Border (sekundärer Action)
 * - ghost: nur Text + Background-Tint beim Pressed (für inline Actions)
 * - danger: rot gefüllt für destruktive Actions (Account löschen etc.)
 *
 * Sizes:
 * - sm: kompakt für Inline-Buttons in Karten
 * - md: Standard
 * - lg: prominenter Hero-CTA
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
    sm: { paddingV: Spacing.sm, paddingH: Spacing.md, fontSize: FontSize.sm },
    md: { paddingV: Spacing.md, paddingH: Spacing.lg, fontSize: FontSize.md },
    lg: { paddingV: Spacing.md + 2, paddingH: Spacing.xl, fontSize: FontSize.lg },
  };

  const variantMap: Record<
    Variant,
    { bg: string; fg: string; border: string | undefined }
  > = {
    primary: { bg: c.accent, fg: c.accentFg, border: undefined },
    secondary: { bg: c.surface, fg: c.text, border: c.borderStrong },
    ghost: { bg: 'transparent', fg: c.text, border: undefined },
    danger: { bg: c.danger, fg: '#FFFFFF', border: undefined },
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
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
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
              fontWeight: FontWeight.semibold,
              fontFamily: Fonts?.rounded,
              letterSpacing: 0.1,
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
