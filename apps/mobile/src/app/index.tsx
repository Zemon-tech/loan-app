import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';

export default function Index() {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
