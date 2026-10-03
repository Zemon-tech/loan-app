/**
 * S10: Settings — PRD 8.10. Security, Preferences, Account.
 * Turning App Lock on or off asks for confirmation and a device authentication check.
 * Auto-lock interval is enforced by the app layout (lock after returning from background).
 *
 * TODO (M-04/M-09):
 *  - persist app lock + auto-lock in SecureStore; register / unregister push (Phase 2)
 *  - strings to i18n
 */
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  BottomSheet,
  ConfirmSheet,
  Icon,
  IconTile,
  OptionRow,
  ScreenContainer,
  ScreenHeader,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
  Toggle,
} from '@/components/ui';
import { LogoutSheet } from '@/features/auth/components/LogoutSheet';
import { useSession } from '@/features/auth/session';
import { LanguageSheet } from '@/features/settings/components/LanguageSheet';
import { AUTO_LOCK_OPTIONS, LANGUAGE_LABEL, usePreferences } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { isAppLockEnabled, setAppLockEnabled } = useSession();
  const { language, notificationsEnabled, setNotificationsEnabled, autoLockSeconds, setAutoLockSeconds } =
    usePreferences();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  // App lock confirmation: `lockOpen` controls the sheet, `lockTarget` keeps its text while it animates out.
  const [lockOpen, setLockOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [autoLockOpen, setAutoLockOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const autoLockSummary =
    AUTO_LOCK_OPTIONS.find((o) => o.seconds === autoLockSeconds)?.summary ?? AUTO_LOCK_OPTIONS[0]!.summary;

  function askLock(next: boolean) {
    setLockTarget(next);
    setLockOpen(true);
  }

  async function confirmLock() {
    setLockBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) {
        Alert.alert(
          'Set up a screen lock first',
          'Add a fingerprint, Face ID or device passcode in your phone settings, then try again.',
        );
        return;
      }
      // Changing this setting requires a successful device check (PRD 8.10).
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: lockTarget ? 'Turn on App Lock' : 'Turn off App Lock',
      });
      if (result.success) setAppLockEnabled(lockTarget);
    } catch {
      Alert.alert('App Lock unavailable', 'We could not reach your device security. Please try again.');
    } finally {
      setLockBusy(false);
      setLockOpen(false);
    }
  }

  return (
    <ScreenContainer tone="canvas">
      <ScreenHeader title="Settings" />

      {/* Status banner: reflects the real App Lock state */}
      <View
        accessible
        accessibilityLabel={isAppLockEnabled ? 'App Lock is on' : 'App Lock is off'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.primarySoft,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile
            name={isAppLockEnabled ? 'shield-checkmark' : 'shield-outline'}
            size={40}
            background="card"
            color={isAppLockEnabled ? 'primary' : 'textSecondary'}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
              {isAppLockEnabled ? 'App Lock is on' : 'App Lock is off'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              {isAppLockEnabled
                ? 'Your loan information is protected on this phone'
                : 'Turn it on to protect your loan information'}
            </Text>
          </View>
        </View>
        <View
          style={{
            paddingVertical: 2,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            backgroundColor: isAppLockEnabled ? theme.colors.successSoft : theme.colors.card,
          }}
        >
          <Text
            style={{
              color: isAppLockEnabled ? theme.colors.success : theme.colors.textSecondary,
              fontSize: theme.typography.size.caption - 1,
              fontWeight: theme.typography.weight.bold,
              letterSpacing: 0.6,
            }}
          >
            {isAppLockEnabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Security</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="finger-print"
            title="App Lock (Biometrics / PIN)"
            subtitle="Require Face ID or fingerprint on app open"
            right={<Toggle accessibilityLabel="App Lock" value={isAppLockEnabled} onValueChange={askLock} />}
          />
          {isAppLockEnabled ? (
            <SettingsRow
              icon="timer-outline"
              title="Auto-Lock Interval"
              subtitle={autoLockSummary}
              onPress={() => setAutoLockOpen(true)}
            />
          ) : null}
        </SettingsGroup>
      </View>

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
            This app only shows your loan information. Your settings are kept on this phone, and your biometric data never leaves your device.
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Loan Tracker v{version}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
          Read-only client {'\u2022'} No payments in this app
        </Text>
      </View>

      <ConfirmSheet
        visible={lockOpen}
        icon="finger-print"
        title={lockTarget ? 'Turn on App Lock?' : 'Turn off App Lock?'}
        message={
          lockTarget
            ? 'You will unlock Loan Tracker with Face ID, fingerprint or your device passcode. We never store your biometric data.'
            : 'Loan Tracker will open without asking for device authentication. Anyone using your phone could see your loan information.'
        }
        confirmLabel={lockTarget ? 'Turn on' : 'Turn off'}
        confirmVariant={lockTarget ? 'primary' : 'danger'}
        loading={lockBusy}
        onConfirm={confirmLock}
        onCancel={() => setLockOpen(false)}
      />

      <BottomSheet visible={autoLockOpen} onClose={() => setAutoLockOpen(false)} title="Auto-Lock Interval">
        <View style={{ gap: theme.spacing.sm }} accessibilityRole="radiogroup">
          {AUTO_LOCK_OPTIONS.map((o) => (
            <OptionRow
              key={o.seconds}
              label={o.label}
              selected={autoLockSeconds === o.seconds}
              onPress={() => {
                setAutoLockSeconds(o.seconds);
                setAutoLockOpen(false);
              }}
            />
          ))}
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, textAlign: 'center' }}>
          How long Loan Tracker can stay in the background before it asks you to unlock again.
        </Text>
      </BottomSheet>

      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
      <LogoutSheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </ScreenContainer>
  );
}
