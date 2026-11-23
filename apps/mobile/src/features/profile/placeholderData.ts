/**
 * PLACEHOLDER lender, support and legal data for the prototype.
 * TODO (M-09): source from GET /v1/config (lender, support, grievance officer, legal) and GET /v1/me.
 */
export const PLACEHOLDER_LENDER = {
  legalName: 'Alang Credits Capital Limited',
  category: 'Non-Banking Financial Company (NBFC)',
  rbiRegistrationNo: 'B-05.02384',
  registeredAddress: 'Alang Credits, India',
};

export const PLACEHOLDER_SUPPORT = {
  phoneDisplay: '1800-209-8800',
  whatsappDisplay: '+91 70422 38874',
  email: 'support@alangcredits.com',
  workingHours: 'Mon \u2013 Sat: 9:00 AM \u2013 7:00 PM IST',
};

/** Grievance Redressal Officer (regulatory requirement). */
export const PLACEHOLDER_GRIEVANCE_OFFICER = {
  name: 'Grievance Redressal Officer',
  designation: 'Nodal Officer',
  phone: '+91 11 4100 2200',
  phoneHref: 'tel:+911141002200',
  email: 'grievance@alangcredits.com',
  branch: 'Alang Credits Head Office',
  address: 'Alang Credits Capital Limited, India',
  workingHours: 'Mon\u2013Fri, 10:00 AM \u2013 5:00 PM',
  sla: 'Acknowledged within 24 hours, resolved within 14 working days',
};

export interface LegalDocument {
  id: string;
  title: string;
  description: string;
  /** e.g. "Updated 12 January 2026 \u2022 v3.2" */
  meta: string;
  footnote: string;
  icon: 'shield-outline' | 'document-text-outline' | 'scale-outline' | 'receipt-outline';
  url: string;
}

/** Documents the lender publishes. URLs come from /config in the real app. */
export const PLACEHOLDER_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'How borrower data is encrypted, stored and handled by the lender.',
    meta: 'Updated 12 January 2026 \u2022 v3.2',
    footnote: 'Opens in the in-app browser',
    icon: 'shield-outline',
    url: 'privacy',
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    description: 'Terms governing use of the ALANG CREDITS informational application.',
    meta: 'Updated 15 August 2025 \u2022 v2.0',
    footnote: 'Opens in the in-app browser',
    icon: 'document-text-outline',
    url: 'terms',
  },
  {
    id: 'fpc',
    title: 'Fair Practices Code',
    description: "The lender's commitment to transparent recovery, fair interest rates and ethical customer interaction.",
    meta: 'Updated 02 November 2025 \u2022 v4.1',
    footnote: 'Grievance levels 1 & 2',
    icon: 'scale-outline',
    url: 'fairPractices',
  },
  {
    id: 'kfs',
    title: 'Digital Lending & KFS Guidelines',
    description: 'How APR, total payable interest and recovery fees are disclosed.',
    meta: 'Updated 10 October 2025 \u2022 v1.4',
    footnote: 'Clear fee schedule',
    icon: 'receipt-outline',
    url: 'digitalLending',
  },
];
