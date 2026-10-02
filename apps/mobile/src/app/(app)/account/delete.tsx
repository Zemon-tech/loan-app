/**
 * S10 (Delete my account) — structured skeleton (PRD 8.10).
 *
 * TODO (M-09):
 *  - Explain what is removed vs. what the company must retain by law
 *  - Confirm with OTP re-verification or biometric, then DELETE /v1/me
 *  - On success: log out, show "request received" confirmation
 *  - strings to i18n
 */
import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function DeleteAccountScreen() {
  const theme = useAppTheme();
  const { logout } = useSession();

  function onConfirmDelete() {
    // TODO (M-09): require OTP/biometric re-verification, then DELETE /v1/me.
    logout();
    router.replace('/login');
  }

  return (
    <ScreenContainer>
      <Card>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.subtitle,
            fontWeight: theme.typography.weight.semibold as '600',
          }}
        >
          Delete my account
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
          Your app access will be removed. Your loan records are retained as required by law.
        </Text>
      </Card>

      <Button label="Request account deletion" variant="danger" onPress={onConfirmDelete} />
    </ScreenContainer>
  );
}
