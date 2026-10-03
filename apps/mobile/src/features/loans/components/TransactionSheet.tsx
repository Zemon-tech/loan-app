/**
 * TransactionSheet — compact receipt-style bottom sheet for one transaction.
 * Built on RN Modal (no extra dependency). Informational only: no download, no payment.
 */
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName } from '@/components/ui';
import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { formatDate, formatINR } from '../format';
import type { Transaction, TransactionType } from '../placeholderData';

/** Shared look per transaction type (used by the list rows and the sheet). */
export const TXN_STYLE: Record<
  TransactionType,
  {
    icon: IconName;
    fg: AppColorRole;
    bg: AppColorRole;
    /** Colour of the signed amount. */
    amount: AppColorRole;
    heading: string;
    verb: string;
    tag?: string;
    caption: string;
  }
> = {
  PAYMENT: { icon: 'arrow-down', fg: 'success', bg: 'successSoft', amount: 'success', heading: 'Payment successful', verb: 'Credited to', tag: 'Received', caption: 'Credited' },
  CHARGE: { icon: 'alert-circle-outline', fg: 'danger', bg: 'dangerSoft', amount: 'danger', heading: 'Charge levied', verb: 'Debited to', tag: 'Levied', caption: 'Applied' },
  DISCOUNT: { icon: 'gift-outline', fg: 'primary', bg: 'primarySoft', amount: 'success', heading: 'Concession applied', verb: 'Credited to', tag: 'Concession', caption: 'Credit' },
  ADJUSTMENT: { icon: 'calculator-outline', fg: 'primary', bg: 'primarySoft', amount: 'textPrimary', heading: 'Ledger adjustment', verb: 'Recorded on', caption: 'Adjusted' },
};

/**
 * Ledger sign from the borrower's credit side:
 * payments and discounts credit the account (+), charges debit it (−), adjustments carry their own sign.
 */
export function signedAmount(t: Transaction): string {
  if (t.type === 'CHARGE') return `\u2212${formatINR(t.amount)}`;
  if (t.type === 'ADJUSTMENT') return t.amount < 0 ? `\u2212${formatINR(-t.amount)}` : `+${formatINR(t.amount)}`;
  return `+${formatINR(t.amount)}`;
}

/** Net credit for a group: credits minus charges. */
export function netCredit(list: Transaction[]): number {
  return list.reduce((sum, t) => sum + (t.type === 'CHARGE' ? -t.amount : t.amount), 0);
}

// Scrim behind the sheet (a dimming overlay, not a theme colour).
const SCRIM = 'rgba(0,0,0,0.45)';

export interface TransactionSheetProps {
  visible: boolean;
  transaction: Transaction | null;
  accountNumber: string;
  onClose: () => void;
}

export function TransactionSheet({ visible, transaction: t, accountNumber, onClose }: TransactionSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const style = t ? TXN_STYLE[t.type] : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close transaction details"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: SCRIM }}
        />

        {t && style ? (
          <View
            style={{
              maxHeight: '88%',
              width: '100%',
              maxWidth: 512,
              alignSelf: 'center',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: theme.colors.card,
              paddingBottom: insets.bottom + theme.spacing.md,
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: theme.spacing.sm }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border }} />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text
                  accessibilityRole="header"
                  style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.body, fontWeight: theme.typography.weight.bold }}
                >
                  Transaction details
                </Text>
                <View style={{ paddingVertical: 2, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
                    {accountNumber}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: theme.touchTarget.min,
                  height: theme.touchTarget.min,
                  borderRadius: theme.touchTarget.min / 2,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="close" size={20} color="textPrimary" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
              {/* Hero */}
              <View
                style={{
                  alignItems: 'center',
                  gap: 4,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.xl,
                  backgroundColor: theme.colors.primarySoft,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors[style.bg], alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Icon name={t.type === 'PAYMENT' ? 'checkmark-circle' : style.icon} size={28} color={style.fg} />
                </View>
                <Text style={{ color: theme.colors[style.fg], fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold, letterSpacing: 0.8 }}>
                  {style.heading.toUpperCase()}
                </Text>
                <Text
                  accessibilityLabel={`${t.label}, ${signedAmount(t)}`}
                  style={{ color: theme.colors[style.amount], fontSize: theme.typography.size.heading + 4, fontWeight: theme.typography.weight.bold }}
                >
                  {formatINR(Math.abs(t.amount))}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
                  {style.verb} loan account {accountNumber}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingVertical: 4, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card }}>
                  <Icon name="lock-closed-outline" size={13} color="textSecondary" />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.semibold }}>
                    Recorded in lender ledger
                  </Text>
                </View>
              </View>

              {/* Details */}
              <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft, paddingHorizontal: theme.spacing.lg }}>
                <Line label="Transaction type" value={t.label} first />
                {t.mode ? <Line label="Payment mode" value={t.modeDetail ?? t.mode} /> : null}
                <Line label="Date & time" value={t.time ? `${formatDate(t.date)}, ${t.time}` : formatDate(t.date)} />
                {t.referenceNo ? <CopyLine label="Reference ID" value={t.referenceNo} /> : null}
                {t.receiptNo ? <Line label="Receipt number" value={t.receiptNo} /> : null}
              </View>

              {/* Split (only when the ledger provides it) */}
              {t.split ? (
                <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, fontWeight: theme.typography.weight.bold, letterSpacing: 0.6 }}>
                      LEDGER SPLIT BREAKDOWN
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1 }}>
                      Total {formatINR(t.amount)}
                    </Text>
                  </View>
                  <SplitRow label="Principal component" value={formatINR(t.split.principal)} dot="primary" />
                  <SplitRow label="Interest component" value={formatINR(t.split.interest)} dot="info" />
                  <SplitRow label="Late fee penalty" value={formatINR(t.split.lateFee)} dot="textSecondary" />
                </View>
              ) : null}

              <Button label="Close" variant="secondary" onPress={onClose} />
              <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.caption - 1, paddingHorizontal: theme.spacing.md }}>
                Official digital record. Payments cannot be initiated or altered in this app.
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function Line({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1 }}>{label}</Text>
      <Text
        selectable
        style={{ flex: 1.4, textAlign: 'right', color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, fontWeight: theme.typography.weight.semibold }}
      >
        {value}
      </Text>
    </View>
  );
}

/** Row with a tap-to-copy value (reference IDs). */
function CopyLine({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}. Tap to copy.`}
      onPress={async () => {
        await Clipboard.setStringAsync(value);
        setCopied(true);
      }}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.lg,
        minHeight: theme.touchTarget.min,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, fontWeight: theme.typography.weight.semibold }}>
          {value}
        </Text>
        <Icon name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? 'success' : 'primary'} />
      </View>
    </Pressable>
  );
}

function SplitRow({ label, value, dot }: { label: string; value: string; dot: AppColorRole }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors[dot] }} />
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption + 1 }}>{label}</Text>
      </View>
      <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.caption + 1, fontWeight: theme.typography.weight.semibold }}>{value}</Text>
    </View>
  );
}
