import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Pill, ScreenContainer } from '@/components/ui';
import { fetchBootConfig } from '@/features/boot/bootConfig';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

/** Minimum time the splash stays visible so it never flashes. */
const MIN_SPLASH_MS = 1200;

/**
 * S1: Splash / Boot. Minimal, calm, secure-feeling.
 * Checks the boot config, then routes to one of:
 *   Maintenance | Update required | Unlock | My Loans | Login.
 *
 * TODO (S1 boot flow): swap the mock config for GET /v1/config and attempt
 * refresh-token rehydration before deciding between Unlock / Login.
 */
export default function SplashScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, isAppLockEnabled, isLocked } = useSession();
  const [destination, setDestination] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [config] = await Promise.all([
        fetchBootConfig(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (cancelled) return;

      if (config.status === 'maintenance') return setDestination('/maintenance');
      if (config.status === 'update_required') return setDestination('/update-required');
      if (!isLoggedIn) return setDestination('/login');
      if (isAppLockEnabled && isLocked) return setDestination('/unlock');
      return setDestination('/loans');
    }

    boot();
    return () => {
      cancelled = true;
    };
    // Boot decision is made once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // <Redirect> (not router.replace in an effect) avoids an unhandled GO_BACK on the first screen.
  if (destination) return <Redirect href={destination} />;

  return (
    <ScreenContainer tone="canvas" scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <View
        style={{ alignItems: 'center', gap: theme.spacing.lg }}
        accessible
        accessibilityLabel="Loan Tracker. Securing your session."
        accessibilityLiveRegion="polite"
      >
        <BrandMark size={96} verified />
        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontWeight: theme.typography.weight.bold,
            }}
          >
            Loan Tracker
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
            Your Calm Financial Ledger
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            Securing your session
          </Text>
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + theme.spacing.xl, alignSelf: 'center' }}>
        <Pill icon="lock-closed-outline" label="Protected by 256-bit bank-grade encryption" background="card" />
      </View>
    </ScreenContainer>
  );
}
