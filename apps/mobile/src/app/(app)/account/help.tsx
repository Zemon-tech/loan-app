/**
 * S11: Help & Support — structured skeleton (PRD 8.11).
 *
 * TODO (M-09):
 *  - Contacts from /config.support: Call (tel:), WhatsApp (wa.me), Email (mailto:), hours, branch
 *  - Grievance Redressal Officer: name, phone, email (regulatory requirement)
 *  - FAQ (static, client-supplied). The "how do I pay?" answer is STATIC TEXT ONLY —
 *    no payment links, QR codes, UPI IDs or bank details (tracker only).
 *  - strings to i18n
 */
import { Card, ListRow, ScreenContainer } from '@/components/ui';

export default function HelpScreen() {
  return (
    <ScreenContainer>
      <Card style={{ padding: 0 }}>
        <ListRow label="Call support" value="+91 XXXXX XXXXX" onPress={() => { /* TODO tel: */ }} />
        <ListRow label="WhatsApp" value="Chat" onPress={() => { /* TODO wa.me */ }} />
        <ListRow label="Email" value="support@example.in" onPress={() => { /* TODO mailto: */ }} />
        <ListRow label="Working hours" value="Mon–Sat, 10–6" showChevron={false} />
      </Card>

      {/* Grievance officer (regulatory) */}
      <Card style={{ padding: 0 }}>
        <ListRow label="Grievance officer" value="Name" showChevron={false} />
        <ListRow label="Phone" value="+91 XXXXX XXXXX" showChevron={false} />
        <ListRow label="Email" value="grievance@example.in" showChevron={false} />
      </Card>

      {/* TODO: FAQ list (static, client-supplied) */}
      <Card style={{ padding: 0 }}>
        <ListRow label="Why is my outstanding different from what I paid?" onPress={() => {}} />
        <ListRow label="How is late fee calculated?" onPress={() => {}} />
        <ListRow label="How do I pay my EMI?" onPress={() => {}} />
      </Card>
    </ScreenContainer>
  );
}
