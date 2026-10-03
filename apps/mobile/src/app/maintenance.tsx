/**
 * S1b: Maintenance — blocking screen (PRD 8.1).
 * Calm tone. "Try again" re-runs the boot check.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button, Card, Icon, IconTile, Pill, ScreenContainer } from '@/components/ui';
import { Links } from '@/constants/links';
import { fetchBootConfig, type BootConfig } from '@/features/boot/bootConfig';
import { useAppTheme } from '@/hooks/use-theme';

export default function MaintenanceScreen() {
  const theme = useAppTheme();
  const [config, setConfig] = useState<BootConfig | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchBootConfig().then(setConfig);
  }, []);

  function onTryAgain() {
    // Splash re-checks the config and routes onward (or back here if still down).
    setRetrying(true);
  }

  if (retrying) return <Redirect href="/" />;

  return (
    <ScreenContainer tone="canvas">
      <View style={{ alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
        <Pill dot="textSecondary" label="System upgrade in progress" color="textSecondary" uppercase />
        <IconTile name="cloud-done-outline" size={96} badge="build" />
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title + 2, fontWeight: theme.typography.weight.bold }}
          >
            We&apos;ll be back soon
          </Text>
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
            We&apos;re doing some scheduled maintenance on our servers to keep your loan records up to date.
          </Text>
        </View>
      </View>

      {config ? (
        <Card tone="card" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <IconTile name="time-outline" size={44} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontWeight: theme.typography.weight.semibold,
                letterSpacing: 0.6,
              }}
            >
              ESTIMATED WINDOW
            </Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.semibold }}>
              {config.maintenance.expectedBackText}
            </Text>
          </View>
        </Card>
      ) : null}

      <Card tone="card" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <IconTile name="shield-checkmark-outline" size={44} background="successSoft" color="success" />
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 22 }}>
          Your loan data, EMI schedules and records are safe and encrypted.
        </Text>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Try again" leftIcon="refresh" onPress={onTryAgain} />
        <Button
          label="Contact customer support"
          variant="ghost"
          leftIcon="headset-outline"
          onPress={() => Linking.openURL(Links.supportPhone)}
        />
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'center', gap: theme.spacing.sm }}>
        <Icon name="lock-closed-outline" size={14} color="textSecondary" />
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>256-bit encrypted</Text>
      </View>
    </ScreenContainer>
  );
}
