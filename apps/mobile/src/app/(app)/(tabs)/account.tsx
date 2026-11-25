/**
 * S9: Profile (tab) — calm identity page, quick links, and log out (PRD 8.9).
 * Not a social profile: no photo upload, no edit, no stats.
 */
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';

import {
  Card,
  Icon,
  PageTitle,
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
import { LanguageSheet } from '@/features/settings/components/LanguageSheet';
import { LANGUAGE_LABEL, usePreferences } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

// Backed by the live /api/v1/me and /api/v1/me/photo endpoints.
const SHOW_PROFILE = true;

export default function ProfileScreen() {
  useSecureScreen();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { language } = usePreferences();
  const { mobile } = useSession();
  const profileQuery = useProfileData();
  const profile = profileQuery.status === 'success' ? profileQuery.data : null;
  const photoQuery = usePhotoData(profile?.hasPhoto ?? false);
  const photoUri = photoQuery.status === 'success' ? photoQuery.data : null;

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  if (!SHOW_PROFILE) return <Redirect href="/loans" />;

  const displayName = profile?.name || t('account.borrower');
  const initials = profile?.initials || (profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'B');
  const rawPhone = profile?.phone || mobile || null;
  const phoneDisplay = rawPhone ? formatMobile(rawPhone) : null;

  return (
    <ScreenContainer tone="canvas" bottomInset={false}>
      <PageTitle title={t('account.title')} />

      {/* Identity */}
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              accessibilityLabel={t('account.photoOf', { name: displayName })}
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
                {t('account.verified')}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Preferences: app language */}
      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>{t('account.preferences')}</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="language-outline"
            title={t('account.language')}
            subtitle={t('account.languageHint')}
            value={LANGUAGE_LABEL[language]}
            onPress={() => setLanguageOpen(true)}
          />
        </SettingsGroup>
      </View>
      {/* Log out */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('account.logout')}
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
            {t('account.logout')}
          </Text>
        </View>
      </PressableScale>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="lock-closed-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            {t('account.encrypted')}
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
          {t('account.appVersion', { version })}
        </Text>
      </View>

      <LogoutSheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </ScreenContainer>
  );
}
