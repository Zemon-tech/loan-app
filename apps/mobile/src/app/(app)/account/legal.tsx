/**
 * S12: Legal — structured skeleton (PRD 8.12).
 *
 * TODO (M-09):
 *  - Open Privacy Policy and Terms URLs from /config in an in-app browser (expo-web-browser)
 *  - strings to i18n
 */
import { Card, ListRow, ScreenContainer } from '@/components/ui';

export default function LegalScreen() {
  return (
    <ScreenContainer>
      <Card style={{ padding: 0 }}>
        <ListRow label="Privacy Policy" onPress={() => { /* TODO: WebBrowser.openBrowserAsync */ }} />
        <ListRow label="Terms & Conditions" onPress={() => { /* TODO: WebBrowser.openBrowserAsync */ }} />
      </Card>
    </ScreenContainer>
  );
}
