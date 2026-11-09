/**
 * S10: Settings — PRD 8.10. Preferences, Account.
 *
 * TODO (M-09):
 *  - register / unregister push (Phase 2)
 *  - strings to i18n
 */
import Constants from 'expo-constants';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Icon,
  ScreenContainer,
  ScreenHeader,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
  Toggle,
} from '@/components/ui';
import { LogoutSheet } from '@/features/auth/components/LogoutSheet';
import { LanguageSheet } from '@/features/settings/components/LanguageSheet';
import { LANGUAGE_LABEL, usePreferences } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

// Account screens are hidden in all modes (Profile removed) — retained but unreachable.
const SHOW_ACCOUNT = false;

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { language, notificationsEnabled, setNotificationsEnabled } = usePreferences();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const [languageOpen, setLanguageOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!SHOW_ACCOUNT) return <Redirect href="/loans" />;

  return (
    <ScreenContainer tone="canvas">
      <ScreenHeader title="Settings" />

      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Preferences</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="notifications-outline"
            title="EMI & Statement Notifications"
            subtitle="Informational reminders for scheduled dues"
            right={
              <Toggle
                accessibilityLabel="EMI and statement notifications"
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            }
          />
          <SettingsRow
            icon="language-outline"
            title="App Language"
            subtitle="Preferred display language"
            value={LANGUAGE_LABEL[language]}
            onPress={() => setLanguageOpen(true)}
          />
        </SettingsGroup>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Account management</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="log-out-outline"
            title="Log out"
            subtitle="End current active session on this phone"
            onPress={() => setLogoutOpen(true)}
          />
          <SettingsRow
            icon="warning-outline"
            title="Delete my account"
            subtitle="Request removal of your app login"
            danger
            onPress={() => router.push('/account/delete')}
          />
        </SettingsGroup>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.primarySoft,
        }}
      >
        <Icon name="shield-checkmark-outline" size={22} color="primary" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
            Privacy & security
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 20 }}>
            This app only shows your loan information. Your settings are kept on this phone.
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          ALANG CREDITS v{version}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
          Read-only client {'\u2022'} No payments in this app
        </Text>
      </View>

      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
      <LogoutSheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </ScreenContainer>
  );
}
