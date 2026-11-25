/**
 * S1a: Update required — blocking screen (PRD 8.1).
 * No tabs, no back navigation. The only way forward is the store.
 */
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Text, View } from 'react-native';

import { Button, Card, Icon, IconTile, Pill, ScreenContainer } from '@/components/ui';
import { Links } from '@/constants/links';
import { fetchBootConfig, type BootConfig } from '@/features/boot/bootConfig';
import { useAppTheme } from '@/hooks/use-theme';

export default function UpdateRequiredScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [config, setConfig] = useState<BootConfig | null>(null);
  const installed = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    fetchBootConfig().then(setConfig);
  }, []);

  const update = config?.update;
  const store = Platform.OS === 'ios' ? Links.storeIos : Links.storeAndroid;

  return (
    <ScreenContainer tone="canvas">
      <View style={{ alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
        <Pill icon="shield-checkmark-outline" label={t('update.pill')} color="primary" uppercase />
        <IconTile name="sync-circle-outline" size={88} badge="lock-closed" badgeBackground="primary" badgeColor="onPrimary" />
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.title + 2, fontWeight: theme.typography.weight.bold }}
          >
            {t('update.title')}
          </Text>
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.typography.size.body, lineHeight: 24 }}>
            {update
              ? t('update.bodyWith', { version: update.latestVersion })
              : t('update.bodyNo')}
          </Text>
        </View>
      </View>

      {update ? (
        <Card tone="card" style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.size.subtitle, fontWeight: theme.typography.weight.semibold }}>
              {t('update.whatsNew')}
            </Text>
            <Pill label={t('update.release', { version: update.latestVersion })} color="success" background="successSoft" />
          </View>
          {update.notes.map((note) => (
            <View key={note} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: theme.colors.successSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="checkmark" size={14} color="success" />
              </View>
              <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.size.body }}>{note}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="wifi" size={18} color="textSecondary" />
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>{t('update.wifi')}</Text>
        </View>
        {update ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
            {t('update.size', { size: update.sizeText })}
          </Text>
        ) : null}
      </View>

      <Button label={t('update.button')} leftIcon="download-outline" onPress={() => Linking.openURL(store)} />

      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.caption }}>
          {t('update.installed', { version: installed })}
          {update ? t('update.latest', { version: update.latestVersion }) : ''}
        </Text>
      </View>
    </ScreenContainer>
  );
}
