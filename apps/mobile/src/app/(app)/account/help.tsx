/**
 * S11: Help & Support — PRD 8.11.
 * Hero, contact channels, FAQ accordion and the Grievance Redressal Officer (regulatory requirement).
 * The "how do I pay?" answer is STATIC TEXT ONLY: no payment links, QR codes, UPI IDs or bank details.
 *
 * TODO (M-09): contacts, hours and officer from GET /v1/config.support; FAQ text from the client; i18n
 */
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Card, Icon, IconTile, ScreenContainer, ScreenHeader, type IconName } from '@/components/ui';
import { Links } from '@/constants/links';
import { PLACEHOLDER_GRIEVANCE_OFFICER as OFFICER, PLACEHOLDER_SUPPORT as SUPPORT } from '@/features/profile/placeholderData';
import { useAppTheme } from '@/hooks/use-theme';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Why is my outstanding balance different from what I paid?',
    a: 'Outstanding is your total due minus your total paid. Total due includes your loan payable amount plus any late fee, overdue interest and recovery charges, less any discount. Open your loan, then Overview, to see every line.',
  },
  {
    q: 'How is late fee calculated?',
    a: 'Your lender applies a late fee as per your loan agreement when an EMI is missed. The amount charged so far appears as "Accrued late fee" in your amount breakdown. For the rate in your agreement, please contact your branch.',
  },
  {
    q: 'How do I pay my EMI?',
    a: "Payments are not made in this app. Please visit your lender's branch or contact your collection agent. You can see what is due under Schedule.",
  },
  {
    q: 'Why is my recent payment not showing in History?',
    a: 'A payment appears here after your lender records it, which can take a little time. Check History for the receipt. If it is still missing after a few working days, contact support with your receipt number.',
  },
];

export default function HelpScreen() {
  const theme = useAppTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const caption = { color: theme.colors.textSecondary, fontSize: theme.typography.size.caption } as const;
  const heading = { color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold } as const;

  return (
    <ScreenContainer tone="canvas">
      <ScreenHeader title="Help & Support" />

      {/* Hero */}
      <View style={{ gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 4, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card }}>
          <Icon name="headset-outline" size={14} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            Borrower care
          </Text>
        </View>
        <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
          Need help with your loans?
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1, lineHeight: 20 }}>
          Our borrower assistance desk can explain your balances, clarify entries and resolve your questions.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
          <Icon name="time-outline" size={16} color="success" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
            {SUPPORT.workingHours}
          </Text>
        </View>
      </View>

      {/* Contact channels */}
      <View style={{ gap: theme.spacing.sm }}>
        <Text accessibilityRole="header" style={heading}>
          Contact channels
        </Text>
        <ContactCard icon="call-outline" label="Call us" value={SUPPORT.phoneDisplay} hint="Toll-free customer line" onPress={() => Linking.openURL(Links.supportPhone)} />
        <ContactCard icon="logo-whatsapp" label="WhatsApp" value={SUPPORT.whatsappDisplay} hint="Chat with support" onPress={() => Linking.openURL(Links.supportWhatsApp)} />
        <ContactCard icon="mail-outline" label="Email desk" value={SUPPORT.email} hint="We reply as soon as we can" onPress={() => Linking.openURL(Links.supportEmail)} />
      </View>

      {/* FAQ */}
      <View style={{ gap: theme.spacing.sm }}>
        <View>
          <Text accessibilityRole="header" style={heading}>
            Frequently asked questions
          </Text>
          <Text style={caption}>Answers to common questions about your account</Text>
        </View>
        <View style={{ gap: 4 }}>
          {FAQ.map((item, i) => {
            const open = openIndex === i;
            return (
              <Card key={item.q} tone="card" style={{ borderRadius: theme.radius.lg, padding: 0, gap: 0, overflow: 'hidden' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenIndex(open ? null : i)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    minHeight: 56,
                    padding: theme.spacing.lg,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
                    {item.q}
                  </Text>
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color="textSecondary" />
                </Pressable>
                {open ? (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1, lineHeight: 22, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
                    {item.a}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </View>
      </View>

      {/* Grievance Redressal Officer */}
      <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="ribbon-outline" size={16} color="primary" />
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.bold, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Statutory disclosure
            </Text>
          </View>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}>
            Grievance Redressal Officer
          </Text>
          <Text style={caption}>Contact for complaints you could not resolve with support.</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.card }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="person-outline" size={24} color="primary" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
              {OFFICER.name}
            </Text>
            <Text style={caption}>{OFFICER.designation}</Text>
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <OfficerRow icon="call-outline" label="Telephone" value={OFFICER.phone} onPress={() => Linking.openURL(OFFICER.phoneHref)} />
          <OfficerRow icon="mail-outline" label="Email" value={OFFICER.email} onPress={() => Linking.openURL(`mailto:${OFFICER.email}`)} />
          <OfficerRow icon="business-outline" label="Branch" value={OFFICER.branch} stacked />
          <OfficerRow icon="location-outline" label="Office address" value={OFFICER.address} stacked />
          <OfficerRow icon="time-outline" label="Working hours" value={OFFICER.workingHours} stacked />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.card }}>
          <Icon name="document-text-outline" size={20} color="primary" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.semibold }}>
              Service level
            </Text>
            <Text style={caption}>{OFFICER.sla}</Text>
          </View>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 4, paddingVertical: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="lock-closed-outline" size={14} color="success" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.medium }}>
            Read-only information
          </Text>
        </View>
        <Text style={[caption, { textAlign: 'center' }]}>
          Loan Tracker does not process payments. No financial transactions are started from this app.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function ContactCard({ icon, label, value, hint, onPress }: { icon: IconName; label: string; value: string; hint: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card tone="card" style={{ borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTile name={icon} size={40} />
          <Icon name="arrow-up-outline" size={18} color="textSecondary" />
        </View>
        <View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
            {label}
          </Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}>
            {value}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{hint}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function OfficerRow({
  icon,
  label,
  value,
  onPress,
  stacked,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
  /** Label above the value (long values) instead of beside it. */
  stacked?: boolean;
}) {
  const theme = useAppTheme();
  const labelEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1 }}>{label}</Text>
    </View>
  );
  const box = {
    padding: theme.spacing.md,
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  } as const;

  const content = stacked ? (
    <View style={[box, { gap: 4 }]}>
      {labelEl}
      <Text selectable style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, paddingLeft: 26, lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  ) : (
    <View style={[box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }]}>
      {labelEl}
      <Text style={{ flexShrink: 1, color: onPress ? theme.colors.primary : theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.semibold }}>
        {value}
      </Text>
    </View>
  );

  return onPress ? (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  ) : (
    content
  );
}
