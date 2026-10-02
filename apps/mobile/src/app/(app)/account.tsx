/**
 * S9: My Account (tab) — profile + entry rows into sub-screens (PRD 8.9).
 *
 * TODO (M-09):
 *  - GET /v1/me for name/mobile/city; avatar initials/photo
 *  - About the lender + RBI reg no. from /config
 *  - format strings via i18n
 */
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, ListRow, ScreenContainer } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

export default function AccountScreen() {
  const theme = useAppTheme();
  const { mobile } = useSession();

  return (
    <ScreenContainer>
      {/* Profile header (placeholder) */}
      <Card>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold as '700',
          }}
        >
          Demo Customer
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
          {mobile ?? '+91 XXXXX XXXXX'}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          Demo City
        </Text>
      </Card>

      {/* About the lender (placeholder, from /config in the real app) */}
      <Card style={{ padding: 0 }}>
        <ListRow label="Lender" value="NBFC Legal Name" />
        <ListRow label="RBI registration no." value="N-00.00000" />
      </Card>

      {/* Navigation rows into sub-screens */}
      <Card style={{ padding: 0 }}>
        <ListRow label="Settings" onPress={() => router.push('/account/settings')} />
        <ListRow label="Help & Support" onPress={() => router.push('/account/help')} />
        <ListRow label="Privacy Policy & Terms" onPress={() => router.push('/account/legal')} />
        <ListRow
          label="Delete my account"
          danger
          onPress={() => router.push('/account/delete')}
        />
      </Card>

      <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          App version 1.0.0 (prototype)
        </Text>
      </View>
    </ScreenContainer>
  );
}
