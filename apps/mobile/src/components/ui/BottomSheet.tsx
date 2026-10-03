/**
 * BottomSheet + ConfirmSheet — lightweight sheets on RN Modal (no extra dependency).
 * ConfirmSheet is the standard "are you sure?" pattern: icon, title, message, Cancel / Confirm.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { IconTile } from './IconTile';

// Scrim behind sheets (a dimming overlay, not a theme colour).
const SCRIM = 'rgba(0,0,0,0.45)';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Accessible name for the sheet and the dismiss backdrop. */
  title: string;
  /** Hide the visible title row (content supplies its own). */
  hideTitle?: boolean;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, hideTitle, children }: BottomSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: SCRIM }}
        />
        <View
          style={{
            width: '100%',
            maxWidth: 512,
            alignSelf: 'center',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: theme.colors.card,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: theme.spacing.sm }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border }} />
          </View>
          {hideTitle ? null : (
            <Text
              accessibilityRole="header"
              style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.bold }}
            >
              {title}
            </Text>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: IconName;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  icon,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const theme = useAppTheme();

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title} hideTitle>
      <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.sm }}>
        {icon ? (
          <IconTile
            name={icon}
            size={56}
            background={confirmVariant === 'danger' ? 'dangerSoft' : 'primarySoft'}
            color={confirmVariant === 'danger' ? 'danger' : 'primary'}
          />
        ) : null}
        <Text
          accessibilityRole="header"
          style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title, fontWeight: theme.typography.weight.bold, textAlign: 'center' }}
        >
          {title}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24, textAlign: 'center' }}>
          {message}
        </Text>
      </View>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        <Button label={confirmLabel} variant={confirmVariant} onPress={onConfirm} loading={loading} />
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} />
      </View>
    </BottomSheet>
  );
}

/** A single-choice row for option sheets (language). */
export function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? theme.colors.primary : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.subtitle,
          fontWeight: selected ? theme.typography.weight.semibold : theme.typography.weight.regular,
        }}
      >
        {label}
      </Text>
      {selected ? <Icon name="checkmark-circle" size={24} color="primary" /> : null}
    </Pressable>
  );
}
