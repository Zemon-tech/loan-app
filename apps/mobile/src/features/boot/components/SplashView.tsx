import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Pill, ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-theme';

/** The in-app boot/splash UI. Shared by the real boot route and the /splash-preview route. */
export function SplashView() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer tone="canvas" scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <View
        style={{ alignItems: 'center', gap: theme.spacing.lg }}
        accessible
        accessibilityLabel="ALANG CREDITS. Securing your session."
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
            ALANG CREDITS AND HOLDINGS PVT LTD
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
