/**
 * ProgressBar — thin determinate bar (e.g. "18 of 36 EMIs completed").
 */
import { View } from 'react-native';

import type { AppColorRole } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export interface ProgressBarProps {
  /** 0..1 */
  ratio: number;
  color?: AppColorRole;
  accessibilityLabel?: string;
}

export function ProgressBar({ ratio, color = 'primary', accessibilityLabel }: ProgressBarProps) {
  const theme = useAppTheme();
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{
        height: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primarySoft,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.colors[color] }} />
    </View>
  );
}
