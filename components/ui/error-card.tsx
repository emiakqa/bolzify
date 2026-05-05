import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, FontSize, Fonts, LineHeight, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { looksLikeOfflineError, useIsOnline } from '@/lib/network';

type Props = {
  /**
   * Optionale konkrete Fehlermeldung (z. B. von Supabase). Wird unter dem
   * generischen Hinweis als Hint angezeigt, falls vorhanden.
   */
  message?: string | null;
  /** Wenn gesetzt, wird ein "Nochmal versuchen"-Button gerendert. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Hauptzeile. Default richtet sich automatisch nach Offline/Online. */
  title?: string;
};

/**
 * Wiederverwendbare Fehler-Card für Screens, die per Supabase-Query Daten
 * laden. Zeigt eine freundliche Botschaft + optional einen Retry-Button.
 *
 * Differenzierung Offline vs. Server-Fehler:
 *   - Offline (laut NetInfo) ODER Fehler-Message riecht nach Netz-Problem:
 *       📡 + "Du bist offline." + Hinweis zum Netz-Check
 *   - Sonst:
 *       ⚠ + "Konnte gerade nicht laden." + Hinweis zum erneuten Probieren
 *
 * Convention im Bolzify-Codebase:
 *   {error ? (
 *     <ErrorCard message={error} onRetry={load} />
 *   ) : loading ? <ActivityIndicator /> : <NormalContent />}
 */
export function ErrorCard({ message, onRetry, retryLabel = 'Nochmal versuchen', title }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const online = useIsOnline();

  const offline = !online || looksLikeOfflineError(message);
  const icon = offline ? '📡' : '⚠';
  const heading = title ?? (offline ? 'Du bist offline.' : 'Konnte gerade nicht laden.');
  const hint = offline
    ? 'Sobald wieder Netz da ist, einfach erneut versuchen.'
    : 'Wir konnten den Server gerade nicht erreichen. Gleich nochmal probieren.';

  return (
    <Card variant="default" padding="lg" style={{ alignItems: 'center', gap: Spacing.md }}>
      <Text style={{ fontSize: 36, lineHeight: 44 }}>{icon}</Text>
      <Text
        style={{
          color: c.text,
          fontFamily: Fonts.display.semibold,
          fontSize: FontSize.lg,
          lineHeight: LineHeight.lg,
          textAlign: 'center',
        }}>
        {heading}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: Fonts.body.regular,
          fontSize: FontSize.sm,
          lineHeight: LineHeight.sm,
          textAlign: 'center',
        }}>
        {hint}
      </Text>
      {!offline && message && message.length < 200 ? (
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
