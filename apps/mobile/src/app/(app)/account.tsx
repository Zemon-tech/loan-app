/**
 * S9: Profile (tab) — calm identity page, quick links, lender info and log out (PRD 8.9).
 * Not a social profile: no photo upload, no edit, no stats.
 *
 * TODO (M-09):
 *  - GET /v1/me for name / mobile / city; photo if `photoUrl`
 *  - lender details from GET /v1/config; strings to i18n
 */
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BrandMark,
  Card,
  Icon,
  ScreenContainer,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
} from '@/components/ui';
import { Links } from '@/constants/links';
import { maskMobile } from '@/features/auth/format';
import { LogoutSheet } from '@/features/auth/components/LogoutSheet';
import { useSession } from '@/features/auth/session';
import { PLACEHOLDER_CUSTOMER } from '@/features/loans/placeholderData';
import { PLACEHOLDER_LENDER } from '@/features/profile/placeholderData';
import { LanguageSheet } from '@/features/settings/components/LanguageSheet';
import { LANGUAGE_LABEL, usePreferences } from '@/features/settings/preferences';
import { useAppTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { mobile } = useSession();
  const { language } = usePreferences();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScreenContainer tone="canvas" bottomInset={false}>
      {/* App bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <BrandMark size={36} />
        <View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold, letterSpacing: 0.6 }}>
            LOAN TRACKER
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.lg }}>
          <View
            accessibilityElementsHidden
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold }}>
              {PLACEHOLDER_CUSTOMER.initials}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold }}>
              {PLACEHOLDER_CUSTOMER.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body }}>
                {mobile ? maskMobile(mobile) : '+91 98XXXXX002'}
              </Text>
              <Icon name="checkmark-circle" size={16} color="success" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="location-outline" size={14} color="textSecondary" />
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                {PLACEHOLDER_CUSTOMER.city}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primarySoft,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="ribbon-outline" size={18} color="success" />
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
              Verified borrower account
            </Text>
          </View>
          <View style={{ paddingVertical: 2, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card }}>
            <Text style={{ color: theme.colors.success, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
              Active
            </Text>
          </View>
        </View>
      </Card>

      {/* Preferences & assistance */}
      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Preferences & assistance</SectionLabel>
        <SettingsGroup>
          <SettingsRow icon="settings-outline" title="Settings" onPress={() => router.push('/account/settings')} />
          <SettingsRow icon="headset-outline" title="Help & Support" onPress={() => router.push('/account/help')} />
          <SettingsRow
            icon="language-outline"
            title="Language"
            value={LANGUAGE_LABEL[language]}
            onPress={() => setLanguageOpen(true)}
          />
        </SettingsGroup>
      </View>

      {/* Agreements */}
      <View style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Agreements & compliance</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync(Links.privacyPolicy)}
            accessibilityHint="Opens in the in-app browser"
          />
          <SettingsRow
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => WebBrowser.openBrowserAsync(Links.terms)}
            accessibilityHint="Opens in the in-app browser"
          />
          <SettingsRow
            icon="list-circle-outline"
            title="Key Fact Statements (KFS)"
            subtitle="Statutory loan schedule disclosures"
            onPress={() => router.push('/account/legal')}
          />
        </SettingsGroup>
      </View>

      {/* About your lender */}
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xs }}>
          <SectionLabel>About your lender</SectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="business-outline" size={14} color="success" />
            <Text style={{ color: theme.colors.success, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
              RBI regulated
            </Text>
          </View>
        </View>
        <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: 0 }}>
          <Fact label="Lender legal name" value={PLACEHOLDER_LENDER.legalName} first strong />
          <Fact label="Category & classification" value={PLACEHOLDER_LENDER.category} />
          <Fact label="RBI registration number" value={PLACEHOLDER_LENDER.rbiRegistrationNo} strong />
          <Fact label="Registered address" value={PLACEHOLDER_LENDER.registeredAddress} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
            <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
              Loan figures come from your lender&apos;s records
            </Text>
          </View>
        </Card>
      </View>

      {/* Log out */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out of Loan Tracker"
        onPress={() => setLogoutOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          minHeight: 52,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="log-out-outline" size={20} color="danger" />
        <Text style={{ color: theme.colors.danger, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
          Log out of Loan Tracker
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="lock-closed-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            Encrypted session
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
          Loan Tracker App v{version}
        </Text>
      </View>

      <LogoutSheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </ScreenContainer>
  );
}

function Fact({ label, value, first, strong }: { label: string; value: string; first?: boolean; strong?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        gap: 2,
        paddingTop: first ? 0 : theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{label}</Text>
      <Text selectable style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: strong ? theme.typography.weight.semibold : theme.typography.weight.regular }}>
        {value}
      </Text>
    </View>
  );
}
