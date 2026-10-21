/**
 * BottomSheet + ConfirmSheet — sheets with smooth animated scrim fade and spring slide.
 * Uses Reanimated UI-thread animations and haptic acknowledgment.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';

const SCRIM = 'rgba(0,0,0,0.48)';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, hideTitle, children }: BottomSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [modalRendered, setModalRendered] = useState(visible);
  if (visible && !modalRendered) {
    setModalRendered(true);
  }

  const scrimOpacity = useSharedValue(0);
  const translateY = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        scrimOpacity.value = 1;
        translateY.value = 0;
      } else {
        scrimOpacity.value = withTiming(1, { duration: theme.motion.duration.fast });
        translateY.value = withSpring(0, theme.motion.spring.gentle);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      if (reduceMotion) {
        scrimOpacity.value = 0;
        translateY.value = 400;
        requestAnimationFrame(() => setModalRendered(false));
      } else {
        scrimOpacity.value = withTiming(0, { duration: theme.motion.duration.fast });
        translateY.value = withSpring(400, theme.motion.spring.snappy, (finished) => {
          if (finished) {
            runOnJS(setModalRendered)(false);
          }
        });
      }
    }
  }, [visible, reduceMotion, theme, scrimOpacity, translateY]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!modalRendered) return null;

  return (
    <Modal
      visible={modalRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close ${title}`}
            onPress={onClose}
            style={styles.scrimPressable}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.card,
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.lg,
              gap: theme.spacing.md,
            },
            sheetStyle,
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: theme.colors.border }]} />
          </View>
          {hideTitle ? null : (
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.subtitle,
                fontWeight: theme.typography.weight.bold,
              }}
            >
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
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
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.body,
            lineHeight: 24,
            textAlign: 'center',
          }}
        >
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
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      haptic
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? theme.colors.primary : 'transparent',
      }}
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimPressable: {
    flex: 1,
    backgroundColor: SCRIM,
  },
  sheet: {
    width: '100%',
    maxWidth: 512,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
});
