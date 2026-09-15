export type IntakeDetails = {
  provider: 'tilda';
  childAge: string;
  contactMethod: 'phone' | 'telegram' | 'vk' | 'max';
  contactValue: string;
  visitDate: string;
  dataConsent: boolean | null;
  dataConsentRaw: string;
  marketingConsent: boolean | null;
  marketingConsentRaw: string;
  formId: string;
};

export function hasMessengerContact(details: unknown): boolean {
  if (!details || typeof details !== 'object' || Array.isArray(details))
    return false;
  const d = details as Record<string, unknown>;
  return (
    d.provider === 'tilda' &&
    ['telegram', 'vk', 'max'].includes(String(d.contactMethod)) &&
    typeof d.contactValue === 'string' &&
    d.contactValue.trim().length > 0
  );
}
