/**
 * S9: Profile (tab) — calm identity page, quick links, and log out (PRD 8.9).
 * Not a social profile: no photo upload, no edit, no stats.
 */
import Constants from 'expo-constants';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import {
  BrandMark,
  Card,
  Icon,
  PressableScale,
  ScreenContainer,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
} from '@/components/ui';
import { formatMobile } from '@/features/auth/format';
import { LogoutSheet } from '@/features/auth/components/LogoutSheet';
import { useSession } from '@/features/auth/session';
import { usePhotoData, useProfileData } from '@/features/api/dataSource';
import { useSecureScreen } from '@/features/security/useSecureScreen';
import { useAppTheme } from '@/hooks/use-theme';

// Backed by the live /api/v1/me and /api/v1/me/photo endpoints.
const SHOW_PROFILE = true;

export default function ProfileScreen() {
  useSecureScreen();
  const theme = useAppTheme();
  const { mobile } = useSession();
  const profileQuery = useProfileData();
  const profile = profileQuery.status === 'success' ? profileQuery.data : null;
  const photoQuery = usePhotoData(profile?.hasPhoto ?? false);
  const photoUri = photoQuery.status === 'success' ? photoQuery.data : null;

  const [logoutOpen, setLogoutOpen] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  if (!SHOW_PROFILE) return <Redirect href="/loans" />;

  const displayName = profile?.name || 'Borrower';
  const initials = profile?.initials || (profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'B');
  const rawPhone = profile?.phone || mobile || '+917042238874';
  const phoneDisplay = rawPhone ? formatMobile(rawPhone) : null;

  return (
    <ScreenContainer tone="canvas" bottomInset={false}>
      {/* App bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <BrandMark size={36} />
        <View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6 }}>
            ALANG CREDITS
          </Text>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}
          >
            Profile
          </Text>
        </View>
      </View>

      {/* Identity */}
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              accessibilityLabel={`Photo of ${displayName}`}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: theme.colors.primary,
              }}
            />
          ) : (
            <View
              accessibilityElementsHidden
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.primarySoft,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.typography.size.title,
                  fontWeight: theme.typography.weight.bold,
                  textAlign: 'center',
                  textAlignVertical: 'center',
                  includeFontPadding: false,
                  lineHeight: 24,
                }}
              >
                {initials}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold }}>
              {displayName}
            </Text>
            {phoneDisplay ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
                  {phoneDisplay}
                </Text>
                <Icon name="checkmark-circle" size={16} color="success" />
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                gap: 5,
                marginTop: 2,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.secondarySoft,
              }}
            >
              <Icon name="shield-checkmark" size={13} color="secondary" />
              <Text style={{ color: theme.colors.secondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
                Verified Borrower
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Help & Support */}
      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Help & assistance</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="headset-outline"
            title="Help & Support"
            subtitle="Customer care, contact numbers & FAQs"
            onPress={() => router.push('/account/help')}
          />
        </SettingsGroup>
      </View>

      {/* Log out */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Log out of ALANG CREDITS"
        onPress={() => setLogoutOpen(true)}
        haptic
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          minHeight: 52,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
          <Icon name="log-out-outline" size={20} color="danger" />
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.typography.size.body,
              fontWeight: theme.typography.weight.semibold,
              textAlignVertical: 'center',
              includeFontPadding: false,
            }}
          >
            Log out of ALANG CREDITS
          </Text>
        </View>
      </PressableScale>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="lock-closed-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            Encrypted session
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
          ALANG CREDITS App v{version}
        </Text>
      </View>

      <LogoutSheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </ScreenContainer>
  );
}
