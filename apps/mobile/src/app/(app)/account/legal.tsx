/**
 * S12: Legal — PRD 8.12. Lender disclosures, each opened in the in-app browser.
 * The app never reproduces legal text itself: documents come from the lender.
 *
 * TODO (M-09): document list, versions and URLs from GET /v1/config; i18n
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, Text, View } from 'react-native';

import { Card, Icon, IconTile, ScreenContainer, ScreenHeader } from '@/components/ui';
import { Links } from '@/constants/links';
import {
  PLACEHOLDER_GRIEVANCE_OFFICER as OFFICER,
  PLACEHOLDER_LEGAL_DOCUMENTS,
  PLACEHOLDER_LENDER,
  type LegalDocument,
} from '@/features/profile/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

const URL_BY_KEY: Record<string, string> = {
  privacy: Links.privacyPolicy,
  terms: Links.terms,
  fairPractices: Links.fairPractices,
  digitalLending: Links.digitalLending,
};

export default function LegalScreen() {
  const theme = useAppTheme();
  const caption = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption } as const;

  return (
    <ScreenContainer tone="canvas">
      <ScreenHeader title="Legal & Terms" />

      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
        <IconTile name="shield-checkmark" size={40} background="card" color="primary" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.bold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Regulatory transparency
          </Text>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
            Documents published by your lender
          </Text>
          <Text style={[caption, { lineHeight: 20 }]}>
            {PLACEHOLDER_LENDER.legalName} publishes these documents. They explain how your information is handled and your rights as a borrower.
          </Text>
        </View>
      </View>

      {/* Documents */}
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: theme.spacing.xs }}>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
            Legal documents
          </Text>
          <Text style={[caption, { fontWeight: theme.typography.weight.medium }]}>
            {PLACEHOLDER_LEGAL_DOCUMENTS.length} disclosures
          </Text>
        </View>
        {PLACEHOLDER_LEGAL_DOCUMENTS.map((doc) => (
          <DocCard key={doc.id} doc={doc} onOpen={() => WebBrowser.openBrowserAsync(URL_BY_KEY[doc.url] ?? Links.privacyPolicy)} />
        ))}
      </View>

      {/* Nodal support */}
      <View style={{ gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.bold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Nodal support
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success }} />
            <Text style={{ color: theme.colors.success, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
              {OFFICER.workingHours}
            </Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
          Grievance Redressal Officer
        </Text>
        <Text style={[caption, { lineHeight: 20 }]}>
          {OFFICER.name}, {OFFICER.designation}
          {'\n'}
          {OFFICER.address}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md }}>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(`mailto:${OFFICER.email}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: theme.touchTarget.min }}
          >
            <Icon name="mail-outline" size={16} color="primary" />
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
              {OFFICER.email}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(OFFICER.phoneHref)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: theme.touchTarget.min }}
          >
            <Icon name="call-outline" size={16} color="primary" />
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
              {OFFICER.phone}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

function DocCard({ doc, onOpen }: { doc: LegalDocument; onOpen: () => void }) {
  const theme = useAppTheme();
  return (
    <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>{doc.meta}</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
            {doc.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, lineHeight: 18 }}>{doc.description}</Text>
        </View>
        <IconTile name={doc.icon} size={32} background="primarySoft" color="textSecondary" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>{doc.footnote}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${doc.title}`}
          accessibilityHint="Opens in the in-app browser"
          onPress={onOpen}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: theme.touchTarget.min,
            paddingHorizontal: theme.spacing.xs,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
            Open
          </Text>
          <Icon name="arrow-forward" size={16} color="primary" />
        </Pressable>
      </View>
    </Card>
  );
}
