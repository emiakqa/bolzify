import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, FontSize, Fonts, LineHeight, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  /**
   * Optionale konkrete Fehlermeldung (z. B. von Supabase). Wird unter dem
   * generischen Hinweis als Hint angezeigt, falls vorhanden.
   */
  message?: string | null;
  /** Wenn gesetzt, wird ein "Nochmal versuchen"-Button gerendert. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Hauptzeile (Default: freundlicher Netzwerk-Hinweis). */
  title?: string;
};

const DEFAULT_TITLE = 'Konnte gerade nicht laden.';
const DEFAULT_HINT = 'Bitte Internet checken oder gleich nochmal probieren.';

/**
 * Wiederverwendbare Fehler-Card für Screens, die per Supabase-Query Daten
 * laden. Zeigt eine freundliche Botschaft + optional einen Retry-Button.
 *
 * Convention im Bolzify-Codebase:
 *   {error ? (
 *     <ErrorCard message={error} onRetry={load} />
 *   ) : loading ? <ActivityIndicator /> : <NormalContent />}
 */
export function ErrorCard({
  message,
  onRetry,
  retryLabel = 'Nochmal versuchen',
  title = DEFAULT_TITLE,
}: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <Card variant="default" padding="lg" style={{ alignItems: 'center', gap: Spacing.md }}>
      <Text style={{ fontSize: 36, lineHeight: 44 }}>📡</Text>
      <Text
        style={{
          color: c.text,
          fontFamily: Fonts.display.semibold,
          fontSize: FontSize.lg,
          lineHeight: LineHeight.lg,
          textAlign: 'center',
        }}>
        {title}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: Fonts.body.regular,
          fontSize: FontSize.sm,
          lineHeight: LineHeight.sm,
          textAlign: 'center',
        }}>
        {DEFAULT_HINT}
      </Text>
      {message && message.length < 200 ? (
        <Text
          style={{
            color: c.textFaint,
            fontFamily: Fonts.mono.regular,
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
          }}
          numberOfLines={3}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Button label={retryLabel} variant="secondary" size="sm" onPress={onRetry} />
      ) : null}
    </Card>
  );
}
